import { describe, it, expect } from '@jest/globals';
import postmanToFerretEnvironment from '../../src/postman/postman-env-to-ferret-env';

describe('postmanToFerretEnvironment Function', () => {
  it('should correctly import a valid Postman environment file', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          key: 'var1',
          value: 'value1',
          enabled: true,
          type: 'text'
        },
        {
          key: 'var2',
          value: 'value2',
          enabled: false,
          type: 'secret'
        }
      ]
    };

    const ferretEnvironment = await postmanToFerretEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: 'var1',
          value: 'value1',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'var2',
          value: 'value2',
          enabled: false,
          secret: true,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(ferretEnvironment).toEqual(expectedEnvironment);
  });

  it('should handle falsy values in environment variables', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          enabled: true,
          type: 'text'
        },
        {
          value: '',
          enabled: true,
          type: 'text'
        },
        {
          key: '',
          enabled: true,
          type: 'text'
        },
        {
          key: '',
          value: '',
          enabled: true,
          type: 'text'
        }
      ]
    };

    const ferretEnvironment = await postmanToFerretEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: '',
          value: '',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: '',
          value: '',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: '',
          value: '',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(ferretEnvironment).toEqual(expectedEnvironment);
  });

  it('should default enabled to true when Postman omits or nulls it', async () => {
    const postmanEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          key: 'noEnabled',
          value: 'value1',
          type: 'default'
        },
        {
          key: 'nullEnabled',
          value: 'value2',
          enabled: null,
          type: 'default'
        }
      ]
    };

    const ferretEnvironment = await postmanToFerretEnvironment(postmanEnvironment);

    const expectedEnvironment = {
      name: 'My Environment',
      variables: [
        {
          name: 'noEnabled',
          value: 'value1',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        },
        {
          name: 'nullEnabled',
          value: 'value2',
          enabled: true,
          secret: false,
          type: 'text',
          uid: 'mockeduuidvalue123456'
        }
      ]
    };

    expect(ferretEnvironment).toEqual(expectedEnvironment);
  });

  it.skip('should throw Error when JSON parsing fails', async () => {
    const invalidFerretEnvironment = {
      id: 'some-id',
      name: 'My Environment',
      values: [
        {
          key: 'var1',
          value: 'value1',
          enabled: true,
          type: 'text'
        }
      ]
    };

    await expect(postmanToFerretEnvironment(invalidFerretEnvironment)).rejects.toThrow(Error);
    await expect(postmanToFerretEnvironment(invalidFerretEnvironment)).rejects.toThrow(
      'Unable to parse the postman environment json file'
    );
  });

  it('should handle empty variables', async () => {
    const collectionWithEmptyVars = {
      name: 'My Environment',
      values: []
    };

    const ferretCollection = await postmanToFerretEnvironment(collectionWithEmptyVars);
    expect(ferretCollection.variables).toEqual([]);
  });

  it('should handle undefined variables', async () => {
    const collectionWithUndefinedVars = {
      name: 'My Environment'
    };

    const ferretCollection = await postmanToFerretEnvironment(collectionWithUndefinedVars);
    expect(ferretCollection.variables).toEqual([]);
  });
});
