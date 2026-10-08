const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeQuickJsVmAsync } = require('../src/sandbox/quickjs');

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-private-loader-')));
const collection = path.join(root, 'collection');

describe('quickjs local module loader is private to require', () => {
  beforeAll(() => {
    fs.mkdirSync(collection, { recursive: true });
    fs.writeFileSync(path.join(collection, 'helper.js'), 'module.exports = "helper value";');
    fs.writeFileSync(
      path.join(collection, 'peek.js'),
      'module.exports = typeof loadLocalModule + ":" + typeof isModuleAPath + ":" + typeof mod;'
    );
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const runScript = async (script) => {
    let value;
    const fer = { cwd: () => collection, setVar: (_name, v) => { value = v; } };
    await executeQuickJsVmAsync({ script, context: { fer }, collectionPath: collection });
    return value;
  };

  it('does not expose __ferretLoadLocalModule to user scripts', async () => {
    const seen = await runScript(`fer.setVar('v', typeof globalThis.__ferretLoadLocalModule)`);
    expect(seen).toBe('undefined');
  });

  it('a direct call to __ferretLoadLocalModule from a script throws', async () => {
    const outcome = await runScript(`
      try { __ferretLoadLocalModule('./helper'); fer.setVar('v', 'called'); }
      catch (e) { fer.setVar('v', 'threw'); }
    `);
    expect(outcome).toBe('threw');
  });

  it('does not expose loadLocalModule to user scripts either', async () => {
    const seen = await runScript(`fer.setVar('v', typeof globalThis.loadLocalModule + ':' + typeof loadLocalModule)`);
    expect(seen).toBe('undefined:undefined');
  });

  it('module code does not inherit the require closure', async () => {
    const seen = await runScript(`fer.setVar('v', require('./peek'))`);
    expect(seen).toBe('undefined:undefined:undefined');
  });

  it('module arguments are only module, exports, and require', async () => {
    fs.writeFileSync(
      path.join(collection, 'args-len.js'),
      'module.exports = arguments.length;'
    );
    const seen = await runScript(`fer.setVar('v', require('./args-len'))`);
    expect(seen).toBe(3);
  });

  it('the loader is not reachable through the require source', async () => {
    const src = await runScript(`fer.setVar('v', globalThis.require.toString())`);
    expect(src).not.toContain('__ferretLoadLocalModule');
  });
});
