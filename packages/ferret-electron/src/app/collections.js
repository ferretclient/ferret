const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const Yup = require('yup');
const { isDirectory, getCollectionStats, normalizeAndResolvePath } = require('../utils/filesystem');
const { generateUidBasedOnHash } = require('../utils/common');
const { transformFerretConfigAfterRead } = require('../utils/transformFerretConfig');
const { parseCollection } = require('@useferret/filestore');

// Track scratch collection paths (temp directories for workspace scratch requests)
const scratchCollectionPaths = new Set();

// Register a scratch collection path
const registerScratchCollectionPath = (scratchPath) => {
  scratchCollectionPaths.add(path.normalize(scratchPath));
};

// todo: ferret.json config schema validation errors must be propagated to the UI
const configSchema = Yup.object({
  name: Yup.string().max(256, 'name must be 256 characters or less').required('name is required'),
  type: Yup.string().oneOf(['collection']).required('type is required'),
  version: Yup.string().notRequired(),
  // Collection-level presets (defaults shared with the collection)
  presets: Yup.object({
    requestType: Yup.string().notRequired(),
    requestUrl: Yup.string().notRequired(),
    defaultEnvironment: Yup.string().notRequired()
  }).notRequired(),
  // For YAML format collections (opencollection)
  opencollection: Yup.string().notRequired(),
  // OpenAPI sync configuration (array, one entry per synced spec)
  openapi: Yup.array().of(
    Yup.object({
      sourceUrl: Yup.string().notRequired(),
      lastSyncDate: Yup.string().notRequired(),
      specHash: Yup.string().notRequired(),
      groupBy: Yup.string().oneOf(['tags', 'path']).notRequired(),
      autoCheck: Yup.boolean().notRequired(),
      autoCheckInterval: Yup.number().notRequired()
    })
  ).notRequired()
});

const readConfigFile = async (pathname) => {
  try {
    const jsonData = fs.readFileSync(pathname, 'utf8');
    return JSON.parse(jsonData);
  } catch (err) {
    return Promise.reject(new Error(`Unable to parse json in ferret.json in ${pathname}`));
  }
};

const validateSchema = async (config) => {
  try {
    await configSchema.validate(config);
  } catch (err) {
    return Promise.reject(new Error('ferret.json format is invalid in ' + config?.name));
  }
};

const getCollectionConfigFile = async (pathname) => {
  // Check for opencollection.yml first
  const ocYmlPath = path.join(pathname, 'opencollection.yml');
  if (fs.existsSync(ocYmlPath)) {
    try {
      const content = fs.readFileSync(ocYmlPath, 'utf8');
      const {
        ferretConfig
      } = parseCollection(content, { format: 'yml' });
      await validateSchema(ferretConfig);
      return ferretConfig;
    } catch (err) {
      throw new Error(`Unable to parse opencollection.yml: ${err.message}`);
    }
  }

  // Fall back to ferret.json
  const configFilePath = path.join(pathname, 'ferret.json');
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`The collection is not valid (neither ferret.json nor opencollection.yml found)`);
  }

  const config = await readConfigFile(configFilePath);
  await validateSchema(config);

  return config;
};

const openCollection = async (win, watcher, collectionPath, options = {}) => {
  // If watcher already exists, collection is already loaded in the app
  // Just send the collection info so frontend can add to workspace if needed
  if (watcher.hasWatcher(collectionPath)) {
    try {
      let ferretConfig = await getCollectionConfigFile(collectionPath);
      const uid = generateUidBasedOnHash(collectionPath);
      ferretConfig = await transformFerretConfigAfterRead(ferretConfig, collectionPath);
      const { size, filesCount } = await getCollectionStats(collectionPath);
      ferretConfig.size = size;
      ferretConfig.filesCount = filesCount;
      win.webContents.send('main:collection-opened', collectionPath, uid, ferretConfig, { silent: !!options.silent });
      return {
        path: collectionPath,
        opened: true,
        alreadyOpen: true,
        uid
      };
    } catch (err) {
      if (!options.dontSendDisplayErrors) {
        win.webContents.send('main:display-error', {
          message: err.message || 'An error occurred while opening the local collection'
        });
      }
      return {
        path: collectionPath,
        opened: false,
        error: err.message || 'An error occurred while opening the local collection'
      };
    }
  }

  try {
    let ferretConfig = await getCollectionConfigFile(collectionPath);
    const uid = generateUidBasedOnHash(collectionPath);

    // Always ensure node_modules and .git are ignored, regardless of user config
    const defaultIgnores = ['node_modules', '.git'];
    const userIgnores = ferretConfig.ignore || [];
    ferretConfig.ignore = [...new Set([...defaultIgnores, ...userIgnores])];

    ferretConfig = await transformFerretConfigAfterRead(ferretConfig, collectionPath);

    const { size, filesCount } = await getCollectionStats(collectionPath);
    ferretConfig.size = size;
    ferretConfig.filesCount = filesCount;

    win.webContents.send('main:collection-opened', collectionPath, uid, ferretConfig, { silent: !!options.silent });
    ipcMain.emit('main:collection-opened', win, collectionPath, uid, ferretConfig);
    return {
      path: collectionPath,
      opened: true,
      alreadyOpen: false,
      uid
    };
  } catch (err) {
    if (!options.dontSendDisplayErrors) {
      win.webContents.send('main:display-error', {
        message: err.message || 'An error occurred while opening the local collection'
      });
    }
    return {
      path: collectionPath,
      opened: false,
      error: err.message || 'An error occurred while opening the local collection'
    };
  }
};

const openCollectionsByPathname = async (win, watcher, collectionPaths, options = {}) => {
  const seenPaths = new Set();
  const result = {
    opened: [],
    failed: [],
    invalid: []
  };

  for (const collectionPath of collectionPaths) {
    const resolvedPath = path.isAbsolute(collectionPath)
      ? collectionPath
      : normalizeAndResolvePath(collectionPath);

    const normalizedPath = path.normalize(resolvedPath);
    if (seenPaths.has(normalizedPath)) {
      continue;
    }
    seenPaths.add(normalizedPath);

    if (isDirectory(resolvedPath)) {
      const openResult = await openCollection(win, watcher, resolvedPath, options);
      if (openResult?.opened) {
        result.opened.push(openResult.path);
      } else {
        result.failed.push({
          path: resolvedPath,
          error: openResult?.error || 'Failed to open collection'
        });
      }
    } else {
      console.error(`Cannot open unknown folder: "${resolvedPath}"`);
      result.invalid.push(resolvedPath);
    }
  }

  return result;
};

module.exports = {
  getCollectionConfigFile,
  openCollection,
  openCollectionsByPathname,
  registerScratchCollectionPath
};
