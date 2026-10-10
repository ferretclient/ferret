const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsExtra = require('fs-extra');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn(), emit: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));
jest.mock('./mount', () => ({
  unmount: jest.fn(async () => {}),
  clearCollectionIndex: jest.fn()
}));
jest.mock('../app/collections', () => ({
  openCollection: jest.fn(async () => ({ opened: true }))
}));
jest.mock('../services/snapshot', () => ({
  setCollection: jest.fn(),
  remapCollectionTabPaths: jest.fn()
}));
jest.mock('../store/ferret-config', () => ({
  clearFerretConfig: jest.fn()
}));
jest.mock('../cache/requestUids', () => ({
  clearRequestUidsForCollection: jest.fn()
}));
// The worker pool needs a built dist + worker threads; unit tests run the sync
// equivalents instead — the conversion output is identical.
jest.mock('@ferret-app/filestore', () => {
  const actual = jest.requireActual('@ferret-app/filestore');
  return {
    ...actual,
    parseRequestViaWorker: async (content, options) => actual.parseRequest(content, options),
    stringifyRequestViaWorker: async (obj, options) => actual.stringifyRequest(obj, options),
    parseFolderViaWorker: async (content, options) => actual.parseFolder(content, options),
    stringifyFolderViaWorker: async (obj, options) => actual.stringifyFolder(obj, options),
    parseEnvironmentViaWorker: async (content, options) => actual.parseEnvironment(content, options),
    stringifyEnvironmentViaWorker: async (obj, options) => actual.stringifyEnvironment(obj, options)
  };
});

const {
  migrateCollectionOnDisk,
  migrateCollectionToYml,
  stripFerExtInRunRequest,
  MIGRATION_CANCELLED_MESSAGE
} = require('./yml-migration');
const { openCollection } = require('../app/collections');
const snapshotManager = require('../services/snapshot');

const FERRET_JSON = {
  version: '1',
  name: 'test-collection',
  type: 'collection',
  collectionVersion: '2.1.0'
};

const REQUEST_FER = `meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: http://localhost:3000/ping
}
`;

const FOLDER_FER = `meta {
  name: api
}
`;

const ENV_FER = `vars {
  host: http://localhost:3000
}
`;

const COLLECTION_FER = `docs {
  Root level docs
}
`;

const REQUEST_FER_WITH_RUN_REQUEST = `meta {
  name: chain
  type: http
  seq: 1
}

get {
  url: http://localhost:3000/chain
}

script:pre-request {
  await fer.runRequest("newFolder/SecondReq.fer");
  await fer.runRequest('single/quoted.fer');
}

script:post-response {
  await fer.runRequest(\`template/literal.fer\`);
  await fer.runRequest("no-ext");
  await fer.runRequest("keeper.bruv");
}

tests {
  await fer.runRequest("tests/only.fer");
}
`;

const FOLDER_FER_WITH_RUN_REQUEST = `meta {
  name: chained
}

script:pre-request {
  await fer.runRequest("folder-scoped/first.fer");
}
`;

const COLLECTION_FER_WITH_RUN_REQUEST = `script:pre-request {
  await fer.runRequest("collection-scoped/first.fer");
}
`;

describe('migrateCollectionOnDisk', () => {
  let collectionDir;
  let backupRootDir;

  const filePath = (...segments) => path.join(collectionDir, ...segments);

  const listFilesRecursive = (dir) => {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(entryPath));
      } else {
        results.push(entryPath);
      }
    }
    return results.sort();
  };

  const snapshotDisk = () => {
    const files = {};
    for (const file of listFilesRecursive(collectionDir)) {
      files[path.relative(collectionDir, file)] = fs.readFileSync(file, 'utf8');
    }
    return files;
  };

  const runMigration = (overrides = {}) =>
    migrateCollectionOnDisk({
      collectionPathname: collectionDir,
      ferretConfig: { ...FERRET_JSON },
      backupRootDir,
      ...overrides
    });

  beforeEach(() => {
    collectionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-collection-'));
    backupRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-backup-'));

    fs.writeFileSync(filePath('ferret.json'), JSON.stringify(FERRET_JSON, null, 2));
    fs.writeFileSync(filePath('collection.fer'), COLLECTION_FER);
    fs.writeFileSync(filePath('ping.fer'), REQUEST_FER);
    fs.mkdirSync(filePath('api'));
    fs.writeFileSync(filePath('api', 'folder.fer'), FOLDER_FER);
    fs.writeFileSync(filePath('api', 'get-users.fer'), REQUEST_FER.replace('ping', 'get-users'));
    fs.mkdirSync(filePath('environments'));
    fs.writeFileSync(filePath('environments', 'Local.fer'), ENV_FER);
    fs.writeFileSync(filePath('README.md'), '# not a fer file\n');
  });

  afterEach(() => {
    fsExtra.removeSync(collectionDir);
    fsExtra.removeSync(backupRootDir);
    jest.restoreAllMocks();
  });

  it('converts every .fer file, removes the sources and leaves other files untouched', async () => {
    const { ferretConfig, tabPathMap } = await runMigration();

    const remaining = listFilesRecursive(collectionDir).map((file) => path.relative(collectionDir, file));
    expect(remaining).toEqual(
      [
        'README.md',
        'opencollection.yml',
        'ping.yml',
        path.join('api', 'folder.yml'),
        path.join('api', 'get-users.yml'),
        path.join('environments', 'Local.yml')
      ].sort()
    );

    expect(tabPathMap[filePath('ping.fer')]).toBe(filePath('ping.yml'));
    expect(tabPathMap[filePath('api', 'get-users.fer')]).toBe(filePath('api', 'get-users.yml'));
    expect(tabPathMap[filePath('environments', 'Local.fer')]).toBe(filePath('environments', 'Local.yml'));

    const ocYml = fs.readFileSync(filePath('opencollection.yml'), 'utf8');
    expect(ocYml).toContain('opencollection:');
    expect(fs.readFileSync(filePath('README.md'), 'utf8')).toBe('# not a fer file\n');

    expect(ferretConfig.opencollection).toBe('1.0.0');
    expect(ferretConfig.version).toBe('2.1.0');
    expect(ferretConfig.collectionVersion).toBeUndefined();

    // backup is removed once the migration committed
    expect(fs.readdirSync(backupRootDir)).toEqual([]);
  });

  it('emits parsing, writing and finalizing progress with consistent totals', async () => {
    const events = [];
    await runMigration({ emitProgress: (phase, current, total) => events.push({ phase, current, total }) });

    const phases = [...new Set(events.map((event) => event.phase))];
    expect(phases).toEqual(['parsing', 'writing', 'finalizing']);

    for (const phase of phases) {
      const phaseEvents = events.filter((event) => event.phase === phase);
      const { total } = phaseEvents[0];
      expect(phaseEvents.map((event) => event.current)).toEqual(
        Array.from({ length: phaseEvents.length }, (_, i) => i + 1)
      );
      expect(phaseEvents[phaseEvents.length - 1].current).toBe(total);
    }

    // 5 .fer files parsed; 4 converted + opencollection.yml written; 5 .fer + ferret.json removed
    expect(events.filter((e) => e.phase === 'parsing').length).toBe(5);
    expect(events.filter((e) => e.phase === 'writing').length).toBe(5);
    expect(events.filter((e) => e.phase === 'finalizing').length).toBe(6);
  });

  it('aborts before writing anything when a file fails to parse', async () => {
    fs.writeFileSync(filePath('broken.fer'), 'meta { this is not parseable');
    const before = snapshotDisk();

    await expect(runMigration()).rejects.toThrow(/failed to parse/);

    expect(snapshotDisk()).toEqual(before);
  });

  it('aborts without touching disk when a target yml file already exists', async () => {
    fs.writeFileSync(filePath('ping.yml'), 'pre-existing file\n');
    const before = snapshotDisk();

    await expect(runMigration()).rejects.toThrow(/already exist/);

    expect(snapshotDisk()).toEqual(before);
    expect(fs.readFileSync(filePath('ping.yml'), 'utf8')).toBe('pre-existing file\n');
  });

  it('leaves the collection untouched when cancelled during parsing', async () => {
    const before = snapshotDisk();
    let calls = 0;
    const checkCancelled = () => {
      if (++calls > 2) {
        throw new Error(MIGRATION_CANCELLED_MESSAGE);
      }
    };

    await expect(runMigration({ checkCancelled })).rejects.toThrow(MIGRATION_CANCELLED_MESSAGE);

    expect(snapshotDisk()).toEqual(before);
    expect(fs.readdirSync(backupRootDir)).toEqual([]);
  });

  it('restores removed sources and deletes written yml when finalizing fails midway', async () => {
    const before = snapshotDisk();
    const realUnlink = fs.promises.unlink.bind(fs.promises);
    let unlinkCalls = 0;
    jest.spyOn(fs.promises, 'unlink').mockImplementation(async (target) => {
      if (++unlinkCalls === 3) {
        throw new Error('EPERM: simulated lock');
      }
      return realUnlink(target);
    });

    await expect(runMigration()).rejects.toThrow('EPERM: simulated lock');

    expect(snapshotDisk()).toEqual(before);
    expect(fs.readdirSync(backupRootDir)).toEqual([]);
  });

  it('does not touch .fer files inside node_modules or .git', async () => {
    fs.mkdirSync(filePath('node_modules'));
    fs.writeFileSync(filePath('node_modules', 'stray.fer'), REQUEST_FER);
    fs.mkdirSync(filePath('.git'));
    fs.writeFileSync(filePath('.git', 'inside-git.fer'), REQUEST_FER);

    await runMigration();

    expect(fs.existsSync(filePath('node_modules', 'stray.fer'))).toBe(true);
    expect(fs.existsSync(filePath('.git', 'inside-git.fer'))).toBe(true);
    expect(fs.existsSync(filePath('node_modules', 'stray.yml'))).toBe(false);
    expect(fs.existsSync(filePath('.git', 'inside-git.yml'))).toBe(false);
  });

  it('does not follow symlinks pointing outside the collection', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-outside-'));
    const externalFer = path.join(outside, 'external.fer');
    try {
      fs.writeFileSync(externalFer, REQUEST_FER);
      try {
        fs.symlinkSync(externalFer, filePath('linked.fer'));
      } catch (err) {
        // Skip on platforms/permissions where symlink creation fails (e.g. non-admin Windows).
        return;
      }

      await runMigration();

      expect(fs.existsSync(externalFer)).toBe(true);
      expect(fs.readFileSync(externalFer, 'utf8')).toBe(REQUEST_FER);
      expect(fs.existsSync(filePath('linked.fer'))).toBe(true);
      expect(fs.existsSync(filePath('linked.yml'))).toBe(false);
    } finally {
      fsExtra.removeSync(outside);
    }
  });

  it('honors ferret.json `ignore` paths so vendored .fer files are not migrated', async () => {
    fs.mkdirSync(filePath('vendor'));
    fs.writeFileSync(filePath('vendor', 'lib.fer'), REQUEST_FER);

    await runMigration({ ferretConfig: { ...FERRET_JSON, ignore: ['vendor'] } });

    expect(fs.existsSync(filePath('vendor', 'lib.fer'))).toBe(true);
    expect(fs.existsSync(filePath('vendor', 'lib.yml'))).toBe(false);
  });

  it('upgrades a legacy-shape proxy block so it survives the yml stringifier', async () => {
    const legacyProxyConfig = {
      ...FERRET_JSON,
      proxy: {
        enabled: true,
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { enabled: true, username: 'u', password: 'p' },
        bypassProxy: 'localhost,127.0.0.1'
      }
    };

    const { ferretConfig } = await runMigration({ ferretConfig: legacyProxyConfig });

    // Legacy `enabled: true` must become `inherit: false` (an explicit collection-level
    // proxy), not `inherit: true` (which would silently defer to the global proxy).
    expect(ferretConfig.proxy).toEqual(expect.objectContaining({
      inherit: false,
      config: expect.objectContaining({
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { username: 'u', password: 'p' },
        bypassProxy: 'localhost,127.0.0.1'
      })
    }));

    const ocYml = fs.readFileSync(filePath('opencollection.yml'), 'utf8');
    expect(ocYml).toContain('proxy.example.com');
  });

  it('strips the .fer extension from fer.runRequest calls across request, folder and collection scripts', async () => {
    fs.writeFileSync(filePath('collection.fer'), COLLECTION_FER_WITH_RUN_REQUEST);
    fs.writeFileSync(filePath('chain.fer'), REQUEST_FER_WITH_RUN_REQUEST);
    fs.writeFileSync(filePath('api', 'folder.fer'), FOLDER_FER_WITH_RUN_REQUEST);

    await runMigration();

    const chainYml = fs.readFileSync(filePath('chain.yml'), 'utf8');
    expect(chainYml).toContain('fer.runRequest("newFolder/SecondReq")');
    expect(chainYml).toContain('fer.runRequest(\'single/quoted\')');
    expect(chainYml).toContain('fer.runRequest(`template/literal`)');
    expect(chainYml).toContain('fer.runRequest("tests/only")');
    // Untouched: extensionless call and a look-alike extension.
    expect(chainYml).toContain('fer.runRequest("no-ext")');
    expect(chainYml).toContain('fer.runRequest("keeper.bruv")');
    // No stray literal ".fer" survived any of the rewritten calls.
    expect(chainYml).not.toMatch(/fer\.runRequest\([^)]*\.fer['"`]\)/);

    const folderYml = fs.readFileSync(filePath('api', 'folder.yml'), 'utf8');
    expect(folderYml).toContain('fer.runRequest("folder-scoped/first")');
    expect(folderYml).not.toContain('folder-scoped/first.fer');

    const ocYml = fs.readFileSync(filePath('opencollection.yml'), 'utf8');
    expect(ocYml).toContain('fer.runRequest("collection-scoped/first")');
    expect(ocYml).not.toContain('collection-scoped/first.fer');
  });

  it('keeps the backup and reports when a source cannot be restored', async () => {
    const realUnlink = fs.promises.unlink.bind(fs.promises);
    let unlinkCalls = 0;
    jest.spyOn(fs.promises, 'unlink').mockImplementation(async (target) => {
      if (++unlinkCalls === 3) {
        throw new Error('EPERM: simulated lock');
      }
      return realUnlink(target);
    });
    const realCopy = fsExtra.copy;
    jest.spyOn(fsExtra, 'copy').mockImplementation(async (src, dest) => {
      // let backup copies (into backupRootDir) pass; fail the restore copies back
      if (dest.startsWith(collectionDir)) {
        throw new Error('EACCES: simulated restore failure');
      }
      return realCopy(src, dest);
    });
    const reportError = jest.fn();

    await expect(runMigration({ reportError })).rejects.toThrow('EPERM: simulated lock');

    expect(reportError).toHaveBeenCalledWith(expect.stringContaining('could not be restored'));
    // the backup directory with the originals must survive for manual recovery
    expect(fs.readdirSync(backupRootDir)).toHaveLength(1);
  });
});

describe('stripFerExtInRunRequest', () => {
  it('rewrites standalone string-literal arguments in every quote style', () => {
    const input = [
      'await fer.runRequest("folder/one.fer");',
      'await fer.runRequest(\'folder/two.fer\');',
      'await fer.runRequest(`folder/three.fer`);'
    ].join('\n');
    const output = stripFerExtInRunRequest(input);
    expect(output).toBe([
      'await fer.runRequest("folder/one");',
      'await fer.runRequest(\'folder/two\');',
      'await fer.runRequest(`folder/three`);'
    ].join('\n'));
  });

  it('rewrites every eligible call on the same line', () => {
    const input = 'fer.runRequest("a.fer"); fer.runRequest("b.fer");';
    expect(stripFerExtInRunRequest(input)).toBe('fer.runRequest("a"); fer.runRequest("b");');
  });

  it('leaves calls inside line comments untouched', () => {
    const input = [
      '// fer.runRequest("commented.fer")',
      'fer.runRequest("real.fer");'
    ].join('\n');
    const output = stripFerExtInRunRequest(input);
    expect(output).toContain('// fer.runRequest("commented.fer")');
    expect(output).toContain('fer.runRequest("real")');
    expect(output).not.toContain('real.fer');
  });

  it('leaves calls inside block comments untouched', () => {
    const input = '/* fer.runRequest("block.fer") */ fer.runRequest("real.fer");';
    const output = stripFerExtInRunRequest(input);
    expect(output).toContain('/* fer.runRequest("block.fer") */');
    expect(output).toContain('fer.runRequest("real")');
  });

  it('leaves lookalike text inside an unrelated outer string literal untouched', () => {
    const single = 'const s = \'fer.runRequest("outer.fer")\';';
    const double = 'const s = "fer.runRequest(\'outer.fer\')";';
    expect(stripFerExtInRunRequest(single)).toBe(single);
    expect(stripFerExtInRunRequest(double)).toBe(double);
  });

  it('does not rewrite when the argument is a compound expression', () => {
    const cases = [
      'fer.runRequest("first.fer" + suffix)',
      'fer.runRequest("first.fer", { retries: 1 })',
      'fer.runRequest(getPath("first.fer"))',
      'fer.runRequest(`${prefix}` + ".fer")'
    ];
    for (const input of cases) {
      expect(stripFerExtInRunRequest(input)).toBe(input);
    }
  });

  it('does not rewrite calls whose argument does not end in .fer', () => {
    const cases = [
      'fer.runRequest("no-ext")',
      'fer.runRequest("looks/like.bruv")',
      'fer.runRequest("")'
    ];
    for (const input of cases) {
      expect(stripFerExtInRunRequest(input)).toBe(input);
    }
  });

  it('ignores identifiers that only end in "fer"', () => {
    const input = 'notbru.runRequest("foo.fer"); mybru.runRequest("bar.fer");';
    expect(stripFerExtInRunRequest(input)).toBe(input);
  });

  it('tolerates whitespace around the call punctuation', () => {
    const input = 'fer.runRequest\n(\n  "spaced/out.fer"\n)';
    expect(stripFerExtInRunRequest(input)).toBe('fer.runRequest\n(\n  "spaced/out"\n)');
  });

  it('is a no-op when the input never references runRequest', () => {
    const input = 'const x = 1;\nfunction f() { return x + 2; }';
    expect(stripFerExtInRunRequest(input)).toBe(input);
  });

  it('returns the input unchanged for empty or non-string values', () => {
    expect(stripFerExtInRunRequest('')).toBe('');
    expect(stripFerExtInRunRequest(null)).toBe(null);
    expect(stripFerExtInRunRequest(undefined)).toBe(undefined);
  });

  it('rewrites calls nested inside a template literal substitution', () => {
    const input = 'const msg = `Result: ${await fer.runRequest("nested/one.fer")}`;';
    expect(stripFerExtInRunRequest(input)).toBe(
      'const msg = `Result: ${await fer.runRequest("nested/one")}`;'
    );
  });

  it('descends into nested template substitutions', () => {
    const input = 'const s = `${`inner ${fer.runRequest("deep.fer")}`}`;';
    expect(stripFerExtInRunRequest(input)).toBe(
      'const s = `${`inner ${fer.runRequest("deep")}`}`;'
    );
  });

  it('leaves template literal text (outside substitutions) untouched', () => {
    const input = 'const s = `text fer.runRequest("outer.fer") text`;';
    expect(stripFerExtInRunRequest(input)).toBe(input);
  });

  it('leaves calls that appear inside a regex literal untouched', () => {
    const cases = [
      'const re = /fer\\.runRequest\\("foo\\.fer"\\)/;',
      'if (source.match(/fer\\.runRequest\\("bar.fer"\\)/)) {}',
      'const re = /[a-z]fer\\.runRequest\\("baz.fer"\\)/g;'
    ];
    for (const input of cases) {
      expect(stripFerExtInRunRequest(input)).toBe(input);
    }
  });

  it('rewrites a call that follows an unrelated division', () => {
    const input = 'const half = total / 2; fer.runRequest("real.fer");';
    expect(stripFerExtInRunRequest(input)).toBe(
      'const half = total / 2; fer.runRequest("real");'
    );
  });

  it('treats `/` after a value-expecting keyword as a regex, not division', () => {
    const input = 'function f() { return /fer\\.runRequest\\("kw.fer"\\)/; }';
    expect(stripFerExtInRunRequest(input)).toBe(input);
  });
});

describe('migrateCollectionToYml reopen', () => {
  let collectionDir;
  const collectionUid = 'col-uid';
  const mainWindow = { webContents: { send: jest.fn() } };
  const watcher = { removeWatcher: jest.fn() };

  beforeEach(() => {
    collectionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-reopen-'));
    fs.writeFileSync(path.join(collectionDir, 'ferret.json'), JSON.stringify(FERRET_JSON, null, 2));
    fs.writeFileSync(path.join(collectionDir, 'collection.fer'), COLLECTION_FER);
    fs.writeFileSync(path.join(collectionDir, 'ping.fer'), REQUEST_FER);
    openCollection.mockReset();
    openCollection.mockResolvedValue({ opened: true });
    snapshotManager.remapCollectionTabPaths.mockClear();
    mainWindow.webContents.send.mockClear();
  });

  afterEach(() => {
    fsExtra.removeSync(collectionDir);
  });

  it('fails the success path when openCollection returns opened: false', async () => {
    openCollection.mockResolvedValue({
      opened: false,
      error: 'broken opencollection.yml'
    });

    await expect(
      migrateCollectionToYml({
        mainWindow,
        watcher,
        collectionPathname: collectionDir,
        collectionUid
      })
    ).rejects.toThrow('broken opencollection.yml');

    // Disk migration still completed (yml present); reopen failure must not look like success.
    expect(fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
    expect(fs.existsSync(path.join(collectionDir, 'ferret.json'))).toBe(false);
  });

  it('still surfaces the migration error when reopen also returns opened: false', async () => {
    fs.writeFileSync(path.join(collectionDir, 'broken.fer'), 'meta { this is not parseable');
    openCollection.mockResolvedValue({
      opened: false,
      error: 'could not reopen'
    });

    await expect(
      migrateCollectionToYml({
        mainWindow,
        watcher,
        collectionPathname: collectionDir,
        collectionUid
      })
    ).rejects.toThrow(/failed to parse/);
  });
});
