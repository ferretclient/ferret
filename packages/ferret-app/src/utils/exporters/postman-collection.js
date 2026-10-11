import { ferretToPostman } from '@ferretclient/converters';
import { filterTransientItems } from 'utils/collections';

export const exportPostmanCollection = (collection, { preserveScripts = false } = {}) => {
  // Filter out transient items before export
  collection.items = filterTransientItems(collection.items);

  const collectionToExport = ferretToPostman(collection, { preserveScripts });

  return JSON.stringify(collectionToExport, null, 2);
};

export default exportPostmanCollection;
