import { getEnvironmentOptionSelections, getUnsavedEnvironmentOptionNames, requestReferencesVariable } from './index';

const variable = (name, extra = {}) => ({ uid: `u-${name}`, name, value: 'a', enabled: true, type: 'text', secret: false, ...extra });
const nimi = (extra = {}) => variable('nimi', {
  value: 'Lauri',
  dataType: 'options',
  options: [{ key: 'Jape', value: 'Jape1' }, { key: 'Lauri', value: 'Lauri2' }],
  ...extra
});

const makeCollection = ({ saved = [], draft } = {}) => ({
  uid: 'c1',
  activeEnvironmentUid: 'env1',
  environments: [{ uid: 'env1', name: 'test1', variables: saved }],
  environmentsDraft: draft ? { environmentUid: 'env1', variables: draft } : null
});

describe('getEnvironmentOptionSelections', () => {
  it('lists the active environment options with the value each currently resolves to', () => {
    const selections = getEnvironmentOptionSelections(makeCollection({ saved: [variable('host'), nimi()] }));

    expect(selections).toEqual([
      { name: 'nimi', options: nimi().options, defaultValue: 'Lauri2' }
    ]);
  });

  it('is empty without an active environment', () => {
    expect(getEnvironmentOptionSelections({ ...makeCollection({ saved: [nimi()] }), activeEnvironmentUid: null })).toEqual([]);
  });
});

describe('getUnsavedEnvironmentOptionNames', () => {
  it('names options variables that exist only in the unsaved environment draft', () => {
    const collection = makeCollection({ saved: [variable('host')], draft: [variable('host'), nimi()] });

    expect(getUnsavedEnvironmentOptionNames(collection)).toEqual(['nimi']);
  });

  it('ignores options that are already saved, plain variables and disabled ones', () => {
    expect(getUnsavedEnvironmentOptionNames(makeCollection({ saved: [nimi()], draft: [nimi({ value: 'Jape' })] }))).toEqual([]);
    expect(getUnsavedEnvironmentOptionNames(makeCollection({ draft: [variable('host')] }))).toEqual([]);
    expect(getUnsavedEnvironmentOptionNames(makeCollection({ draft: [nimi({ enabled: false })] }))).toEqual([]);
  });

  it('is empty when there is no draft or it belongs to another environment', () => {
    expect(getUnsavedEnvironmentOptionNames(makeCollection({ saved: [nimi()] }))).toEqual([]);
    const other = { ...makeCollection({ draft: [nimi()] }), environmentsDraft: { environmentUid: 'env2', variables: [nimi()] } };
    expect(getUnsavedEnvironmentOptionNames(other)).toEqual([]);
  });
});

describe('requestReferencesVariable', () => {
  const item = (request, draft) => ({ request, ...(draft ? { draft: { request: draft } } : {}) });

  it('finds {{name}} in the URL, params, headers and body', () => {
    expect(requestReferencesVariable(item({ url: 'https://x.test/get?name={{nimi}}' }), 'nimi')).toBe(true);
    expect(requestReferencesVariable(item({ url: 'x', headers: [{ name: 'X', value: '{{nimi}}' }] }), 'nimi')).toBe(true);
    expect(requestReferencesVariable(item({ url: 'x', body: { json: '{"n":"{{nimi}}"}' } }), 'nimi')).toBe(true);
  });

  it('does not match other variables or partial names', () => {
    expect(requestReferencesVariable(item({ url: 'https://x.test/{{nimi2}}' }), 'nimi')).toBe(false);
    expect(requestReferencesVariable(item({ url: 'https://x.test/{{ nimi }}' }), 'nimi')).toBe(false);
    expect(requestReferencesVariable(item({ url: 'https://x.test' }), 'nimi')).toBe(false);
    expect(requestReferencesVariable(undefined, 'nimi')).toBe(false);
  });

  it('reads the unsaved edits of a request, not the saved file', () => {
    expect(requestReferencesVariable(item({ url: 'x' }, { url: '{{nimi}}' }), 'nimi')).toBe(true);
    expect(requestReferencesVariable(item({ url: '{{nimi}}' }, { url: 'x' }), 'nimi')).toBe(false);
  });
});
