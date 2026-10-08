const { getOauth2AdditionalParameters } = require('../utils/oauth2-additional-params');
const { parseFerRequest, parseFerCollection } = require('../index');
const { getFerJsonWithAdditionalParams } = require('./fixtures/oauth2-additional-params');

describe('getOauth2AdditionalParameters', () => {
  it('authorization_code', () => {
    const additionalParameters = getOauth2AdditionalParameters(getFerJsonWithAdditionalParams('authorization_code'));
    expect(additionalParameters.authorization).toHaveLength(4);
    expect(additionalParameters.token).toHaveLength(6);
    expect(additionalParameters.refresh).toHaveLength(6);

    expect(additionalParameters.authorization.map(p => p.sendIn).sort()).toEqual(['headers', 'headers', 'queryparams', 'queryparams']);
    expect(additionalParameters.token.map(p => p.sendIn).sort()).toEqual(['body', 'body', 'headers', 'headers', 'queryparams', 'queryparams']);
    expect(additionalParameters.refresh.map(p => p.sendIn).sort()).toEqual(['body', 'body', 'headers', 'headers', 'queryparams', 'queryparams']);
  });

  it('client_credentials', () => {
    const additionalParameters = getOauth2AdditionalParameters(getFerJsonWithAdditionalParams('client_credentials'));
    expect(additionalParameters.authorization).toBeUndefined();
    expect(additionalParameters.token).toHaveLength(6);
    expect(additionalParameters.refresh).toHaveLength(6);

    expect(additionalParameters.token.map(p => p.sendIn).sort()).toEqual(['body', 'body', 'headers', 'headers', 'queryparams', 'queryparams']);
    expect(additionalParameters.refresh.map(p => p.sendIn).sort()).toEqual(['body', 'body', 'headers', 'headers', 'queryparams', 'queryparams']);
  });

  it('password', () => {
    const additionalParameters = getOauth2AdditionalParameters(getFerJsonWithAdditionalParams('password'));
    expect(additionalParameters.authorization).toBeUndefined();
    expect(additionalParameters.token).toHaveLength(6);
    expect(additionalParameters.refresh).toHaveLength(6);

    expect(additionalParameters.token.map(p => p.sendIn).sort()).toEqual(['body', 'body', 'headers', 'headers', 'queryparams', 'queryparams']);
    expect(additionalParameters.refresh.map(p => p.sendIn).sort()).toEqual(['body', 'body', 'headers', 'headers', 'queryparams', 'queryparams']);
  });

  it('implicit', () => {
    const additionalParameters = getOauth2AdditionalParameters(getFerJsonWithAdditionalParams('implicit'));
    expect(additionalParameters.authorization).toHaveLength(4);
    expect(additionalParameters.token).toBeUndefined();
    expect(additionalParameters.refresh).toBeUndefined();

    expect(additionalParameters.authorization.map(p => p.sendIn).sort()).toEqual(['headers', 'headers', 'queryparams', 'queryparams']);
  });
});