import { describe, it, expect } from '@jest/globals';
import { ferretToOpenCollection } from '../../src/opencollection/ferret-to-opencollection';
import { openCollectionToFerret } from '../../src/opencollection/opencollection-to-ferret';

const syncConfig = {
  sourceUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
  groupBy: 'tags',
  lastSyncDate: '2026-08-13T10:00:00.000Z',
  specHash: 'd41d8cd98f00b204e9800998ecf8427e',
  autoCheck: false,
  autoCheckInterval: 15
};

describe('ferretToOpenCollection (export): openapi sync config', () => {
  it('writes the sync config under extensions.ferret.openapi', () => {
    const oc = ferretToOpenCollection({
      name: 'Petstore',
      ferretConfig: { openapi: [syncConfig] },
      items: []
    });
    expect(oc.extensions?.ferret?.openapi).toEqual([syncConfig]);
  });

  it('writes nothing when the collection has no sync config', () => {
    const withoutKey = ferretToOpenCollection({ name: 'API', ferretConfig: {}, items: [] });
    const withEmptyList = ferretToOpenCollection({ name: 'API', ferretConfig: { openapi: [] }, items: [] });
    expect(withoutKey.extensions?.ferret?.openapi).toBeUndefined();
    expect(withEmptyList.extensions?.ferret?.openapi).toBeUndefined();
  });

  it('skips malformed entries and keeps the usable ones', () => {
    const oc = ferretToOpenCollection({
      name: 'Petstore',
      ferretConfig: { openapi: [null, 'https://example.com/openapi.json', syncConfig] },
      items: []
    });
    expect(oc.extensions.ferret.openapi).toEqual([syncConfig]);
  });

  it('omits sync metadata that is absent and defaults the auto-check fields', () => {
    const oc = ferretToOpenCollection({
      name: 'Petstore',
      ferretConfig: { openapi: [{ sourceUrl: 'https://example.com/openapi.json', groupBy: 'path' }] },
      items: []
    });
    expect(oc.extensions.ferret.openapi).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'path',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });
});

describe('openCollectionToFerret (import): openapi sync config', () => {
  it('reads the sync config back, defaulting the auto-check fields', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'Petstore' },
      extensions: { ferret: { openapi: [{ sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags' }] } }
    });
    expect(ferretConfig.openapi).toEqual([
      {
        sourceUrl: 'https://example.com/openapi.json',
        groupBy: 'tags',
        autoCheck: true,
        autoCheckInterval: 5
      }
    ]);
  });

  it('skips malformed entries and keeps the usable ones', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'Petstore' },
      extensions: { ferret: { openapi: [null, 'https://example.com/openapi.json', syncConfig] } }
    });
    expect(ferretConfig.openapi).toEqual([syncConfig]);
  });

  it('leaves the collection unlinked when the file carries no sync config', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'API' }
    });
    expect(ferretConfig.openapi).toBeUndefined();
  });
});

describe('openapi sync config: export then import keeps it the same', () => {
  it('preserves the sync config across a round trip', () => {
    const oc = ferretToOpenCollection({
      name: 'Petstore',
      ferretConfig: { openapi: [syncConfig] },
      items: []
    });
    const { ferretConfig } = openCollectionToFerret(oc);
    expect(ferretConfig.openapi).toEqual([syncConfig]);
  });
});
