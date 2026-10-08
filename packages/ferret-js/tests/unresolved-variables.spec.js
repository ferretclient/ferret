const { describe, it, expect, beforeAll } = require('@jest/globals');
const Fer = require('../src/fer');
const ScriptRuntime = require('../src/runtime/script-runtime');
const AssertRuntime = require('../src/runtime/assert-runtime');
const { loader: quickJsLoader } = require('../src/sandbox/quickjs');
const { trackUnresolvedVariables, getUnresolvedVariableCollector } = require('../src/unresolved-variables');

const createFer = (unresolvedVariables) => new Fer({
  runtime: 'nodevm',
  envVariables: { present: 'value', falsy: '', baseUrl: '{{host}}/api' },
  runtimeVariables: { zero: 0 },
  collectionVariables: {},
  folderVariables: {},
  requestVariables: {},
  globalEnvironmentVariables: {},
  oauth2CredentialVariables: {},
  processEnvVars: { EMPTY: '' },
  onUnresolved: unresolvedVariables && ((name) => unresolvedVariables.add(name))
});

describe('unresolved variables', () => {
  describe('trackUnresolvedVariables', () => {
    it('shares the set of the top-level request with every nested child request', () => {
      const parentRequest = {};
      const childRequest = {};
      const grandchildRequest = {};
      const parentUnresolvedVariables = trackUnresolvedVariables(parentRequest);
      const childUnresolvedVariables = trackUnresolvedVariables(childRequest, parentUnresolvedVariables);
      trackUnresolvedVariables(grandchildRequest, childUnresolvedVariables);

      getUnresolvedVariableCollector(childRequest)('childHost');
      getUnresolvedVariableCollector(grandchildRequest)('grandchildToken');

      expect([...parentUnresolvedVariables]).toEqual(['childHost', 'grandchildToken']);
    });
  });

  describe('Fer getters', () => {
    it('record a key that is missing from its scope', () => {
      const unresolvedVariables = new Set();
      const fer = createFer(unresolvedVariables);

      fer.getEnvVar('missingEnv');
      fer.getVar('missingVar');
      fer.getCollectionVar('missingCollection');
      fer.getFolderVar('missingFolder');
      fer.getRequestVar('missingRequest');
      fer.getGlobalEnvVar('missingGlobal');
      fer.getOauth2CredentialVar('missingOauth2');
      fer.getProcessEnv('MISSING');

      expect([...unresolvedVariables]).toEqual([
        'missingEnv',
        'missingVar',
        'missingCollection',
        'missingFolder',
        'missingRequest',
        'missingGlobal',
        'missingOauth2',
        'process.env.MISSING'
      ]);
    });

    it('do not record a present key whose value is falsy', () => {
      const unresolvedVariables = new Set();
      const fer = createFer(unresolvedVariables);

      fer.getEnvVar('falsy');
      fer.getVar('zero');
      fer.getProcessEnv('EMPTY');

      expect(unresolvedVariables.size).toBe(0);
    });

    it('record a missing placeholder inside a value that was read, not the key that was read', () => {
      const unresolvedVariables = new Set();
      const fer = createFer(unresolvedVariables);

      expect(fer.getEnvVar('baseUrl')).toBe('{{host}}/api');
      expect([...unresolvedVariables]).toEqual(['host']);
    });

    it('record a placeholder that fer.interpolate cannot resolve', () => {
      const unresolvedVariables = new Set();
      const fer = createFer(unresolvedVariables);

      expect(fer.interpolate('{{present}}-{{absent}}')).toBe('value-{{absent}}');
      expect([...unresolvedVariables]).toEqual(['absent']);
    });

    it('work without a collector', () => {
      const fer = createFer();

      expect(fer.getVar('missingVar')).toBeUndefined();
      expect(fer.interpolate('{{absent}}')).toBe('{{absent}}');
    });
  });

  describe.each(['nodevm', 'quickjs'])('script runtime on %s', (runtime) => {
    beforeAll(async () => {
      if (runtime === 'quickjs') {
        await quickJsLoader();
      }
    });

    it('records script reads of missing variables into the request collector', async () => {
      const request = { method: 'GET', url: 'http://localhost', headers: {} };
      const unresolvedVariables = trackUnresolvedVariables(request);
      const script = `
        fer.getVar('token');
        fer.getEnvVar('host');
        fer.getEnvVar('present');
      `;

      const onConsoleLog = () => {};
      await new ScriptRuntime({ runtime }).runRequestScript(script, request, { present: 'value' }, {}, '.', onConsoleLog, {});

      expect([...unresolvedVariables]).toEqual(['token', 'host']);
    });

    it('does not expose the unresolved variables to the script on fer or req', async () => {
      const request = { method: 'GET', url: 'http://localhost', headers: {} };
      trackUnresolvedVariables(request);
      const script = `
        fer.setVar('visible', JSON.stringify([
          Object.keys(fer).filter((key) => key.toLowerCase().includes('unresolved')),
          Object.keys(req.req || {}).filter((key) => key.toLowerCase().includes('unresolved'))
        ]));
      `;

      const onConsoleLog = () => {};
      const result = await new ScriptRuntime({ runtime }).runRequestScript(script, request, {}, {}, '.', onConsoleLog, {});

      expect(result.runtimeVariables.visible).toBe('[[],[]]');
    });
  });

  describe('assertions', () => {
    it('record an undefined variable on the right-hand side', () => {
      const request = { method: 'GET', url: 'http://localhost', headers: {} };
      const unresolvedVariables = trackUnresolvedVariables(request);
      const response = { status: 200, statusText: 'OK', data: {}, headers: {} };

      new AssertRuntime({ runtime: 'nodevm' }).runAssertions(
        [{ name: 'res.status', value: 'eq {{expectedStatus}}', enabled: true }],
        request,
        response,
        {},
        {},
        {}
      );

      expect([...unresolvedVariables]).toEqual(['expectedStatus']);
    });
  });
});
