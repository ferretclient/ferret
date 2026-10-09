import { toOpenCollectionVariables, toFerretVariables } from './variables';

describe('toOpenCollectionVariables', () => {
  it('returns undefined for null / empty input', () => {
    expect(toOpenCollectionVariables(null)).toBeUndefined();
    expect(toOpenCollectionVariables(undefined)).toBeUndefined();
    expect(toOpenCollectionVariables([])).toBeUndefined();
    expect(toOpenCollectionVariables({ req: [], res: [] })).toBeUndefined();
  });

  it('serializes plain string variables as a raw string value', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', enabled: true } as any
    ]);

    expect(out).toEqual([{ name: 'apiKey', value: 'abc' }]);
  });

  it('serializes typed variables as a {type, data} struct', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'port', value: 3000, enabled: true, dataType: 'number' } as any,
      { uid: 'u2', name: 'flag', value: true, enabled: true, dataType: 'boolean' } as any,
      { uid: 'u3', name: 'config', value: { a: 1 }, enabled: true, dataType: 'object' } as any
    ]);

    expect(out).toEqual([
      { name: 'port', value: { type: 'number', data: '3000' } },
      { name: 'flag', value: { type: 'boolean', data: 'true' } },
      { name: 'config', value: { type: 'object', data: '{\n  "a": 1\n}' } }
    ]);
  });

  it('does not emit a typed struct for the string default dataType', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', enabled: true, dataType: 'string' } as any
    ]);

    expect(out).toEqual([{ name: 'apiKey', value: 'abc' }]);
  });

  it('marks disabled variables and preserves description', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', enabled: false, description: 'auth key' } as any
    ]);

    expect(out).toEqual([
      { name: 'apiKey', value: 'abc', description: 'auth key', disabled: true }
    ]);
  });

  it('accepts the folder { req, res } shape and only emits req vars', () => {
    const out = toOpenCollectionVariables({
      req: [{ uid: 'u1', name: 'a', value: '1', enabled: true } as any],
      res: [{ uid: 'u2', name: 'b', value: '2', enabled: true } as any]
    });

    expect(out).toEqual([{ name: 'a', value: '1' }]);
  });
});

describe('toFerretVariables', () => {
  it('returns empty req/res for null / empty input', () => {
    expect(toFerretVariables(null)).toEqual({ req: [], res: [] });
    expect(toFerretVariables(undefined)).toEqual({ req: [], res: [] });
    expect(toFerretVariables([])).toEqual({ req: [], res: [] });
  });

  it('parses plain string variables into Ferret req vars', () => {
    const { req } = toFerretVariables([
      { name: 'apiKey', value: 'abc' } as any
    ]);

    expect(req).toHaveLength(1);
    const v = req![0];
    expect(v).toMatchObject({
      name: 'apiKey',
      value: 'abc',
      enabled: true,
      local: false
    });
    expect(v.uid).toEqual(expect.any(String));
    expect(v.dataType).toBeUndefined();
  });

  it('parses typed-value variables into typed Ferret variables', () => {
    const { req } = toFerretVariables([
      { name: 'port', value: { type: 'number', data: '3000' } } as any,
      { name: 'flag', value: { type: 'boolean', data: 'true' } } as any,
      { name: 'config', value: { type: 'object', data: '{"a":1}' } } as any
    ]);

    expect(req![0]).toMatchObject({ name: 'port', value: 3000, dataType: 'number' });
    expect(req![1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean' });
    expect(req![2]).toMatchObject({ name: 'config', value: { a: 1 }, dataType: 'object' });
  });

  it('falls back to the raw string when typed data fails to coerce', () => {
    const { req } = toFerretVariables([
      { name: 'port', value: { type: 'number', data: 'not-a-number' } } as any,
      { name: 'flag', value: { type: 'boolean', data: 'not-a-boolean' } } as any,
      { name: 'config', value: { type: 'object', data: 'not-a-object' } } as any
    ]);

    expect(req![0]).toMatchObject({ name: 'port', value: 'not-a-number', dataType: 'number' });
    expect(typeof req![0].value).toBe('string');
    expect(req![1]).toMatchObject({ name: 'flag', value: 'not-a-boolean', dataType: 'boolean' });
    expect(typeof req![1].value).toBe('string');
    expect(req![2]).toMatchObject({ name: 'config', value: 'not-a-object', dataType: 'object' });
    expect(typeof req![2].value).toBe('string');
  });

  it('respects the disabled flag', () => {
    const { req } = toFerretVariables([
      { name: 'a', value: '1', disabled: true } as any
    ]);

    expect(req![0].enabled).toBe(false);
  });

  it('extracts description.content when description is a structured object', () => {
    const { req } = toFerretVariables([
      { name: 'a', value: '1', description: { content: 'note' } } as any
    ]);

    expect(req![0].description).toBe('note');
  });
});

describe('options variables on a request, folder or collection', () => {
  const company = {
    uid: 'u1',
    name: 'company',
    value: 'Company1',
    enabled: true,
    dataType: 'options',
    options: [
      { key: 'Company1', value: '12345' },
      { key: 'Company2', value: '43214' }
    ]
  } as any;

  it('writes the default key as a plain value next to an options list', () => {
    expect(toOpenCollectionVariables([company])).toEqual([
      {
        name: 'company',
        value: 'Company1',
        options: [
          { key: 'Company1', value: '12345' },
          { key: 'Company2', value: '43214' }
        ]
      }
    ]);
  });

  it('reads the options list back as an options variable', () => {
    const { req } = toFerretVariables(toOpenCollectionVariables([company]));

    expect(req[0]).toMatchObject({
      name: 'company',
      value: 'Company1',
      dataType: 'options',
      options: [
        { key: 'Company1', value: '12345' },
        { key: 'Company2', value: '43214' }
      ]
    });
  });

  it('keeps option values as strings and a disabled options variable disabled', () => {
    const [out] = toOpenCollectionVariables([{ ...company, enabled: false, options: [{ key: 'A', value: '1' }] }]) as any[];
    expect(out.disabled).toBe(true);

    const { req } = toFerretVariables([{ name: 'n', value: 'A', options: [{ key: 'A', value: 1 }] } as any]);
    expect(req[0].options).toEqual([{ key: 'A', value: '1' }]);
  });

  it('leaves variables without options untouched', () => {
    const { req } = toFerretVariables(toOpenCollectionVariables([{ uid: 'u2', name: 'plain', value: 'x', enabled: true } as any]));

    expect(req[0].dataType).toBeUndefined();
    expect(req[0].options).toBeUndefined();
  });
});
