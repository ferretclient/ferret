const path = require('path');
const { isFile, isDirectory } = require('./filesystem');
const { transformProxyConfig } = require('@ferret-app/requests');

function transformFerretConfigBeforeSave(ferretConfig) {
  if (ferretConfig && !ferretConfig.opencollection) {
    const userVersion = ferretConfig.version;
    ferretConfig.version = '1'; // fer schema marker
    if (userVersion) {
      ferretConfig.collectionVersion = userVersion;
    } else {
      delete ferretConfig.collectionVersion;
    }
  }

  // remove exists from importPaths and protoFiles
  if (ferretConfig.protobuf?.importPaths) {
    ferretConfig.protobuf.importPaths = ferretConfig.protobuf.importPaths.map((importPath) => {
      delete importPath.exists;
      return importPath;
    });
  }
  if (ferretConfig.protobuf?.protoFiles) {
    ferretConfig.protobuf.protoFiles = ferretConfig.protobuf.protoFiles.map((protoFile) => {
      delete protoFile.exists;
      return protoFile;
    });
  }

  // Clean up proxy config before saving
  if (ferretConfig.proxy) {
    // Remove disabled: false (optional field)
    if (ferretConfig.proxy.disabled === false) {
      delete ferretConfig.proxy.disabled;
    }
    // Remove auth.disabled: false (optional field)
    if (ferretConfig.proxy.config?.auth?.disabled === false) {
      delete ferretConfig.proxy.config.auth.disabled;
    }
  }

  return ferretConfig;
}

async function transformFerretConfigAfterRead(ferretConfig, collectionPathname) {
  if (ferretConfig && !ferretConfig.opencollection) {
    if (ferretConfig.collectionVersion) {
      ferretConfig.version = ferretConfig.collectionVersion;
    } else {
      delete ferretConfig.version;
    }
    delete ferretConfig.collectionVersion;
  }

  // add exists to importPaths and protoFiles by checking actual file/directory existence
  if (ferretConfig.protobuf?.importPaths) {
    ferretConfig.protobuf.importPaths = await Promise.all(ferretConfig.protobuf.importPaths.map(async (importPath) => {
      try {
        // Resolve the relative path against the collection pathname
        const absolutePath = path.resolve(collectionPathname, importPath.path);
        // Check if it's a directory
        const exists = isDirectory(absolutePath);
        return {
          ...importPath,
          exists
        };
      } catch (error) {
        return {
          ...importPath,
          exists: false
        };
      }
    }));
  }

  if (ferretConfig.protobuf?.protoFiles) {
    ferretConfig.protobuf.protoFiles = await Promise.all(ferretConfig.protobuf.protoFiles.map(async (protoFile) => {
      try {
        // Resolve the relative path against the collection pathname
        const absolutePath = path.resolve(collectionPathname, protoFile.path);
        // Check if it's a file
        const exists = isFile(absolutePath);
        return {
          ...protoFile,
          exists
        };
      } catch (error) {
        return {
          ...protoFile,
          exists: false
        };
      }
    }));
  }

  // Migrate proxy configuration from old format to new format
  if (ferretConfig.proxy) {
    ferretConfig.proxy = transformProxyConfig(ferretConfig.proxy);
  }

  return ferretConfig;
}

module.exports = {
  transformFerretConfigBeforeSave,
  transformFerretConfigAfterRead
};
