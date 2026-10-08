const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { runCli } = require('./helpers/run-cli');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const REQUEST_FER = `meta {
  name: set-typed-vars
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("envNum", 42);
  fer.setEnvVar("envBool", true);
  fer.setEnvVar("envObj", { port: 3000, ssl: true });
  fer.setEnvVar("envStr", "hello");

  fer.setCollectionVar("collNum", 7);
  fer.setCollectionVar("collBool", false);
  fer.setCollectionVar("collObj", { region: "eu", retries: 3 });
  fer.setCollectionVar("collStr", "plain");
}
`;

describe('CLI run — typed env + collection vars set via scripts are persisted to disk', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fer-cli-typed-persist-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const assertDiskState = () => {
    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.fer'), 'utf8');
    expect(envContent).toMatch(/@number\s+envNum:\s*42/);
    expect(envContent).toMatch(/@boolean\s+envBool:\s*true/);
    expect(envContent).toMatch(/@object\s+envObj:/);
    expect(envContent).toContain('"port": 3000');
    expect(envContent).toContain('"ssl": true');
    // 'string' is the implicit default — never materialized as an annotation.
    expect(envContent).not.toMatch(/@string\s+envStr/);
    expect(envContent).toMatch(/envStr:\s*hello/);

    const collectionFer = fs.readFileSync(path.join(tmpDir, 'collection.fer'), 'utf8');
    expect(collectionFer).toMatch(/@number\s+collNum:\s*7/);
    expect(collectionFer).toMatch(/@boolean\s+collBool:\s*false/);
    expect(collectionFer).toMatch(/@object\s+collObj:/);
    expect(collectionFer).toContain('"region": "eu"');
    expect(collectionFer).toContain('"retries": 3');
    expect(collectionFer).not.toMatch(/@string\s+collStr/);
    expect(collectionFer).toMatch(/collStr:\s*plain/);
  };

  // 'safe' → quickjs, anything else → nodevm. Both runtimes must produce identical disk state.
  it.each([
    ['developer'],
    ['safe']
  ])('writes @number/@boolean/@object annotations after CLI run (--sandbox %s)', async (sandbox) => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'typed-cli-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: typed-cli-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.fer'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(path.join(tmpDir, 'set-typed-vars.fer'), REQUEST_FER);

    const result = await runCli([
      'run', 'set-typed-vars.fer', '--env', 'Test', '--sandbox', sandbox, '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    assertDiskState();
  }, 60_000);

  // Global env vars live in the workspace, not the collection — CLI walks up from cwd looking
  // for workspace.yml, then reads <workspace>/environments/<name>.yml.
  it.each([
    ['developer'],
    ['safe']
  ])('writes typed global env vars back to <workspace>/environments/<name>.yml (--sandbox %s)', async (sandbox) => {
    const workspaceDir = path.join(tmpDir, 'workspace');
    const collectionDir = path.join(workspaceDir, 'typed-cli-collection');

    writeFixtureFile(
      path.join(workspaceDir, 'workspace.yml'),
      'opencollection: 1.0.0\ninfo:\n  name: "Test Workspace"\n  type: workspace\ncollections:\n  - name: "typed-cli-collection"\n    path: "typed-cli-collection"\nspecs:\ndocs: \'\'\n'
    );
    writeFixtureFile(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      `name: Global\nvariables:\n  - name: baseUrl\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );

    writeFixtureFile(
      path.join(collectionDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'typed-cli-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.fer'),
      'meta {\n  name: typed-cli-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'set-typed-global-vars.fer'),
      `meta {
  name: set-typed-global-vars
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setGlobalEnvVar("globalNum", 99);
  fer.setGlobalEnvVar("globalBool", false);
  fer.setGlobalEnvVar("globalObj", { tier: "premium", limit: 100 });
}
`
    );

    const result = await runCli(
      ['run', 'set-typed-global-vars.fer', '--global-env', 'Global', '--sandbox', sandbox, '--noproxy'],
      collectionDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // yml encodes typed values as `value: { type, data }` blocks; strings stay as raw `value:`.
    const written = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yml'), 'utf8');
    expect(written).toMatch(/name:\s*globalNum[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?99/);
    expect(written).toMatch(/name:\s*globalBool[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?false/);
    expect(written).toMatch(/name:\s*globalObj[\s\S]*?type:\s*object[\s\S]*?data:[\s\S]*?tier/);
    expect(written).toMatch(/name:\s*baseUrl[\s\S]*?value:\s*['"]?http:\/\/127\.0\.0\.1/);
    expect(written).not.toMatch(/name:\s*baseUrl[\s\S]*?type:\s*string/);
  }, 60_000);

  // Collection lives outside the workspace tree, so cwd walk-up can't find workspace.yml —
  // only --workspace-path can locate it.
  it('persists typed global env vars when --workspace-path is provided explicitly', async () => {
    const workspaceDir = path.join(tmpDir, 'workspace');
    const collectionDir = path.join(tmpDir, 'standalone-collection');

    writeFixtureFile(
      path.join(workspaceDir, 'workspace.yml'),
      'opencollection: 1.0.0\ninfo:\n  name: "Test Workspace"\n  type: workspace\ncollections:\nspecs:\ndocs: \'\'\n'
    );
    writeFixtureFile(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      `name: Global\nvariables:\n  - name: baseUrl\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );

    writeFixtureFile(
      path.join(collectionDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'standalone-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.fer'),
      'meta {\n  name: standalone-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'set-typed-global-vars.fer'),
      `meta {
  name: set-typed-global-vars
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setGlobalEnvVar("globalNum", 99);
  fer.setGlobalEnvVar("globalBool", false);
}
`
    );

    const result = await runCli(
      [
        'run', 'set-typed-global-vars.fer',
        '--global-env', 'Global',
        '--workspace-path', workspaceDir,
        '--sandbox', 'developer',
        '--noproxy'
      ],
      collectionDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yml'), 'utf8');
    expect(written).toMatch(/name:\s*globalNum[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?99/);
    expect(written).toMatch(/name:\s*globalBool[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?false/);
  }, 60_000);

  // --env-file is the only CLI surface that supports JSON env files. uid + custom fields on
  // untouched entries must survive the rewrite.
  it('persists typed env vars to a --env-file JSON file and preserves per-entry uid / custom fields', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'json-env-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: json-env-collection\n  seq: 1\n}\n'
    );

    writeFixtureFile(
      path.join(tmpDir, 'External.json'),
      JSON.stringify({
        name: 'External',
        uid: 'env-uid-abc',
        variables: [
          { name: 'host', value: baseUrl, uid: 'var-host', custom: 'keep-host' },
          { name: 'untouched', value: 'stays-put', uid: 'var-untouched', custom: 'keep-me' }
        ]
      }, null, 2) + '\n'
    );

    writeFixtureFile(
      path.join(tmpDir, 'set-typed-vars.fer'),
      `meta {
  name: set-typed-vars
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("port", 3000);
  fer.setEnvVar("enabled", true);
}
`
    );

    const result = await runCli([
      'run', 'set-typed-vars.fer',
      '--env-file', 'External.json',
      '--sandbox', 'developer',
      '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'External.json'), 'utf8'));
    expect(written.uid).toBe('env-uid-abc');
    const byName = Object.fromEntries(written.variables.map((v) => [v.name, v]));
    expect(byName.port).toMatchObject({ value: 3000, dataType: 'number' });
    expect(byName.enabled).toMatchObject({ value: true, dataType: 'boolean' });
    expect(byName.untouched).toMatchObject({
      value: 'stays-put',
      uid: 'var-untouched',
      custom: 'keep-me'
    });
    expect(byName.host).toMatchObject({ uid: 'var-host', custom: 'keep-host' });
  }, 60_000);

  // --env-file infers format from extension — yml/fer wiring is covered separately by --env
  // and --global-env. These tests prove the --env-file <path>.{yml,fer} branches.
  it('persists typed env vars to a --env-file YAML file with type/data blocks', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'yml-envfile-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: yml-envfile-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'External.yml'),
      `name: External\nvariables:\n  - name: host\n    value: ${baseUrl}\n    enabled: true\n    secret: false\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-typed-vars.fer'),
      `meta {
  name: set-typed-vars
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("port", 3000);
  fer.setEnvVar("enabled", true);
}
`
    );

    const result = await runCli([
      'run', 'set-typed-vars.fer',
      '--env-file', 'External.yml',
      '--sandbox', 'developer',
      '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = fs.readFileSync(path.join(tmpDir, 'External.yml'), 'utf8');
    expect(written).toMatch(/name:\s*port[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?3000/);
    expect(written).toMatch(/name:\s*enabled[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?true/);
    expect(written).toMatch(/name:\s*host[\s\S]*?value:\s*['"]?http:\/\/127\.0\.0\.1/);
    expect(written).not.toMatch(/name:\s*host[\s\S]*?type:\s*string/);
  }, 60_000);

  // JSON natively types values via JSON.parse — no dataType tag needed on seed. Script touches
  // an unrelated key, forcing a full-env echo; seeded values must survive intact with
  // auto-annotated dataType.
  it('preserves pre-existing native typed values in --env-file JSON when script touches unrelated keys', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'json-types-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: json-types-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'External.json'),
      JSON.stringify({
        name: 'External',
        variables: [
          { name: 'host', value: baseUrl },
          { name: 'seedNum', value: 42 },
          { name: 'seedBool', value: true },
          { name: 'seedObj', value: { region: 'eu', port: 3000 } },
          { name: 'seedArr', value: [1, 2, 3] }
        ]
      }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'touch-unrelated.fer'),
      `meta {
  name: touch-unrelated
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("trigger", "x");
}
`
    );

    const result = await runCli([
      'run', 'touch-unrelated.fer',
      '--env-file', 'External.json',
      '--sandbox', 'developer',
      '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = JSON.parse(fs.readFileSync(path.join(tmpDir, 'External.json'), 'utf8'));
    const byName = Object.fromEntries(written.variables.map((v) => [v.name, v]));
    expect(byName.seedNum).toMatchObject({ value: 42, dataType: 'number' });
    expect(byName.seedBool).toMatchObject({ value: true, dataType: 'boolean' });
    expect(byName.seedObj).toMatchObject({ value: { region: 'eu', port: 3000 }, dataType: 'object' });
    // Arrays are `typeof === 'object'` in JS, so they get dataType: 'object'.
    expect(byName.seedArr).toMatchObject({ value: [1, 2, 3], dataType: 'object' });
    expect(byName.host.value).toBe(baseUrl);
    expect(byName.host.dataType).toBeUndefined();
    expect(byName.trigger).toMatchObject({ value: 'x' });
    expect(byName.trigger.dataType).toBeUndefined();
  }, 60_000);

  it('persists typed env vars to a --env-file .fer file with @dataType annotations', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'fer-envfile-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: fer-envfile-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'External.fer'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-typed-vars.fer'),
      `meta {
  name: set-typed-vars
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("port", 3000);
  fer.setEnvVar("enabled", true);
}
`
    );

    const result = await runCli([
      'run', 'set-typed-vars.fer',
      '--env-file', 'External.fer',
      '--sandbox', 'developer',
      '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const written = fs.readFileSync(path.join(tmpDir, 'External.fer'), 'utf8');
    expect(written).toMatch(/@number\s+port:\s*3000/);
    expect(written).toMatch(/@boolean\s+enabled:\s*true/);
    expect(written).not.toMatch(/@string\s+host/);
    expect(written).toMatch(/host:\s*http:\/\/127\.0\.0\.1/);
  }, 60_000);

  // --env-var values are transient. Even when a script write triggers full-env echo, the
  // override must NOT replace the on-disk secret.
  it('does not persist --env-var override values into the env file', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'override-leak-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: override-leak-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.fer'),
      `vars {\n  host: ${baseUrl}\n  token: real-secret-on-disk\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-unrelated.fer'),
      `meta {
  name: set-unrelated
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("unrelated", "value");
}
`
    );

    const result = await runCli([
      'run', 'set-unrelated.fer',
      '--env', 'Test',
      '--env-var', 'token=transient-cli-value',
      '--sandbox', 'developer',
      '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.fer'), 'utf8');
    expect(envContent).toMatch(/token:\s*real-secret-on-disk/);
    expect(envContent).not.toContain('transient-cli-value');
    expect(envContent).toMatch(/unrelated:\s*value/);
  }, 60_000);

  // When a post-response script throws after writing a var, run-single-request.js calls
  // syncVariableUpdates with `error.partialResults`. The on-disk env file must reflect the
  // pre-throw write.
  it('persists vars written before a post-response script error (partial results)', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'partial-results-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: partial-results-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.fer'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-then-throw.fer'),
      `meta {
  name: set-then-throw
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

script:post-response {
  fer.setEnvVar("beforeThrow", 42);
  fer.setCollectionVar("collBeforeThrow", true);
  throw new Error("boom");
}
`
    );

    const result = await runCli([
      'run', 'set-then-throw.fer', '--env', 'Test', '--sandbox', 'developer', '--noproxy'
    ], tmpDir);

    // Pin failure exit first — otherwise the persistence assertion below could pass for the
    // wrong reason (e.g. the script never ran).
    expect(result.code).not.toBe(0);

    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.fer'), 'utf8');
    expect(envContent).toMatch(/@number\s+beforeThrow:\s*42/);

    const collectionFer = fs.readFileSync(path.join(tmpDir, 'collection.fer'), 'utf8');
    expect(collectionFer).toMatch(/@boolean\s+collBeforeThrow:\s*true/);
  }, 60_000);

  // Vars set from inside a `tests {}` block reach disk through the same syncVariableUpdates
  // path as the post-response script, but via run-single-request.js:881 instead of :802.
  // Sandbox-agnostic plumbing — runtime equivalence is already covered by the dual-sandbox
  // happy-path tests above; single-sandbox here matches the analogous L577 case.
  it('persists vars set inside a tests {} block', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'tests-block-persist-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: tests-block-persist-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.fer'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-from-tests.fer'),
      `meta {
  name: set-from-tests
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

tests {
  test("sets vars from the tests block", function () {
    fer.setEnvVar("envFromTests", 42);
    fer.setCollectionVar("collFromTests", true);
    expect(true).to.equal(true);
  });
}
`
    );

    const result = await runCli([
      'run', 'set-from-tests.fer', '--env', 'Test', '--sandbox', 'developer', '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.fer'), 'utf8');
    expect(envContent).toMatch(/@number\s+envFromTests:\s*42/);

    const collectionFer = fs.readFileSync(path.join(tmpDir, 'collection.fer'), 'utf8');
    expect(collectionFer).toMatch(/@boolean\s+collFromTests:\s*true/);
  }, 60_000);

  it('persists env/collection vars mutated as a side effect of vars:post-response expressions', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'vars-side-effect-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: vars-side-effect-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.fer'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-from-vars-block.fer'),
      `meta {
  name: set-from-vars-block
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

vars:post-response {
  envSideEffect: fer.setEnvVar("envFromVars", 42)
  collSideEffect: fer.setCollectionVar("collFromVars", true)
}
`
    );

    const result = await runCli([
      'run', 'set-from-vars-block.fer', '--env', 'Test', '--sandbox', 'developer', '--noproxy'
    ], tmpDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.fer'), 'utf8');
    expect(envContent).toMatch(/@number\s+envFromVars:\s*42/);

    const collectionFer = fs.readFileSync(path.join(tmpDir, 'collection.fer'), 'utf8');
    expect(collectionFer).toMatch(/@boolean\s+collFromVars:\s*true/);
  }, 60_000);

  // A throw at the top of `tests {}` (outside any test() callback) is caught by test-runtime,
  // which attaches in-flight env/collection mutations to `error.partialResults`. The CLI
  // catch at run-single-request.js:914 syncs those partials so pre-throw writes still land
  // on disk — same contract as the post-response partial-results case above.
  it('persists vars written before a tests-block script error (partial results)', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'ferret.json'),
      JSON.stringify({ version: '1', name: 'tests-block-partial-results-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'collection.fer'),
      'meta {\n  name: tests-block-partial-results-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'Test.fer'),
      `vars {\n  host: ${baseUrl}\n}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'set-then-throw-in-tests.fer'),
      `meta {
  name: set-then-throw-in-tests
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}

tests {
  fer.setEnvVar("beforeThrow", 42);
  fer.setCollectionVar("collBeforeThrow", true);
  throw new Error("boom");
}
`
    );

    const result = await runCli([
      'run', 'set-then-throw-in-tests.fer', '--env', 'Test', '--sandbox', 'developer', '--noproxy'
    ], tmpDir);

    // Pin failure exit first — otherwise the persistence assertion below could pass for the
    // wrong reason (e.g. the script never ran).
    expect(result.code).not.toBe(0);

    const envContent = fs.readFileSync(path.join(tmpDir, 'environments', 'Test.fer'), 'utf8');
    expect(envContent).toMatch(/@number\s+beforeThrow:\s*42/);

    const collectionFer = fs.readFileSync(path.join(tmpDir, 'collection.fer'), 'utf8');
    expect(collectionFer).toMatch(/@boolean\s+collBeforeThrow:\s*true/);
  }, 60_000);
});
