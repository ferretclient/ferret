import { describe, it, expect } from '@jest/globals';
import { ferretToOpenCollection } from '../../src/opencollection/ferret-to-opencollection';
import { openCollectionToFerret } from '../../src/opencollection/opencollection-to-ferret';

describe('openCollectionToFerret (import): keeps the collection version', () => {
  it('keeps the version as-is when importing', () => {
    const { ferretConfig } = openCollectionToFerret({ opencollection: '1.0.0', info: { name: 'API', version: 'v2.3.4' } });
    expect(ferretConfig.version).toBe('v2.3.4');
  });

  it('turns a number version into text (2 becomes "2")', () => {
    const { ferretConfig } = openCollectionToFerret({ opencollection: '1.0.0', info: { name: 'API', version: 2 } });
    expect(ferretConfig.version).toBe('2');
  });

  it('has no version when the imported file has none', () => {
    const { ferretConfig } = openCollectionToFerret({ opencollection: '1.0.0', info: { name: 'API' } });
    expect(ferretConfig.version).toBeUndefined();
  });
});

describe('ferretToOpenCollection (export): writes the collection version', () => {
  it('uses the agnostic version for a fer collection', () => {
    const oc = ferretToOpenCollection({ name: 'API', ferretConfig: { version: 'v2.3.4' }, items: [] });
    expect(oc.info.version).toBe('v2.3.4');
  });

  it('uses the agnostic version for a yml collection', () => {
    const oc = ferretToOpenCollection({ name: 'API', ferretConfig: { opencollection: '1.0.0', version: 'v9.9' }, items: [] });
    expect(oc.info.version).toBe('v9.9');
  });

  it('writes no version when the collection has none', () => {
    const oc = ferretToOpenCollection({ name: 'API', ferretConfig: {}, items: [] });
    expect(oc.info.version).toBeUndefined();
  });
});

describe('collection version: export then import keeps it the same', () => {
  it('keeps the same version after exporting and importing again', () => {
    const oc = ferretToOpenCollection({ name: 'API', ferretConfig: { version: '1.2.3-beta' }, items: [] });
    const { ferretConfig } = openCollectionToFerret(oc);
    expect(ferretConfig.version).toBe('1.2.3-beta');
  });
});
