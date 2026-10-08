import { describe, it, expect } from '@jest/globals';
import { ferretToOpenCollection } from '../../src/opencollection/ferret-to-opencollection';
import { openCollectionToFerret } from '../../src/opencollection/opencollection-to-ferret';

const makeFerretCollection = (presets) => ({
  name: 'My API',
  ferretConfig: { name: 'My API', type: 'collection', ignore: [], presets },
  items: [],
  environments: [],
  root: {}
});

describe('presets.defaultEnvironment mapping between ferret and opencollection', () => {
  it('maps ferretConfig.presets.defaultEnvironment to extensions.ferret.presets.defaultEnvironment', () => {
    const oc = ferretToOpenCollection(
      makeFerretCollection({ requestType: 'http', requestUrl: 'https://example.com', defaultEnvironment: 'prod' })
    );

    expect(oc.extensions.ferret.presets.defaultEnvironment).toBe('prod');
  });

  it('reads defaultEnvironment back from opencollection into ferretConfig.presets', () => {
    const ferret = openCollectionToFerret({
      opencollection: '1.0.0',
      info: { name: 'My API' },
      items: [],
      extensions: { ferret: { presets: { defaultEnvironment: 'staging' } } }
    });

    expect(ferret.ferretConfig.presets.defaultEnvironment).toBe('staging');
  });

  it('round-trips defaultEnvironment through ferret to opencollection and back', () => {
    const oc = ferretToOpenCollection(makeFerretCollection({ defaultEnvironment: 'prod' }));
    const back = openCollectionToFerret(oc);

    expect(back.ferretConfig.presets.defaultEnvironment).toBe('prod');
  });

  it('does not add a presets block when defaultEnvironment is absent', () => {
    const oc = ferretToOpenCollection(makeFerretCollection(undefined));

    expect(oc.extensions?.ferret?.presets).toBeUndefined();
  });
});
