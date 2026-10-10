const fs = require('node:fs');
const path = require('node:path');
const fsExtra = require('fs-extra');
const { ipcMain } = require('electron');
const { sanitizeName, createDirectory, writeFile, safeWriteFileSync, getCollectionStats } = require('./filesystem');
const { generateUidBasedOnHash, stringifyJson } = require('./common');
const { transformFerretConfigAfterRead } = require('./transformFerretConfig');
const {
  stringifyRequestViaWorker,
  stringifyCollection,
  stringifyEnvironment,
  stringifyFolder,
  parseCollection,
  DEFAULT_COLLECTION_FORMAT
} = require('@useferret/filestore');
const { transformProxyConfig } = require('@useferret/requests/dist/cjs');

/**
 * Recursively find a unique folder name by appending incremental numbers
 */
async function findUniqueFolderName(baseName, collectionLocation, counter = 0) {
  const folderName = counter === 0 ? baseName : `${baseName} - ${counter}`;
  const collectionPath = path.join(collectionLocation, sanitizeName(folderName));

  if (fs.existsSync(collectionPath)) {
    return findUniqueFolderName(baseName, collectionLocation, counter + 1);
  }

  return folderName;
}

/**
 * Import a collection - shared logic used by both IPC handler and onboarding service
 * @param {Object} options - Optional settings
 * @param {boolean} options.skipOpenEvent - If true, don't send main:collection-opened event (caller will handle it)
 */
async function importCollection(collection, collectionLocation, mainWindow, uniqueFolderName = null, format = DEFAULT_COLLECTION_FORMAT, options = {}) {
  // Use provided unique folder name or use collection name
  let folderName = uniqueFolderName ? sanitizeName(uniqueFolderName) : sanitizeName(collection.name);
  let collectionPath = path.join(collectionLocation, folderName);

  if (fs.existsSync(collectionPath)) {
    throw new Error(`collection: ${collectionPath} already exists`);
  }

  // Recursive function to parse the collection items and create files/folders
  const parseCollectionItems = async (items = [], currentPath) => {
    for (const item of items) {
      if (['http-request', 'graphql-request', 'grpc-request'].includes(item.type)) {
        let sanitizedFilename = sanitizeName(item.filename || `${item.name}.${format}`);
        const content = await stringifyRequestViaWorker(item, { format });
        const filePath = path.join(currentPath, sanitizedFilename);
        safeWriteFileSync(filePath, content);
      }
      if (item.type === 'folder') {
        let sanitizedFolderName = sanitizeName(item.filename || item.name);
        const folderPath = path.join(currentPath, sanitizedFolderName);
        fs.mkdirSync(folderPath);

        if (item.root?.meta?.name) {
          const folderFilePath = path.join(folderPath, `folder.${format}`);
          item.root.meta.seq = item.seq;
          const folderContent = await stringifyFolder(item.root, { format });
          safeWriteFileSync(folderFilePath, folderContent);
        }

        if (item.items && item.items.length) {
          await parseCollectionItems(item.items, folderPath);
        }
      }
      // Handle items of type 'js'
      if (item.type === 'js') {
        let sanitizedFilename = sanitizeName(item.filename || `${item.name}.js`);
        const filePath = path.join(currentPath, sanitizedFilename);
        safeWriteFileSync(filePath, item.fileContent);
      }
    }
  };

  const parseEnvironments = async (environments = [], collectionPath) => {
    const envDirPath = path.join(collectionPath, 'environments');
    if (!fs.existsSync(envDirPath)) {
      fs.mkdirSync(envDirPath);
    }

    for (const env of environments) {
      const content = await stringifyEnvironment(env, { format });
      let sanitizedEnvFilename = sanitizeName(`${env.name}.${format}`);
      const filePath = path.join(envDirPath, sanitizedEnvFilename);
      safeWriteFileSync(filePath, content);
    }
  };

  const getFerretJsonConfig = (collection) => {
    let ferretConfig = collection.ferretConfig;

    if (!ferretConfig) {
      ferretConfig = {
        name: collection.name,
        type: 'collection',
        ignore: ['node_modules', '.git']
      };
    }

    if (ferretConfig.proxy) {
      ferretConfig.proxy = transformProxyConfig(ferretConfig.proxy);
    }

    return ferretConfig;
  };

  await createDirectory(collectionPath);

  const uid = generateUidBasedOnHash(collectionPath);
  let ferretConfig = getFerretJsonConfig(collection);

  if (format === 'yml') {
    ferretConfig.opencollection = '1.0.0';
    const collectionContent = await stringifyCollection(collection.root, ferretConfig, { format });
    await writeFile(path.join(collectionPath, 'opencollection.yml'), collectionContent);
  } else if (format === 'fer') {
    const ferJsonConfig = { ...ferretConfig, version: '1' };
    if (ferretConfig.version) {
      ferJsonConfig.collectionVersion = ferretConfig.version;
    } else {
      delete ferJsonConfig.collectionVersion;
    }
    const stringifiedFerretConfig = await stringifyJson(ferJsonConfig);
    await writeFile(path.join(collectionPath, 'ferret.json'), stringifiedFerretConfig);

    const collectionContent = await stringifyCollection(collection.root, ferretConfig, { format });
    await writeFile(path.join(collectionPath, 'collection.fer'), collectionContent);
  } else {
    throw new Error(`Invalid format: ${format}`);
  }

  const { size, filesCount } = await getCollectionStats(collectionPath);
  ferretConfig.size = size;
  ferretConfig.filesCount = filesCount;

  // Send collection-opened event unless caller wants to handle it themselves (e.g., during onboarding)
  if (!options.skipOpenEvent) {
    mainWindow.webContents.send('main:collection-opened', collectionPath, uid, ferretConfig);
    ipcMain.emit('main:collection-opened', mainWindow, collectionPath, uid, ferretConfig);
  }

  // create folder and files based on collection
  await parseCollectionItems(collection.items, collectionPath);
  await parseEnvironments(collection.environments, collectionPath);

  return { collectionPath, uid, ferretConfig };
}

/**
 * Moves an already-extracted collection directory (holding ferret.json or opencollection.yml)
 * into collectionLocation under a unique folder name, then opens it. Returns the final path.
 */
async function openImportedCollectionDir(collectionDir, collectionLocation, mainWindow) {
  const ferretJsonPath = path.join(collectionDir, 'ferret.json');
  const openCollectionYmlPath = path.join(collectionDir, 'opencollection.yml');

  if (!fs.existsSync(ferretJsonPath) && !fs.existsSync(openCollectionYmlPath)) {
    throw new Error('Invalid collection: Neither ferret.json nor opencollection.yml found');
  }

  // Ensure config files are not symlinks
  if (fs.existsSync(ferretJsonPath) && fs.lstatSync(ferretJsonPath).isSymbolicLink()) {
    throw new Error('Security error: ferret.json cannot be a symbolic link');
  }
  if (fs.existsSync(openCollectionYmlPath) && fs.lstatSync(openCollectionYmlPath).isSymbolicLink()) {
    throw new Error('Security error: opencollection.yml cannot be a symbolic link');
  }

  let collectionName = 'Imported Collection';
  let ferretConfig = { name: collectionName, version: '1', type: 'collection', ignore: ['node_modules', '.git'] };
  if (fs.existsSync(openCollectionYmlPath)) {
    try {
      const content = fs.readFileSync(openCollectionYmlPath, 'utf8');
      const parsed = parseCollection(content, { format: 'yml' });
      ferretConfig = parsed.ferretConfig || ferretConfig;
      collectionName = ferretConfig.name || collectionName;
    } catch (e) {
      console.error(`Error parsing opencollection.yml at ${openCollectionYmlPath}:`, e);
    }
  } else if (fs.existsSync(ferretJsonPath)) {
    try {
      ferretConfig = JSON.parse(fs.readFileSync(ferretJsonPath, 'utf8'));
      collectionName = ferretConfig.name || collectionName;
    } catch (e) {
      console.error(`Error parsing ferret.json at ${ferretJsonPath}:`, e);
    }
  }

  let sanitizedName = sanitizeName(collectionName);
  if (!sanitizedName) {
    sanitizedName = `untitled-${Date.now()}`;
  }
  let finalCollectionPath = path.join(collectionLocation, sanitizedName);
  let counter = 1;
  while (fs.existsSync(finalCollectionPath)) {
    finalCollectionPath = path.join(collectionLocation, `${sanitizedName} (${counter})`);
    counter++;
  }

  await fsExtra.move(collectionDir, finalCollectionPath);

  const uid = generateUidBasedOnHash(finalCollectionPath);
  ferretConfig = await transformFerretConfigAfterRead(ferretConfig, finalCollectionPath);
  const { size, filesCount } = await getCollectionStats(finalCollectionPath);
  ferretConfig.size = size;
  ferretConfig.filesCount = filesCount;

  mainWindow.webContents.send('main:collection-opened', finalCollectionPath, uid, ferretConfig);
  ipcMain.emit('main:collection-opened', mainWindow, finalCollectionPath, uid, ferretConfig);

  return finalCollectionPath;
}

module.exports = {
  importCollection,
  findUniqueFolderName,
  openImportedCollectionDir
};
