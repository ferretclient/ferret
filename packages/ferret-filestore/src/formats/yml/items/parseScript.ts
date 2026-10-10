import type { Item as FerretItem } from '@ferret-app/schema-types/collection/item';
import type { ScriptFile } from '@opencollection/types/collection/item';
import { uuid } from '../../../utils';

const parseScript = (ocScript: ScriptFile): FerretItem => {
  const ferretItem: FerretItem = {
    uid: uuid(),
    type: 'js',
    seq: 1,
    name: 'Script',
    tags: [],
    request: null,
    settings: null,
    fileContent: ocScript.script || '',
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return ferretItem;
};

export default parseScript;
