import type { Item as FerretItem } from '@ferret-app/schema-types/collection/item';
import type { ScriptFile } from '@opencollection/types/collection/item';
import { stringifyYml } from '../utils';

const stringifyScript = (item: FerretItem): string => {
  try {
    const ocScript: ScriptFile = {
      type: 'script'
    };

    if (item.fileContent?.trim().length) {
      ocScript.script = item.fileContent;
    }

    return stringifyYml(ocScript);
  } catch (error) {
    console.error('Error stringifying script:', error);
    throw error;
  }
};

export default stringifyScript;
