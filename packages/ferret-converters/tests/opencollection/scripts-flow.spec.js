import { describe, it, expect } from '@jest/globals';
import { ferretToOpenCollection } from '../../src/opencollection/ferret-to-opencollection';
import { openCollectionToFerret } from '../../src/opencollection/opencollection-to-ferret';

describe('ferretToOpenCollection (export): scripts.flow', () => {
  it('writes flow: sequential under extensions.ferret.scripts', () => {
    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: { scripts: { flow: 'sequential' } },
      items: []
    });
    expect(oc.extensions?.ferret?.scripts?.flow).toBe('sequential');
  });

  it('writes flow: sandwich under extensions.ferret.scripts', () => {
    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: { scripts: { flow: 'sandwich' } },
      items: []
    });
    expect(oc.extensions?.ferret?.scripts?.flow).toBe('sandwich');
  });

  it('writes nothing when the collection has no flow', () => {
    const oc = ferretToOpenCollection({ name: 'API', ferretConfig: {}, items: [] });
    expect(oc.extensions?.ferret?.scripts).toBeUndefined();
  });

  it('drops an unrecognized flow value', () => {
    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: { scripts: { flow: 'parallel' } },
      items: []
    });
    expect(oc.extensions?.ferret?.scripts).toBeUndefined();
  });
});

describe('openCollectionToFerret (import): scripts.flow', () => {
  it('reads flow: sequential from extensions.ferret.scripts', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { ferret: { scripts: { flow: 'sequential' } } }
    });
    expect(ferretConfig.scripts?.flow).toBe('sequential');
  });

  it('ignores an unrecognized flow value', () => {
    const { ferretConfig } = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'API' },
      extensions: { ferret: { scripts: { flow: 'parallel' } } }
    });
    expect(ferretConfig.scripts).toBeUndefined();
  });
});

describe('scripts.flow: export then import keeps it the same', () => {
  it('preserves flow across a round trip', () => {
    const oc = ferretToOpenCollection({
      name: 'API',
      ferretConfig: { scripts: { flow: 'sequential' } },
      items: []
    });
    const { ferretConfig } = openCollectionToFerret(oc);
    expect(ferretConfig.scripts?.flow).toBe('sequential');
  });
});
