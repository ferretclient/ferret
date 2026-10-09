const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const { sanitizeName } = require('./filesystem');
const { readWorkspaceConfig, writeWorkspaceConfig, validateWorkspaceConfig } = require('./workspace-config');
const { convertBrunoCollectionDir, isBrunoCollectionDir } = require('./bruno-import');

const SKIPPED_DIRS = new Set(['.git', 'node_modules']);

const copyFilter = (src) => !SKIPPED_DIRS.has(path.basename(src)) && !fs.lstatSync(src).isSymbolicLink();

const isInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const uniqueDirName = (parentDir, baseName) => {
  let candidate = sanitizeName(baseName) || 'collection';
  for (let counter = 1; fs.existsSync(path.join(parentDir, candidate)); counter++) {
    candidate = `${sanitizeName(baseName) || 'collection'} - ${counter}`;
  }
  return candidate;
};

/** True for a folder holding a workspace.yml, the marker Bruno and Ferret share. */
const isWorkspaceDir = (dir) => {
  try {
    const config = yaml.load(fs.readFileSync(path.join(dir, 'workspace.yml'), 'utf8'));
    return Boolean(config) && typeof config === 'object' && config.info?.type === 'workspace';
  } catch {
    return false;
  }
};

/**
 * Brings the collections a workspace lists into the converted copy: a collection inside the workspace
 * is converted where it is; one that lives elsewhere is copied into `collections/` and its entry is
 * pointed there (Bruno's "Move into Workspace"). Entries whose folder is missing are kept and reported.
 */
const convertWorkspaceCollections = async (sourceDir, workDir, entries) => {
  const collections = [];
  const warnings = [];

  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') {
      continue;
    }
    const label = entry.name || entry.path;
    const sourceCollectionDir = path.resolve(sourceDir, entry.path);

    if (!fs.existsSync(sourceCollectionDir) || !isBrunoCollectionDir(sourceCollectionDir)) {
      collections.push(entry);
      warnings.push(`Collection "${label}" was not found at ${entry.path}, so it was not imported`);
      continue;
    }

    try {
      if (isInside(sourceDir, sourceCollectionDir)) {
        await convertBrunoCollectionDir(path.join(workDir, path.relative(sourceDir, sourceCollectionDir)));
        collections.push(entry);
      } else {
        const collectionsDir = path.join(workDir, 'collections');
        const folderName = uniqueDirName(collectionsDir, path.basename(sourceCollectionDir));
        const destination = path.join(collectionsDir, folderName);
        await fsExtra.copy(sourceCollectionDir, destination, { filter: copyFilter });
        await convertBrunoCollectionDir(destination);
        collections.push({ ...entry, path: `collections/${folderName}` });
      }
    } catch (error) {
      collections.push(entry);
      warnings.push(`Collection "${label}" could not be converted: ${error.message}`);
    }
  }

  return { collections, warnings };
};

/**
 * Imports a Bruno workspace folder as a Ferret workspace inside `targetLocation`. The folder is copied
 * and converted in a temp directory first, so the original is never modified: every collection it lists
 * is converted, collections stored outside it are moved in, and global environments are converted.
 * Resolves to `{ workspacePath, collectionCount, warnings }`; the caller opens the workspace.
 */
const importBrunoWorkspaceFolder = async (workspaceDir, targetLocation) => {
  if (!workspaceDir || !fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
    throw new Error('Bruno workspace folder does not exist');
  }
  if (!targetLocation || !fs.existsSync(targetLocation)) {
    throw new Error('Workspace location does not exist');
  }
  if (!isWorkspaceDir(workspaceDir)) {
    throw new Error('Not a Bruno workspace: the folder has no workspace.yml');
  }

  const tempDir = path.join(os.tmpdir(), `ferret_bruno_workspace_import_${Date.now()}`);
  const workDir = path.join(tempDir, path.basename(workspaceDir));

  try {
    await fsExtra.copy(workspaceDir, workDir, { filter: copyFilter });

    const config = readWorkspaceConfig(workDir);
    validateWorkspaceConfig(config);

    const { collections, warnings } = await convertWorkspaceCollections(workspaceDir, workDir, config.collections);

    const environmentsDir = path.join(workDir, 'environments');
    if (fs.existsSync(environmentsDir)) {
      try {
        await convertBrunoCollectionDir(environmentsDir);
      } catch (error) {
        warnings.push(`Global environments could not be converted: ${error.message}`);
      }
    }

    await writeWorkspaceConfig(workDir, { ...config, collections });

    const workspaceName = sanitizeName(config.name) || 'imported-workspace';
    const finalName = uniqueDirName(targetLocation, workspaceName);
    const workspacePath = path.join(targetLocation, finalName);
    await fsExtra.move(workDir, workspacePath);

    return { workspacePath, collectionCount: collections.length, warnings };
  } finally {
    await fsExtra.remove(tempDir).catch(() => {});
  }
};

module.exports = {
  isWorkspaceDir,
  importBrunoWorkspaceFolder
};
