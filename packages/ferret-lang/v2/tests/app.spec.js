const ferToJson = require('../src/ferToJson');
const jsonToFer = require('../src/jsonToFer');

describe('app block', () => {
  const appFerEnabled = `app {
  enabled: true
  code: '''
    <div>hello</div>
  '''
}
`;

  const appFerDisabled = `app {
  code: '''
    <div>hello</div>
  '''
}
`;

  it('should parse an app block without enabled as disabled', () => {
    const output = ferToJson(appFerDisabled);
    expect(output.app).toEqual({ code: '<div>hello</div>', enabled: false });
  });

  it('should parse enabled: true', () => {
    const output = ferToJson(appFerEnabled);
    expect(output.app).toEqual({ code: '<div>hello</div>', enabled: true });
  });

  it('should stringify enabled only when enabled', () => {
    expect(jsonToFer({ app: { code: '<div>hello</div>', enabled: true } })).toEqual(appFerEnabled);
    expect(jsonToFer({ app: { code: '<div>hello</div>', enabled: false } })).toEqual(appFerDisabled);
  });

  it('should round-trip the enabled flag', () => {
    expect(ferToJson(jsonToFer({ app: { code: '<x/>', enabled: true } })).app.enabled).toBe(true);
    expect(ferToJson(jsonToFer({ app: { code: '<x/>', enabled: false } })).app.enabled).toBe(false);
  });

  it('should serialize an enabled app block even without code', () => {
    const fer = jsonToFer({ app: { code: null, enabled: true } });
    expect(fer).toEqual('app {\n  enabled: true\n}\n');
    expect(ferToJson(fer).app).toEqual({ code: null, enabled: true });
  });

  it('should omit the app block when disabled and without code', () => {
    expect(jsonToFer({ app: { code: null, enabled: false } })).toEqual('');
  });
});
