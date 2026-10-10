import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import { ferretToOpenCollection } from '@ferret-app/converters';
import { sanitizeName } from 'utils/common/regex';
import { filterTransientItems } from 'utils/collections';

export const exportCollection = (collection, version) => {
  // Filter out transient items before export
  collection.items = filterTransientItems(collection.items);

  const openCollection = ferretToOpenCollection(collection);

  if (!openCollection.extensions) {
    openCollection.extensions = {};
  }
  if (!openCollection.extensions.ferret) {
    openCollection.extensions.ferret = {};
  }
  openCollection.extensions.ferret.exportedAt = new Date().toISOString();
  openCollection.extensions.ferret.exportedUsing = version ? `Ferret/${version}` : 'Ferret';

  const yamlContent = jsyaml.dump(openCollection, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });

  const sanitizedName = sanitizeName(collection.name);
  const fileName = `${sanitizedName}.yml`;
  const fileBlob = new Blob([yamlContent], { type: 'application/x-yaml' });

  FileSaver.saveAs(fileBlob, fileName);
};

export default exportCollection;
