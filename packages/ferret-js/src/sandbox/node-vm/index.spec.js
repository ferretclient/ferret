const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runScriptInNodeVm } = require('./index');
const { __resetNpmModuleStateForTests } = require('./cjs-loader');

// Windows denies symlink creation without developer mode / admin. Probe once at
// module load so the dependent tests can be marked skipped in the reporter
// instead of silently no-oping mid-test.
const symlinksSupported = (() => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-symlink-probe-'));
  const link = target + '-link';
  try {
    fs.symlinkSync(target, link, 'dir');
    fs.unlinkSync(link);
    return true;
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'ENOTSUP') return false;
    throw e;
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
})();
const itIfSymlinks = symlinksSupported ? it : it.skip;

const makePkg = (parentDir, pkgName, files) => {
  const pkgDir = path.join(parentDir, pkgName);
  fs.mkdirSync(pkgDir, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(pkgDir, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return pkgDir;
};

describe('node-vm sandbox', () => {
  let testDir;
  let collectionPath;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-test-'));
    collectionPath = path.join(testDir, 'collection');
    fs.mkdirSync(collectionPath);
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createCustomRequire - local modules', () => {
    it('should load local module with ./ path', async () => {
      // Create a local module
      fs.writeFileSync(
        path.join(collectionPath, 'helper.js'),
        'module.exports = { value: 42 };'
      );

      const script = `
        const helper = require('./helper');
        fer.setVar('result', helper.value);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 42);
    });

    it('should load local module with ../ path', async () => {
      // Create a subdirectory and modules
      const subDir = path.join(collectionPath, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(collectionPath, 'parent.js'),
        'module.exports = { name: "parent" };'
      );
      fs.writeFileSync(
        path.join(subDir, 'child.js'),
        'const parent = require("../parent"); module.exports = parent;'
      );

      const script = `
        const child = require('./subdir/child');
        fer.setVar('result', child.name);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'parent');
    });

    it('should handle backslashes on Windows', async () => {
      const subDir = path.join(collectionPath, 'utils');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(subDir, 'module.js'),
        'module.exports = { platform: "cross-platform" };'
      );

      // Simulate Windows-style path with backslashes
      const script = `
        const mod = require('.\\\\utils\\\\module');
        fer.setVar('result', mod.platform);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'cross-platform');
    });

    it('should block access outside collection path', async () => {
      const script = `
        const outside = require('../../outside');
      `;

      const context = { console: console };

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
      ).rejects.toThrow('Access to files outside of the allowed context roots is not allowed');
    });

    it('should block absolute paths outside allowed roots', async () => {
      // Try to require an absolute path outside the collection
      const script = `
        const secret = require('/etc/passwd');
      `;

      const context = { console: console };

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
      ).rejects.toThrow('Access to files outside of the allowed context roots is not allowed');
    });

    it('should allow absolute paths within allowed roots', async () => {
      // Create a module in the collection
      fs.writeFileSync(
        path.join(collectionPath, 'absolute-test.js'),
        'module.exports = { loaded: true };'
      );

      // Use absolute path to require it
      const absolutePath = path.join(collectionPath, 'absolute-test.js');
      const script = `
        const mod = require('${absolutePath.replace(/\\/g, '\\\\')}');
        fer.setVar('result', mod.loaded);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });
  });

  describe('createCustomRequire - additionalContextRoots', () => {
    it('should allow module access from additionalContextRoots', async () => {
      // Create an additional context root at same level as collection
      const additionalRoot = path.join(testDir, 'shared');
      fs.mkdirSync(additionalRoot);
      fs.writeFileSync(
        path.join(additionalRoot, 'shared.js'),
        'module.exports = { shared: true };'
      );

      // From collection, traverse up to testDir, then into shared directory
      const script = `
        const shared = require('../shared/shared');
        fer.setVar('result', shared.shared);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should handle relative additionalContextRoots path', async () => {
      // Create a sibling directory to collection
      const libsDir = path.join(testDir, 'libs');
      fs.mkdirSync(libsDir);
      fs.writeFileSync(
        path.join(libsDir, 'lib.js'),
        'module.exports = { fromLib: "yes" };'
      );

      const script = `
        const lib = require('../libs/lib');
        fer.setVar('result', lib.fromLib);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: ['../libs']
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'yes');
    });

    it('should handle nested additional context roots modules', async () => {
      // Create an additional context root
      const additionalRoot = path.join(testDir, 'shared');
      fs.mkdirSync(additionalRoot);
      fs.writeFileSync(
        path.join(additionalRoot, 'allowed.js'),
        'module.exports = { allowed: true };'
      );

      // Create a nested module that tries to require from additional root
      fs.writeFileSync(
        path.join(collectionPath, 'parent.js'),
        `
          const allowed = require('../shared/allowed');
          module.exports = { nestedAccess: allowed.allowed };
          `
      );

      const script = `
          const parent = require('./parent');
          fer.setVar('result', parent.nestedAccess);
        `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      // Nested module should successfully access the additional root
      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should not cross-resolve npm package from a sibling additionalContextRoot when required by a collection script', async () => {
      // Package lives only in additionalRoot/node_modules — the collection has
      // no dependency declared for it.
      const additionalRoot = path.join(testDir, 'shared');
      makePkg(path.join(additionalRoot, 'node_modules'), 'shared-package', {
        'index.js': 'module.exports = { fromShared: true };'
      });

      // A COLLECTION script directly requiring `shared-package` must fail:
      // native Node walk-up from the collection never reaches a sibling
      // additional root's node_modules, and cross-root discovery for bare-name
      // resolution is intentionally not implemented. The supported patterns
      // are (a) require the package from a shared script that itself lives
      // inside additionalRoot (see the next test), or (b) declare the dep in
      // the collection's own package.json.
      const script = `require('shared-package');`;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig })
      ).rejects.toThrow(/Could not resolve module "shared-package"/);
    });

    it('should resolve npm module required by a shared script in additionalContextRoots', async () => {
      const additionalRoot = path.join(testDir, 'shared');
      makePkg(path.join(additionalRoot, 'node_modules'), 'shared-util', {
        'index.js': 'module.exports = { parse: function(s) { return JSON.parse(s); } };'
      });
      fs.writeFileSync(
        path.join(additionalRoot, 'parser.js'),
        'const sharedUtil = require("shared-util"); module.exports = { parse: sharedUtil.parse };'
      );

      // Collection script requires the shared local script, which internally
      // requires an npm package from the shared root's node_modules
      const script = `
        const parser = require('../shared/parser');
        const result = parser.parse('{"ok":true}');
        fer.setVar('result', result.ok);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should walk up from a nested shared script to find its npm dependency', async () => {
      // Structure:
      //   shared/
      //     node_modules/deep-dep/index.js   ← package hoisted at shared root
      //     deep/nested/parser.js            ← requires 'deep-dep'
      const additionalRoot = path.join(testDir, 'shared');
      const nestedDir = path.join(additionalRoot, 'deep', 'nested');
      fs.mkdirSync(nestedDir, { recursive: true });

      makePkg(path.join(additionalRoot, 'node_modules'), 'deep-dep', {
        'index.js': 'module.exports = { walkedUp: true };'
      });

      fs.writeFileSync(
        path.join(nestedDir, 'parser.js'),
        'const dep = require("deep-dep"); module.exports = { ok: dep.walkedUp };'
      );

      const script = `
        const parser = require('../shared/deep/nested/parser');
        fer.setVar('result', parser.ok);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    itIfSymlinks('should resolve npm modules when additionalContextRoots points at a symlink', async () => {
      // Physical location of the shared root
      const realShared = path.join(testDir, 'real-shared');
      makePkg(path.join(realShared, 'node_modules'), 'symlinked-lib', {
        'index.js': 'module.exports = { via: "symlink" };'
      });

      // Shared script inside the real location that requires the npm package.
      // Loaded through the symlink below.
      fs.writeFileSync(
        path.join(realShared, 'helper.js'),
        'const pkg = require("symlinked-lib"); module.exports = { via: pkg.via };'
      );

      // User-facing symlink that Ferret is told to treat as the shared root.
      const linkedShared = path.join(testDir, 'linked-shared');
      fs.symlinkSync(realShared, linkedShared, 'dir');

      const script = `
        const helper = require('../linked-shared/helper');
        fer.setVar('via', helper.via);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [linkedShared]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('via', 'symlink');
    });

    itIfSymlinks('should allow subpath imports into an npm-linked package', async () => {
      // Physical location of a multi-file package outside every declared root.
      // Subpath file utils.js — require('subpath-pkg/utils') maps to utils.js
      // (a file, not a directory-with-index.js).
      const externalPkg = makePkg(testDir, 'external-subpath-pkg', {
        'package.json': JSON.stringify({ name: 'subpath-pkg', main: 'index.js' }),
        'index.js': 'module.exports = { root: true };',
        'utils.js': 'module.exports = { greet: () => "sub-hello" };'
      });

      const nodeModulesDir = path.join(collectionPath, 'node_modules');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.symlinkSync(externalPkg, path.join(nodeModulesDir, 'subpath-pkg'), 'dir');

      const script = `
        const utils = require('subpath-pkg/utils');
        fer.setVar('result', utils.greet());
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'sub-hello');
    });

    itIfSymlinks('should allow internal relative requires inside an npm-linked package', async () => {
      // Physical location of a multi-file package outside every declared root.
      const externalPkg = makePkg(testDir, 'external-pkg', {
        'package.json': JSON.stringify({ name: 'linked-pkg', main: 'index.js' }),
        'index.js': 'const util = require("./util"); module.exports = { greet: util.greet };',
        'util.js': 'module.exports = { greet: () => "hello" };'
      });

      // npm-link style: collection has node_modules/<pkg> as a symlink to the
      // physical location that lives outside the collection.
      const nodeModulesDir = path.join(collectionPath, 'node_modules');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.symlinkSync(externalPkg, path.join(nodeModulesDir, 'linked-pkg'), 'dir');

      const script = `
        const pkg = require('linked-pkg');
        fer.setVar('result', pkg.greet());
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'hello');
    });

    it('should allow a package in collection node_modules to require a sibling package', async () => {
      // Two packages installed side-by-side in the collection's node_modules —
      // pkg-a transitively requires pkg-b.
      const nodeModulesDir = path.join(collectionPath, 'node_modules');
      makePkg(nodeModulesDir, 'pkg-a', {
        'package.json': JSON.stringify({ name: 'pkg-a', main: 'index.js' }),
        'index.js': 'const b = require("pkg-b"); module.exports = { value: b.value + 1 };'
      });
      makePkg(nodeModulesDir, 'pkg-b', {
        'package.json': JSON.stringify({ name: 'pkg-b', main: 'index.js' }),
        'index.js': 'module.exports = { value: 41 };'
      });

      const script = `
        const a = require('pkg-a');
        fer.setVar('result', a.value);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 42);
    });

    itIfSymlinks('should allow a scoped npm-linked package', async () => {
      // Physical location of a scoped multi-file package outside every declared root.
      const externalPkg = makePkg(testDir, 'external-scoped-pkg', {
        'package.json': JSON.stringify({ name: '@ferret/scoped-pkg', main: 'index.js' }),
        'index.js': 'const util = require("./util"); module.exports = { greet: util.greet };',
        'util.js': 'module.exports = { greet: () => "scoped-hello" };'
      });

      const scopeDir = path.join(collectionPath, 'node_modules', '@ferret');
      fs.mkdirSync(scopeDir, { recursive: true });
      fs.symlinkSync(externalPkg, path.join(scopeDir, 'scoped-pkg'), 'dir');

      const script = `
        const pkg = require('@ferret/scoped-pkg');
        fer.setVar('result', pkg.greet());
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'scoped-hello');
    });
  });

  describe('createCustomRequire - npm modules', () => {
    it('should load npm module', async () => {
      const script = `
        const lodash = require('lodash');
        fer.setVar('result', typeof lodash.get);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'function');
    });
  });

  describe('createCustomRequire - module caching', () => {
    it('should cache loaded modules', async () => {
      // Module increments a counter each time it's executed
      // If caching works, counter should only be 1 after multiple requires
      fs.writeFileSync(
        path.join(collectionPath, 'cached.js'),
        `
        if (!global._cacheTestCount) global._cacheTestCount = 0;
        global._cacheTestCount++;
        module.exports = { id: Date.now() };
        `
      );

      const script = `
        const mod1 = require('./cached');
        const mod2 = require('./cached');
        const mod3 = require('./cached');
        fer.setVar('sameInstance', mod1 === mod2 && mod2 === mod3);
        fer.setVar('loadCount', global._cacheTestCount);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      // All requires should return the same cached instance
      expect(context.fer.setVar).toHaveBeenCalledWith('sameInstance', true);
      // Module should only be executed once
      expect(context.fer.setVar).toHaveBeenCalledWith('loadCount', 1);
    });

    it('should handle circular dependencies', async () => {
      // Create two modules that require each other
      fs.writeFileSync(
        path.join(collectionPath, 'circularA.js'),
        `
        exports.name = 'A';
        const B = require('./circularB');
        exports.fromB = B.name;
        `
      );
      fs.writeFileSync(
        path.join(collectionPath, 'circularB.js'),
        `
        exports.name = 'B';
        const A = require('./circularA');
        exports.fromA = A.name;
        `
      );

      const script = `
        const A = require('./circularA');
        // A loads first, sets exports.name='A', then requires B
        // B loads, sets exports.name='B', requires A (gets partial: {name:'A'})
        // B finishes with {name:'B', fromA:'A'}
        // A finishes with {name:'A', fromB:'B'}
        fer.setVar('result', A.name + '-' + A.fromB);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'A-B');
    });
  });

  describe('createCustomRequire - npm modules are shared across script executions', () => {
    const scriptingConfig = { cacheModules: true };

    beforeEach(() => {
      __resetNpmModuleStateForTests();
    });

    it('should evaluate an npm module once per process, not once per script context', async () => {
      const marker = `_npmEvalCount_${Date.now()}`;
      makePkg(path.join(collectionPath, 'node_modules'), 'counted-module', {
        'index.js': `
          process.${marker} = (process.${marker} || 0) + 1;
          module.exports = { token: Symbol('counted') };
        `
      });

      const script = `
        const mod = require('counted-module');
        fer.setVar('token', mod.token);
      `;
      const contextA = { fer: { setVar: jest.fn() }, console };
      const contextB = { fer: { setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(process[marker]).toBe(1);
      expect(contextA.fer.setVar.mock.calls[0][1]).toBe(contextB.fer.setVar.mock.calls[0][1]);
      delete process[marker];
    });

    it('should keep Date/Array/Object instanceof true for values from cached npm modules', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'realm-values', {
        'index.js': `
          module.exports = {
            date: () => new Date(0),
            array: () => [1],
            object: () => ({ a: 1 }),
            map: () => new Map([['k', 1]]),
            set: () => new Set([1]),
            regexp: () => /x/,
            error: () => new Error('e')
          };
        `
      });

      const script = `
        const v = require('realm-values');
        fer.setVar('checks', [
          v.date() instanceof Date,
          v.array() instanceof Array,
          v.object() instanceof Object,
          v.map() instanceof Map,
          v.set() instanceof Set,
          v.regexp() instanceof RegExp,
          v.error() instanceof Error
        ].every(Boolean));
      `;
      const context = { fer: { setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('checks', true);
    });

    it('should not let Object.freeze(fer) in one script poison later scripts', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'fer-freezer', {
        'index.js': `
          module.exports = {
            freeze: () => { Object.freeze(fer); return true; },
            read: (name) => fer.getVar(name)
          };
        `
      });

      const freezeScript = `
        fer.setVar('froze', require('fer-freezer').freeze());
      `;
      const readScript = `
        fer.setVar('seen', require('fer-freezer').read('who'));
      `;
      const contextA = { fer: { getVar: jest.fn(), setVar: jest.fn() }, console };
      const contextB = {
        fer: { getVar: jest.fn().mockReturnValue('B'), setVar: jest.fn() },
        console
      };

      await runScriptInNodeVm({ script: freezeScript, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script: readScript, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('froze', true);
      expect(contextB.fer.setVar).toHaveBeenCalledWith('seen', 'B');
    });

    it('should let a cached npm module see the fer of the script currently running', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'fer-reader', {
        'index.js': `module.exports = { read: (name) => fer.getVar(name) };`
      });

      const script = `
        const reader = require('fer-reader');
        fer.setVar('seen', reader.read('who'));
      `;
      const contextA = { fer: { getVar: jest.fn().mockReturnValue('A'), setVar: jest.fn() }, console };
      const contextB = { fer: { getVar: jest.fn().mockReturnValue('B'), setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('seen', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('seen', 'B');
      expect(contextA.fer.getVar).toHaveBeenCalledTimes(1);
      expect(contextB.fer.getVar).toHaveBeenCalledTimes(1);
    });

    it('should switch req dynamically but preserve the module-load URL snapshot', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'request-url-reader', {
        'index.js': `
          const urlAtLoad = req.getUrl();
          module.exports = {
            read: () => req.getUrl(),
            readCaptured: () => urlAtLoad
          };
        `
      });

      const script = `
        const reader = require('request-url-reader');
        fer.setVar('dynamicUrl', reader.read());
        fer.setVar('capturedUrl', reader.readCaptured());
      `;
      const makeContext = (url) => ({
        fer: { setVar: jest.fn() },
        req: { getUrl: jest.fn().mockReturnValue(url) },
        console
      });
      const contextA = makeContext('https://example.com/a');
      const contextB = makeContext('https://example.com/b');

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('dynamicUrl', 'https://example.com/a');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('dynamicUrl', 'https://example.com/b');
      expect(contextA.fer.setVar).toHaveBeenCalledWith('capturedUrl', 'https://example.com/a');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('capturedUrl', 'https://example.com/b');
    });

    it.each([
      ['the first-started script finishes first', 5, 40],
      ['the first-started script finishes last', 40, 5]
    ])('should keep interleaved executions bound to their own fer when %s', async (_, delayA, delayB) => {
      makePkg(path.join(collectionPath, 'node_modules'), 'fer-reader-async', {
        'index.js': `module.exports = { read: (name) => fer.getVar(name) };`
      });

      const scriptFor = (delayMs) => `
        const reader = require('fer-reader-async');
        await new Promise((resolve) => setTimeout(resolve, ${delayMs}));
        fer.setVar('seen', reader.read('who'));
      `;
      const contextA = { fer: { getVar: jest.fn().mockReturnValue('A'), setVar: jest.fn() }, console };
      const contextB = { fer: { getVar: jest.fn().mockReturnValue('B'), setVar: jest.fn() }, console };

      await Promise.all([
        runScriptInNodeVm({ script: scriptFor(delayA), context: contextA, collectionPath, scriptingConfig }),
        runScriptInNodeVm({ script: scriptFor(delayB), context: contextB, collectionPath, scriptingConfig })
      ]);

      expect(contextA.fer.setVar).toHaveBeenCalledWith('seen', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('seen', 'B');
      expect(contextA.fer.getVar).toHaveBeenCalledTimes(1);
      expect(contextB.fer.getVar).toHaveBeenCalledTimes(1);
    });

    it('should let a module that captured fer at load time talk to the current script', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'fer-capturer', {
        'index.js': `
          const captured = fer;
          const { getVar } = fer;
          module.exports = {
            viaCaptured: (name) => captured.getVar(name),
            viaDestructured: (name) => getVar(name),
            hasSetVar: () => 'setVar' in captured,
            setThroughCaptured: (name, value) => { captured.setVar(name, value); },
            types: () => typeof captured + '/' + typeof console + '/' + typeof test
          };
        `
      });

      const script = `
        const capturer = require('fer-capturer');
        capturer.setThroughCaptured('seen', capturer.viaCaptured('who') + capturer.viaDestructured('who'));
        fer.setVar('hasSetVar', capturer.hasSetVar());
        fer.setVar('types', capturer.types());
      `;
      const makeContext = (who) => ({
        fer: { getVar: jest.fn().mockReturnValue(who), setVar: jest.fn() },
        test: () => {},
        console
      });
      const contextA = makeContext('A');
      const contextB = makeContext('B');

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('seen', 'AA');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('seen', 'BB');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('hasSetVar', true);
      expect(contextB.fer.setVar).toHaveBeenCalledWith('types', 'object/object/function');
      expect(contextA.fer.getVar).toHaveBeenCalledTimes(2);
      expect(contextB.fer.getVar).toHaveBeenCalledTimes(2);
    });

    it('should preserve mutable singleton state across script executions', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'stateful-module', {
        'index.js': `
          let count = 0;
          module.exports = { next: () => ++count };
        `
      });

      const script = `fer.setVar('count', require('stateful-module').next());`;
      const contextA = { fer: { setVar: jest.fn() }, console };
      const contextB = { fer: { setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('count', 1);
      expect(contextB.fer.setVar).toHaveBeenCalledWith('count', 2);
    });

    it('should preserve Ferret global identity and cross-realm behavior inside npm modules', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'identity-reader', {
        'index.js': `
          module.exports = {
            sameFer: () => fer === globalThis.fer,
            readArray: (value) => Array.isArray(value)
          };
        `
      });

      const array = [];
      const context = { fer: { setVar: jest.fn() }, array, console };
      const script = `
        const reader = require('identity-reader');
        fer.setVar('sameFer', reader.sameFer());
        fer.setVar('arrayIsArray', reader.readArray(array));
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.fer.setVar).toHaveBeenCalledWith('sameFer', true);
      expect(context.fer.setVar).toHaveBeenCalledWith('arrayIsArray', true);
    });

    it('should bind callbacks created by cached npm modules to their calling script', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'callback-runner', {
        'index.js': `
          module.exports = {
            runLater: (callback) => new Promise((resolve) => {
              setTimeout(() => { callback(); resolve(); }, 5);
            })
          };
        `
      });

      const scriptFor = (value) => `
        await require('callback-runner').runLater(() => fer.setVar('value', '${value}'));
      `;
      const contextA = { fer: { setVar: jest.fn() }, console };
      const contextB = { fer: { setVar: jest.fn() }, console };

      await Promise.all([
        runScriptInNodeVm({ script: scriptFor('A'), context: contextA, collectionPath, scriptingConfig }),
        runScriptInNodeVm({ script: scriptFor('B'), context: contextB, collectionPath, scriptingConfig })
      ]);

      expect(contextA.fer.setVar).toHaveBeenCalledWith('value', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('value', 'B');
    });

    it('should keep fer available when req.onFail runs after the script ends', async () => {
      let onFailHandler;
      const req = {
        onFail(callback) {
          onFailHandler = callback;
        }
      };
      const context = {
        fer: { setVar: jest.fn() },
        req,
        console
      };

      await runScriptInNodeVm({
        script: `
          req.onFail(() => {
            fer.setVar('token', 'after');
          });
        `,
        context,
        collectionPath,
        scriptingConfig
      });

      expect(typeof onFailHandler).toBe('function');
      onFailHandler(new Error('Connection failed'));
      expect(context.fer.setVar).toHaveBeenCalledWith('token', 'after');
    });

    it('should restore req.onFail after a syntax-error run so a later run uses a fresh wrapper', async () => {
      let onFailHandler;
      const req = {
        onFail(callback) {
          onFailHandler = callback;
        }
      };
      const originalOnFail = req.onFail;

      await expect(
        runScriptInNodeVm({
          script: 'this is not valid js {{{',
          context: { fer: {}, req, console },
          collectionPath,
          scriptingConfig
        })
      ).rejects.toThrow();

      expect(req.onFail).toBe(originalOnFail);

      const context = {
        fer: { setVar: jest.fn() },
        req,
        console
      };
      await runScriptInNodeVm({
        script: `
          req.onFail(() => {
            fer.setVar('token', 'after');
          });
        `,
        context,
        collectionPath,
        scriptingConfig
      });

      expect(typeof onFailHandler).toBe('function');
      onFailHandler(new Error('Connection failed'));
      expect(context.fer.setVar).toHaveBeenCalledWith('token', 'after');
    });

    it('should not expose loader internals as script globals', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console
      };

      await runScriptInNodeVm({
        script: `
          fer.setVar('vm', typeof __ferretVmContext);
          fer.setVar('cache', typeof __ferretLocalModuleCache);
        `,
        context,
        collectionPath,
        scriptingConfig
      });

      expect(context.fer.setVar).toHaveBeenCalledWith('vm', 'undefined');
      expect(context.fer.setVar).toHaveBeenCalledWith('cache', 'undefined');
    });

    it('should read a missing key as undefined and still call it once a later execution provides a function', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'helper-caller', {
        'index.js': `module.exports = { probe: () => typeof helper, run: () => helper('x') };`
      });

      const contextA = { fer: { setVar: jest.fn() }, helper: undefined, console };
      await runScriptInNodeVm({
        script: `fer.setVar('probe', require('helper-caller').probe());`,
        context: contextA, collectionPath, scriptingConfig
      });

      const helper = jest.fn().mockReturnValue('called');
      const contextB = { fer: { setVar: jest.fn() }, helper, console };
      await runScriptInNodeVm({
        script: `fer.setVar('ran', require('helper-caller').run());`,
        context: contextB, collectionPath, scriptingConfig
      });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('probe', 'undefined');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('ran', 'called');
      expect(helper).toHaveBeenCalledWith('x');
    });

    it('should preserve primitive custom globals for npm modules', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'primitive-reader', {
        'index.js': `
          module.exports = {
            read: () => [typeof scalar, scalar, typeof flag, flag].join(':')
          };
        `
      });

      const context = {
        fer: { setVar: jest.fn() },
        scalar: 'value',
        flag: false,
        console
      };

      await runScriptInNodeVm({
        script: `fer.setVar('result', require('primitive-reader').read());`,
        context,
        collectionPath,
        scriptingConfig
      });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'string:value:boolean:false');
    });

    it('should re-evaluate a parent that snapshots a context-bound dependency at load time', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'leaf-fer-snapshot', {
        'index.js': `module.exports = { who: fer.getVar('who') };`
      });
      makePkg(path.join(collectionPath, 'node_modules'), 'parent-fer-snapshot', {
        'index.js': `
          const leaf = require('leaf-fer-snapshot');
          module.exports = { who: leaf.who };
        `
      });

      const script = `fer.setVar('seen', require('parent-fer-snapshot').who);`;
      const contextA = { fer: { getVar: jest.fn().mockReturnValue('A'), setVar: jest.fn() }, console };
      const contextB = { fer: { getVar: jest.fn().mockReturnValue('B'), setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('seen', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('seen', 'B');
      expect(contextA.fer.getVar).toHaveBeenCalledTimes(1);
      expect(contextB.fer.getVar).toHaveBeenCalledTimes(1);
      expect(contextA.fer.setVar).toHaveBeenCalledTimes(1);
      expect(contextB.fer.setVar).toHaveBeenCalledTimes(1);
    });

    it('should re-evaluate a three-level parent chain that snapshots fer at the leaf', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'deep-leaf-fer', {
        'index.js': `module.exports = { who: fer.getVar('who') };`
      });
      makePkg(path.join(collectionPath, 'node_modules'), 'deep-mid-fer', {
        'index.js': `
          const leaf = require('deep-leaf-fer');
          module.exports = { who: leaf.who };
        `
      });
      makePkg(path.join(collectionPath, 'node_modules'), 'deep-root-fer', {
        'index.js': `
          const mid = require('deep-mid-fer');
          module.exports = { who: mid.who };
        `
      });

      const script = `fer.setVar('seen', require('deep-root-fer').who);`;
      const contextA = { fer: { getVar: jest.fn().mockReturnValue('A'), setVar: jest.fn() }, console };
      const contextB = { fer: { getVar: jest.fn().mockReturnValue('B'), setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('seen', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('seen', 'B');
      expect(contextA.fer.getVar).toHaveBeenCalledTimes(1);
      expect(contextB.fer.getVar).toHaveBeenCalledTimes(1);
      expect(contextA.fer.setVar).toHaveBeenCalledTimes(1);
      expect(contextB.fer.setVar).toHaveBeenCalledTimes(1);
    });

    it('should still share an inert transitive npm module tree across scripts', async () => {
      const marker = `_inertParentEval_${Date.now()}`;
      makePkg(path.join(collectionPath, 'node_modules'), 'inert-leaf', {
        'index.js': `module.exports = { token: Symbol('inert') };`
      });
      makePkg(path.join(collectionPath, 'node_modules'), 'inert-parent', {
        'index.js': `
          process.${marker} = (process.${marker} || 0) + 1;
          module.exports = { token: require('inert-leaf').token };
        `
      });

      const script = `fer.setVar('token', require('inert-parent').token);`;
      const contextA = { fer: { setVar: jest.fn() }, console };
      const contextB = { fer: { setVar: jest.fn() }, console };

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(process[marker]).toBe(1);
      expect(contextA.fer.setVar.mock.calls[0][1]).toBe(contextB.fer.setVar.mock.calls[0][1]);
      delete process[marker];
    });

    it('should re-evaluate a context-bound leaf required lazily from a shared parent', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'lazy-leaf-fer', {
        'index.js': `
          let calls = 0;
          calls += 1;
          const who = fer.getVar('who');
          module.exports = {
            calls: () => calls,
            who: () => who,
            liveWho: () => fer.getVar('who')
          };
        `
      });
      makePkg(path.join(collectionPath, 'node_modules'), 'lazy-parent-inert', {
        'index.js': `
          module.exports = {
            loadLeaf: () => require('lazy-leaf-fer')
          };
        `
      });

      const script = `
        const leaf = require('lazy-parent-inert').loadLeaf();
        fer.setVar('calls', leaf.calls());
        fer.setVar('who', leaf.who());
        fer.setVar('liveWho', leaf.liveWho());
      `;
      const makeContext = (who) => ({
        fer: { getVar: jest.fn().mockReturnValue(who), setVar: jest.fn() },
        console
      });
      const contextA = makeContext('A');
      const contextB = makeContext('B');
      const contextC = makeContext('C');

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextC, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('calls', 1);
      expect(contextB.fer.setVar).toHaveBeenCalledWith('calls', 1);
      expect(contextC.fer.setVar).toHaveBeenCalledWith('calls', 1);
      expect(contextA.fer.setVar).toHaveBeenCalledWith('who', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('who', 'B');
      expect(contextC.fer.setVar).toHaveBeenCalledWith('who', 'C');
      expect(contextA.fer.setVar).toHaveBeenCalledWith('liveWho', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('liveWho', 'B');
      expect(contextC.fer.setVar).toHaveBeenCalledWith('liveWho', 'C');
    });

    it('should re-evaluate both sides of a context-bound circular npm dependency', async () => {
      makePkg(path.join(collectionPath, 'node_modules'), 'cycle-a', {
        'index.js': `
          let calls = 0;
          calls += 1;
          exports.calls = () => calls;
          exports.who = fer.getVar('who');
          const b = require('cycle-b');
          exports.fromB = () => b.aWho();
        `
      });
      makePkg(path.join(collectionPath, 'node_modules'), 'cycle-b', {
        'index.js': `
          // Inert at load except for the cycle edge — must not stay shared with
          // a stale capture of cycle-a's exports across script runs.
          const a = require('cycle-a');
          exports.aWho = () => a.who;
        `
      });

      const script = `
        const a = require('cycle-a');
        fer.setVar('calls', a.calls());
        fer.setVar('who', a.who);
        fer.setVar('fromB', a.fromB());
      `;
      const makeContext = (who) => ({
        fer: { getVar: jest.fn().mockReturnValue(who), setVar: jest.fn() },
        console
      });
      const contextA = makeContext('A');
      const contextB = makeContext('B');

      await runScriptInNodeVm({ script, context: contextA, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: contextB, collectionPath, scriptingConfig });

      expect(contextA.fer.setVar).toHaveBeenCalledWith('calls', 1);
      expect(contextB.fer.setVar).toHaveBeenCalledWith('calls', 1);
      expect(contextA.fer.setVar).toHaveBeenCalledWith('who', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('who', 'B');
      expect(contextA.fer.setVar).toHaveBeenCalledWith('fromB', 'A');
      expect(contextB.fer.setVar).toHaveBeenCalledWith('fromB', 'B');
    });

    it('should keep collection-local modules per script context', async () => {
      const marker = `_localEvalCount_${Date.now()}`;
      fs.writeFileSync(
        path.join(collectionPath, 'local-counted.js'),
        `process.${marker} = (process.${marker} || 0) + 1; module.exports = {};`
      );
      const script = `require('./local-counted');`;

      await runScriptInNodeVm({ script, context: { fer: {}, console }, collectionPath, scriptingConfig });
      await runScriptInNodeVm({ script, context: { fer: {}, console }, collectionPath, scriptingConfig });

      expect(process[marker]).toBe(2);
      delete process[marker];
    });
  });

  describe('createCustomRequire - Node.js builtin modules', () => {
    it('should load builtin modules (crypto)', async () => {
      const script = `
        const crypto = require('crypto');
        fer.setVar('result', typeof crypto.createHash);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should support node: prefix syntax', async () => {
      const script = `
        const path = require('node:path');
        fer.setVar('result', typeof path.join);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should allow all builtin modules including fs', async () => {
      const script = `
        const fs = require('fs');
        fer.setVar('result', typeof fs.readFileSync);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should load multiple builtins', async () => {
      const script = `
        const url = require('url');
        const util = require('util');
        const buffer = require('buffer');
        const fs = require('fs');
        fer.setVar('result', typeof url.parse + '-' + typeof util.format + '-' + typeof buffer.Buffer + '-' + typeof fs.readFileSync);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'function-function-function-function');
    });
  });

  describe('createCustomRequire - npm modules in vm context', () => {
    it('should load npm modules from collection into vm context', async () => {
      // Create a mock npm module in collection's node_modules
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'test-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        'module.exports = { name: "test-module", value: 123 };'
      );

      const script = `
        const testMod = require('test-module');
        fer.setVar('result', testMod.name + '-' + testMod.value);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'test-module-123');
    });

    it('should handle npm module with dependencies', async () => {
      // Create a mock npm module with internal dependencies
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'parent-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'helper.js'),
        'module.exports = { helper: true };'
      );
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        'const helper = require("./helper"); module.exports = { hasHelper: helper.helper };'
      );

      const script = `
        const parentMod = require('parent-module');
        fer.setVar('result', parentMod.hasHelper);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should provide fer object to npm modules', async () => {
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'fer-access-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        `module.exports = {
          getEnvVar: function(name) { return fer.getEnvVar(name); },
          setVar: function(name, value) { fer.setVar(name, value); }
        };`
      );

      const script = `
        const ferModule = require('fer-access-module');
        const envValue = ferModule.getEnvVar('TEST_VAR');
        ferModule.setVar('result', envValue);
      `;

      const getEnvVarMock = jest.fn().mockReturnValue('test-value');
      const setVarMock = jest.fn();
      const context = {
        fer: {
          getEnvVar: getEnvVarMock,
          setVar: setVarMock
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(getEnvVarMock).toHaveBeenCalledWith('TEST_VAR');
      expect(setVarMock).toHaveBeenCalledWith('result', 'test-value');
    });

    it('should provide req object to npm modules', async () => {
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'req-access-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        `module.exports = {
          getUrl: function() { return req.getUrl(); },
          getMethod: function() { return req.getMethod(); },
          setHeader: function(name, value) { req.setHeader(name, value); }
        };`
      );

      const script = `
        const reqModule = require('req-access-module');
        const url = reqModule.getUrl();
        const method = reqModule.getMethod();
        reqModule.setHeader('X-Custom', 'value');
        fer.setVar('result', method + ':' + url);
      `;

      const setVarMock = jest.fn();
      const getUrlMock = jest.fn().mockReturnValue('https://api.example.com');
      const getMethodMock = jest.fn().mockReturnValue('POST');
      const setHeaderMock = jest.fn();
      const context = {
        fer: { setVar: setVarMock },
        req: {
          getUrl: getUrlMock,
          getMethod: getMethodMock,
          setHeader: setHeaderMock
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(getUrlMock).toHaveBeenCalled();
      expect(getMethodMock).toHaveBeenCalled();
      expect(setHeaderMock).toHaveBeenCalledWith('X-Custom', 'value');
      expect(setVarMock).toHaveBeenCalledWith('result', 'POST:https://api.example.com');
    });

    it('should provide res object to npm modules', async () => {
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'res-access-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        `module.exports = {
          getStatus: function() { return res.getStatus(); },
          getBody: function() { return res.getBody(); },
          getHeader: function(name) { return res.getHeader(name); }
        };`
      );

      const script = `
        const resModule = require('res-access-module');
        const status = resModule.getStatus();
        const body = resModule.getBody();
        const contentType = resModule.getHeader('content-type');
        fer.setVar('result', status + ':' + contentType + ':' + body.message);
      `;

      const context = {
        fer: { setVar: jest.fn() },
        res: {
          getStatus: jest.fn().mockReturnValue(200),
          getBody: jest.fn().mockReturnValue({ message: 'success' }),
          getHeader: jest.fn().mockReturnValue('application/json')
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.res.getStatus).toHaveBeenCalled();
      expect(context.res.getBody).toHaveBeenCalled();
      expect(context.res.getHeader).toHaveBeenCalledWith('content-type');
      expect(context.fer.setVar).toHaveBeenCalledWith('result', '200:application/json:success');
    });

    it('should provide fer, req, res to nested npm module dependencies', async () => {
      // Create parent module
      const parentDir = path.join(collectionPath, 'node_modules', 'parent-ctx-module');
      fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(
        path.join(parentDir, 'index.js'),
        `const child = require('./child');
        module.exports = { childResult: child.getData() };`
      );
      // Create child module that accesses context
      fs.writeFileSync(
        path.join(parentDir, 'child.js'),
        `module.exports = {
          getData: function() {
            return {
              envVar: fer.getEnvVar('NESTED_VAR'),
              reqUrl: req.getUrl(),
              resStatus: res.getStatus()
            };
          }
        };`
      );

      const script = `
        const parent = require('parent-ctx-module');
        const data = parent.childResult;
        fer.setVar('result', data.envVar + '|' + data.reqUrl + '|' + data.resStatus);
      `;

      const getEnvVarMock = jest.fn().mockReturnValue('nested-value');
      const setVarMock = jest.fn();
      const getUrlMock = jest.fn().mockReturnValue('https://nested.example.com');
      const getStatusMock = jest.fn().mockReturnValue(201);
      const context = {
        fer: {
          getEnvVar: getEnvVarMock,
          setVar: setVarMock
        },
        req: {
          getUrl: getUrlMock
        },
        res: {
          getStatus: getStatusMock
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(getEnvVarMock).toHaveBeenCalledWith('NESTED_VAR');
      expect(getUrlMock).toHaveBeenCalled();
      expect(getStatusMock).toHaveBeenCalled();
      expect(setVarMock).toHaveBeenCalledWith('result', 'nested-value|https://nested.example.com|201');
    });

    describe('CommonJS module patterns', () => {
      it('should handle module.exports = object pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-object');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'module.exports = { foo: "bar", num: 42 };'
        );

        const script = `
          const mod = require('cjs-object');
          fer.setVar('result', mod.foo + '-' + mod.num);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'bar-42');
      });

      it('should handle module.exports = function pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-function');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'module.exports = function(x) { return x * 2; };'
        );

        const script = `
          const double = require('cjs-function');
          fer.setVar('result', double(21));
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 42);
      });

      it('should handle module.exports = class pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-class');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `class Calculator {
            constructor(val) { this.val = val; }
            add(x) { return this.val + x; }
          }
          module.exports = Calculator;`
        );

        const script = `
          const Calculator = require('cjs-class');
          const calc = new Calculator(10);
          fer.setVar('result', calc.add(5));
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 15);
      });

      it('should handle exports.property pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-exports');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `exports.add = function(a, b) { return a + b; };
          exports.multiply = function(a, b) { return a * b; };
          exports.VERSION = '1.0.0';`
        );

        const script = `
          const math = require('cjs-exports');
          fer.setVar('result', math.add(2, 3) + '-' + math.multiply(4, 5) + '-' + math.VERSION);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', '5-20-1.0.0');
      });

      it('should handle mixed module.exports and exports pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-mixed');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `// module.exports takes precedence
          exports.ignored = 'this will be ignored';
          module.exports = { actual: 'value' };`
        );

        const script = `
          const mod = require('cjs-mixed');
          fer.setVar('result', mod.actual + '-' + (mod.ignored || 'undefined'));
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'value-undefined');
      });
    });

    describe('File extension handling', () => {
      it('should load .cjs files as CommonJS', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-ext-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "cjs-ext-module", "main": "index.cjs"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.cjs'),
          'module.exports = { format: "cjs", value: 100 };'
        );

        const script = `
          const mod = require('cjs-ext-module');
          fer.setVar('result', mod.format + '-' + mod.value);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'cjs-100');
      });

      it('should fail when loading .mjs files (ES modules)', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'mjs-ext-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "mjs-ext-module", "main": "index.mjs"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.mjs'),
          'export default { format: "esm" };'
        );

        const script = `
          const mod = require('mjs-ext-module');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow();
      });

      it('should load module with package.json main field', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'custom-main');
        fs.mkdirSync(path.join(nodeModulesDir, 'lib'), { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "custom-main", "main": "lib/entry.js"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'lib', 'entry.js'),
          'module.exports = { entry: "custom-main-lib" };'
        );

        const script = `
          const mod = require('custom-main');
          fer.setVar('result', mod.entry);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'custom-main-lib');
      });

      it('should require relative .cjs files within npm module', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-relative');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'helper.cjs'),
          'module.exports = { helperValue: "from-cjs" };'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'const helper = require("./helper.cjs"); module.exports = helper;'
        );

        const script = `
          const mod = require('cjs-relative');
          fer.setVar('result', mod.helperValue);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'from-cjs');
      });

      it('should load .json files directly', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'json-direct');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "json-direct", "main": "data.json"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'data.json'),
          '{"type": "json-main", "count": 42}'
        );

        const script = `
          const data = require('json-direct');
          fer.setVar('result', data.type + '-' + data.count);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'json-main-42');
      });
    });

    describe('JSON file handling', () => {
      it('should load JSON files from npm modules', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'json-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'config.json'),
          '{"name": "test-config", "version": "1.0.0", "enabled": true}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'const config = require("./config.json"); module.exports = config;'
        );

        const script = `
          const config = require('json-module');
          fer.setVar('result', config.name + '-' + config.version + '-' + config.enabled);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'test-config-1.0.0-true');
      });

      it('should handle nested JSON requires', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'nested-json');
        fs.mkdirSync(path.join(nodeModulesDir, 'data'), { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'data', 'schema.json'),
          '{"type": "object", "properties": {"id": {"type": "number"}}}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'const schema = require("./data/schema.json"); module.exports = { schema };'
        );

        const script = `
          const mod = require('nested-json');
          fer.setVar('result', mod.schema.type + '-' + mod.schema.properties.id.type);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'object-number');
      });
    });

    describe('Node.js globals in npm modules', () => {
      it('should have access to Buffer', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'buffer-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `module.exports = {
            encode: function(str) { return Buffer.from(str).toString('base64'); },
            decode: function(b64) { return Buffer.from(b64, 'base64').toString('utf8'); }
          };`
        );

        const script = `
          const bufMod = require('buffer-module');
          const encoded = bufMod.encode('hello');
          const decoded = bufMod.decode(encoded);
          fer.setVar('result', encoded + '-' + decoded);
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'aGVsbG8=-hello');
      });

      it('should have access to URL and URLSearchParams', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'url-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `module.exports = {
            parseUrl: function(urlStr) {
              const url = new URL(urlStr);
              return url.hostname;
            },
            buildQuery: function(params) {
              const search = new URLSearchParams(params);
              return search.toString();
            }
          };`
        );

        const script = `
          const urlMod = require('url-module');
          fer.setVar('result', urlMod.parseUrl('https://example.com/path'));
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', 'example.com');
      });

      it('should have access to setTimeout/clearTimeout', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'timer-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `module.exports = {
            hasTimers: function() {
              return typeof setTimeout === 'function' && typeof clearTimeout === 'function';
            }
          };`
        );

        const script = `
          const timerMod = require('timer-module');
          fer.setVar('result', timerMod.hasTimers());
        `;

        const context = {
          fer: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
      });
    });

    describe('Error handling', () => {
      it('should throw error for non-existent module', async () => {
        const script = `
          const mod = require('non-existent-module-xyz');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow('Could not resolve module');
      });

      it('should throw error for module with syntax error', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'syntax-error-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'module.exports = { invalid syntax here'
        );

        const script = `
          const mod = require('syntax-error-module');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow();
      });

      it('should throw error for module with runtime error', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'runtime-error-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'throw new Error("Module initialization failed");'
        );

        const script = `
          const mod = require('runtime-error-module');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow('Module initialization failed');
      });
    });
  });

  describe('context isolation', () => {
    it('should have global pointing to isolated context (not host)', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      // global exists but points to isolated context, so global.fer should exist
      // process is a sanitized object in the isolated context
      const script = `fer.setVar('result', typeof global.fer === 'object' && typeof global.process === 'object')`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should not have access to host fs module via globalThis', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const script = `fer.setVar('result', typeof globalThis.fs)`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'undefined');
    });

    it('should throw ReferenceError for undeclared variables', async () => {
      const context = { console: console };

      const script = `const x = someUndeclaredVar`;

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
      ).rejects.toThrow('someUndeclaredVar is not defined');
    });

    it('should have access to context objects via globalThis', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        req: { url: 'http://test.com' },
        console: console
      };

      const script = `fer.setVar('result', typeof globalThis.req)`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'object');
    });

    it('should have access to allowed globals like Buffer', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const script = `fer.setVar('result', typeof globalThis.Buffer)`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should have access to process object with nextTick', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const script = `
        const hasSafeProps = typeof process.version === 'string' && typeof process.platform === 'string';
        const hasNextTick = typeof process.nextTick === 'function';
        fer.setVar('result', hasSafeProps && hasNextTick);
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should work with Array.isArray across context boundaries', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const script = `
        const arr = [1, 2, 3];
        fer.setVar('result', Array.isArray(arr));
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should have working Object methods', async () => {
      const context = {
        fer: { setVar: jest.fn() },
        console: console
      };

      const script = `
        const obj = { a: 1, b: 2 };
        fer.setVar('result', Object.keys(obj).join(','));
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.fer.setVar).toHaveBeenCalledWith('result', 'a,b');
    });
  });
});
