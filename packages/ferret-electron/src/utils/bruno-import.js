const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsExtra = require('fs-extra');
const { convertBrunoFile } = require('@ferretclient/filestore');
const { openImportedCollectionDir } = require('./collection-import');

const SKIPPED_DIRS = new Set(['.git', 'node_modules']);
const CONVERTIBLE_FILE = /^bruno\.json$|\.bru$|\.ya?ml$/i;

const isBrunoCollectionDir = (dir) =>
  fs.existsSync(path.join(dir, 'bruno.json')) || fs.existsSync(path.join(dir, 'opencollection.yml'));

const MAX_SCAN_DEPTH = 4;

/**
 * Bruno collection directories at or below `root`. A collection is not searched further, so a
 * collection nested inside another is not reported twice. Folders such as `.git` and
 * `node_modules`, and symlinks, are skipped.
 */
const findBrunoCollectionDirs = async (root, maxDepth = MAX_SCAN_DEPTH) => {
  if (isBrunoCollectionDir(root)) {
    return [root];
  }
  if (maxDepth <= 0) {
    return [];
  }

  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && !entry.isSymbolicLink() && !SKIPPED_DIRS.has(entry.name)) {
      found.push(...await findBrunoCollectionDirs(path.join(root, entry.name), maxDepth - 1));
    }
  }
  return found;
};

/**
 * Converts a Bruno collection directory to Ferret in place: bruno.json → ferret.json,
 * *.bru → *.fer, and `bru` scripts → `fer`. On a Ferret collection it changes nothing,
 * so it is safe to run on any imported collection.
 */
const convertBrunoCollectionDir = async (dir) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) {
        await convertBrunoCollectionDir(fullPath);
      }
      continue;
    }
    if (!entry.isFile() || !CONVERTIBLE_FILE.test(entry.name)) {
      continue;
    }

    const content = await fs.promises.readFile(fullPath, 'utf8');
    const converted = convertBrunoFile(fullPath, content);
    if (!converted) {
      continue;
    }

    const renamed = converted.path !== fullPath;
    if (renamed && fs.existsSync(converted.path)) {
      throw new Error(`Cannot convert ${entry.name}: ${path.basename(converted.path)} already exists next to it`);
    }

    await fs.promises.writeFile(converted.path, converted.content, 'utf8');
    if (renamed) {
      await fs.promises.unlink(fullPath);
    }
  }
};

const assertDirectory = (folderPath, message) => {
  if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error(message);
  }
};

/**
 * Imports a Bruno collection folder as a new Ferret collection in collectionLocation.
 * The source folder is copied and converted in a temp directory, so it is never modified.
 * `.git`, `node_modules` and symlinks are not copied.
 */
const importBrunoCollectionFolder = async (mainWindow, folderPath, collectionLocation) => {
  assertDirectory(folderPath, 'Bruno collection folder does not exist');
  if (!collectionLocation || !fs.existsSync(collectionLocation)) {
    throw new Error('Collection location does not exist');
  }
  if (!isBrunoCollectionDir(folderPath)) {
    throw new Error('Not a Bruno collection: the folder has no bruno.json or opencollection.yml');
  }

  const tempDir = path.join(os.tmpdir(), `ferret_bruno_import_${Date.now()}`);
  const workDir = path.join(tempDir, path.basename(folderPath));

  try {
    await fsExtra.copy(folderPath, workDir, {
      filter: (src) => !SKIPPED_DIRS.has(path.basename(src)) && !fs.lstatSync(src).isSymbolicLink()
    });
    await convertBrunoCollectionDir(workDir);
    return await openImportedCollectionDir(workDir, collectionLocation, mainWindow);
  } finally {
    await fsExtra.remove(tempDir).catch(() => {});
  }
};

/** Bruno collections inside a folder the user picked: the folder itself or any collections below it. */
const findBrunoCollections = async (folderPath) => {
  assertDirectory(folderPath, 'Bruno folder does not exist');
  return findBrunoCollectionDirs(folderPath);
};

/**
 * Imports every Bruno collection found in `folderPath`, which may be one collection or a folder that
 * holds several. Each is converted and opened separately, so one that fails does not stop the rest.
 * Resolves to `{ imported: [paths], failed: [{ path, message }] }`.
 */
const importBrunoFolder = async (mainWindow, folderPath, collectionLocation) => {
  const collectionDirs = await findBrunoCollections(folderPath);
  if (!collectionDirs.length) {
    throw new Error('No Bruno collections found: looked for a bruno.json or opencollection.yml in the folder and up to four levels below it');
  }

  const imported = [];
  const failed = [];
  for (const dir of collectionDirs) {
    try {
      imported.push(await importBrunoCollectionFolder(mainWindow, dir, collectionLocation));
    } catch (error) {
      failed.push({ path: dir, message: error.message });
    }
  }
  return { imported, failed };
};

module.exports = {
  isBrunoCollectionDir,
  convertBrunoCollectionDir,
  findBrunoCollections,
  importBrunoCollectionFolder,
  importBrunoFolder
};
