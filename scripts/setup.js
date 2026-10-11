const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const icons = {
  clean: '🧹',
  delete: '🗑️',
  install: '📦',
  build: '🔨',
  success: '✅',
  error: '❌',
  working: '⚡'
};

// Committed fixture directories whose `node_modules` folders must survive the
// pre-install cleanup — the tests treat them as fixture data, not build output.
// `additional-context-roots/fixtures` ships a `shared-scripts/node_modules/signature-utils`
// package that exercises walk-up resolution from an additional context root.
const PRESERVED_NODE_MODULES_PREFIXES = [
  path.join('tests', 'scripting', 'additional-context-roots', 'fixtures')
];

const execCommand = (command, description) => {
  try {
    console.log(`\n${icons.working} ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`${icons.success} ${description} completed`);
  } catch (error) {
    console.error(`${icons.error} ${description} failed`);
    throw error;
  }
};

const glob = function (startPath, pattern) {
  let results = [];

  // Ensure start path exists
  if (!fs.existsSync(startPath)) {
    return results;
  }

  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const filename = path.join(startPath, file);
    const stat = fs.lstatSync(filename);

    // If directory, recurse into it
    if (stat.isDirectory()) {
      // Skip node_modules recursion to avoid unnecessary deep scanning
      if (file === 'node_modules') {
        if (file === pattern) {
          results.push(filename);
        }
        continue;
      }
      results = results.concat(glob(filename, pattern));
    }

    // If file matches pattern, add to results
    if (file === pattern) {
      results.push(filename);
    }
  }

  return results;
};

function forceInstallPlatformDeps() {
  // Note: make sure to hard pin deps and only add deps that have been checked
  // for sec vuln already since the following will be force installed.
  const deps = {
    darwin: ['@lydell/node-pty-darwin-arm64@1.1.0', '@lydell/node-pty-darwin-x64@1.1.0'],
    win32: ['@lydell/node-pty-win32-arm64@1.1.0', '@lydell/node-pty-win32-x64@1.1.0'],
    linux: ['@lydell/node-pty-linux-arm64@1.1.0', '@lydell/node-pty-linux-x64@1.1.0']
  };

  // Ignore if no deps need to be installed
  if (!deps[process.platform] || (Array.isArray(deps[process.platform]) && deps[process.platform].length === 0)) return;

  const toInstall = deps[process.platform];
  execCommand(
    `npm i --legacy-peer-deps --no-save --force ${toInstall.join(' ')}`,
    'Installing platform specific dependencies'
  );
}

// npm 11 only runs a dependency's install script when package.json allows it, and a fresh install can still end
// up without Electron's binary. Electron's own installer downloads it, so run that when the binary is missing.
function ensureElectronBinary() {
  const electronDir = path.join('node_modules', 'electron');
  if (!fs.existsSync(electronDir) || fs.existsSync(path.join(electronDir, 'path.txt'))) return;
  execCommand(`node "${path.join(electronDir, 'install.js')}"`, 'Downloading the Electron binary');
}

async function setup() {
  try {
    // Clean up node_modules (if exists)
    console.log(`\n${icons.clean} Cleaning up node_modules directories...`);
    const nodeModulesPaths = glob('.', 'node_modules').filter((dir) =>
      !PRESERVED_NODE_MODULES_PREFIXES.some((prefix) => dir.startsWith(prefix))
    );
    for (const dir of nodeModulesPaths) {
      console.log(`${icons.delete} Removing ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // Install dependencies
    execCommand('npm i --legacy-peer-deps', 'Installing dependencies');
    forceInstallPlatformDeps();
    ensureElectronBinary();

    // Build packages
    execCommand('npm run build:graphql-docs', 'Building graphql-docs');
    execCommand('npm run build:ferret-query', 'Building ferret-query');
    execCommand('npm run build:ferret-common', 'Building ferret-common');
    execCommand('npm run build:ferret-converters', 'Building ferret-converters');
    execCommand('npm run build:ferret-requests', 'Building ferret-requests');
    execCommand('npm run build:schema-types', 'Building schema-types');
    execCommand('npm run build:ferret-filestore', 'Building ferret-filestore');
    execCommand('npm run build:ferret-sqlite', 'Building ferret-sqlite');

    // Bundle JS sandbox libraries
    execCommand('npm run sandbox:bundle-libraries --workspace=packages/ferret-js', 'Bundling JS sandbox libraries');

    console.log(`\n${icons.success} Setup completed successfully!\n`);
  } catch (error) {
    console.error(`\n${icons.error} Setup failed:`);
    console.error(error);
    process.exit(1);
  }
}

setup().catch((error) => {
  console.error(error);
  process.exit(1);
});
