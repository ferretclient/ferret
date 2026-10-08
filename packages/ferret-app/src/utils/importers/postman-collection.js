import fileDialog from 'file-dialog';
import { FerretError } from 'utils/common/error';
import { safeParseJSON } from 'utils/common/index';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => resolve(safeParseJSON(e.target.result));
    fileReader.onerror = (err) => reject(err);
    fileReader.readAsText(files[0]);
  });
};

const postmanToFerret = (collection, options = {}) => {
  return new Promise((resolve, reject) => {
    window.ipcRenderer.invoke('renderer:convert-postman-to-ferret', collection, options)
      .then((result) => resolve(result))
      .catch((err) => {
        console.error('Error converting Postman to Ferret via Electron:', err);
        reject(new FerretError('Conversion failed'));
      });
  });
};

const isPostmanCollection = (data) => {
  // Newer Postman exports wrap the collection in a { collection: { ... } } envelope
  const info = data.info || data?.collection?.info;
  if (!info || typeof info !== 'object') {
    return false;
  }

  const schema = info.schema;
  if (typeof schema !== 'string') {
    return false;
  }

  // Only accept supported Postman v2.0 and v2.1 schemas
  const supportedSchemas = [
    'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
    'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    'https://schema.postman.com/json/collection/v2.0.0/collection.json',
    'https://schema.postman.com/json/collection/v2.1.0/collection.json'
  ];

  return supportedSchemas.includes(schema);
};

export { postmanToFerret, readFile, isPostmanCollection };
