import type { Item as FerretItem } from '@ferret-app/schema-types/collection/item';
import { uuid } from '../../../utils';

export interface AppFile {
  info: {
    name?: string;
    type: 'app';
    seq?: number;
    tags?: string[];
  };
  code?: string;
}

const parseApp = (ocApp: AppFile): FerretItem => {
  const info = ocApp.info || ({} as AppFile['info']);

  const ferretItem: FerretItem = {
    uid: uuid(),
    type: 'app',
    seq: typeof info.seq === 'number' ? info.seq : 1,
    name: info.name || 'App',
    tags: Array.isArray(info.tags) ? info.tags : [],
    request: null,
    settings: null,
    app: { code: ocApp.code || '' },
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return ferretItem;
};

export default parseApp;
