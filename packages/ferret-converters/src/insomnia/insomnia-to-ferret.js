import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';
import { buildV5Environments, buildV4Environments } from './env-utils';

const parseGraphQL = (text) => {
  try {
    const graphql = JSON.parse(text);

    return {
      query: normalizeVariables(graphql.query),
      variables: JSON.stringify(graphql.variables, null, 2)
    };
  } catch (e) {
    return {
      query: '',
      variables: ''
    };
  }
};

const addSuffixToDuplicateName = (item, index, allItems) => {
  // Check if the request name already exist and if so add a number suffix
  const nameSuffix = allItems.reduce((nameSuffix, otherItem, otherIndex) => {
    if (otherItem.name === item.name && otherIndex < index) {
      nameSuffix++;
    }
    return nameSuffix;
  }, 0);
  return nameSuffix !== 0 ? `${item.name}_${nameSuffix}` : item.name;
};

const regexVariable = new RegExp('{{.*?}}', 'g');

const normalizeVariables = (value) => {
  value = String(value ?? '');
  const variables = value.match(regexVariable) || [];
  each(variables, (variable) => {
    value = value.replace(variable, variable.replace('_.', '').replaceAll(' ', ''));
  });
  return value;
};

const transformInsomniaRequestItem = (request, index, allRequests) => {
  const name = addSuffixToDuplicateName(request, index, allRequests);

  const ferretRequestItem = {
    uid: uuid(),
    name,
    type: 'http-request',
    request: {
      url: normalizeVariables(request.url),
      method: request.method,
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null
      },
      headers: [],
      params: [],
      body: {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: []
      }
    }
  };

  each(request.headers, (header) => {
    ferretRequestItem.request.headers.push({
      uid: uuid(),
      name: header.name,
      value: normalizeVariables(header.value),
      description: header.description,
      enabled: !header.disabled
    });
  });

  each(request.parameters, (param) => {
    ferretRequestItem.request.params.push({
      uid: uuid(),
      name: param.name,
      value: normalizeVariables(param.value),
      description: param.description,
      type: 'query',
      enabled: !param.disabled
    });
  });

  each(request.pathParameters, (param) => {
    ferretRequestItem.request.params.push({
      uid: uuid(),
      name: param.name,
      value: normalizeVariables(param.value),
      description: '',
      type: 'path',
      enabled: true
    });
  });

  const authType = get(request, 'authentication.type', '');

  if (authType === 'basic') {
    ferretRequestItem.request.auth.mode = 'basic';
    ferretRequestItem.request.auth.basic = {
      username: normalizeVariables(get(request, 'authentication.username', '')),
      password: normalizeVariables(get(request, 'authentication.password', ''))
    };
  } else if (authType === 'bearer') {
    ferretRequestItem.request.auth.mode = 'bearer';
    ferretRequestItem.request.auth.bearer = {
      token: normalizeVariables(get(request, 'authentication.token', ''))
    };
  }

  const bodyMimeType = get(request, 'body.mimeType');
  const mimeType = (bodyMimeType || '').split(';')[0];

  if (mimeType === 'application/json') {
    ferretRequestItem.request.body.mode = 'json';
    ferretRequestItem.request.body.json = normalizeVariables(request.body.text);
  } else if (mimeType === 'application/x-www-form-urlencoded') {
    ferretRequestItem.request.body.mode = 'formUrlEncoded';
    each(request.body.params, (param) => {
      ferretRequestItem.request.body.formUrlEncoded.push({
        uid: uuid(),
        name: param.name,
        value: normalizeVariables(param.value),
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'multipart/form-data') {
    ferretRequestItem.request.body.mode = 'multipartForm';
    each(request.body.params, (param) => {
      ferretRequestItem.request.body.multipartForm.push({
        uid: uuid(),
        type: 'text',
        name: param.name,
        value: normalizeVariables(param.value),
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'text/plain' || (bodyMimeType === '' && request.body?.text)) {
    ferretRequestItem.request.body.mode = 'text';
    ferretRequestItem.request.body.text = normalizeVariables(request.body.text);
  } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
    ferretRequestItem.request.body.mode = 'xml';
    ferretRequestItem.request.body.xml = normalizeVariables(request.body.text);
  } else if (mimeType === 'application/graphql') {
    ferretRequestItem.type = 'graphql-request';
    ferretRequestItem.request.body.mode = 'graphql';
    ferretRequestItem.request.body.graphql = parseGraphQL(request.body.text);
  }

  const settings = {
    encodeUrl: request.settings?.encodeUrl !== false && request.settingEncodeUrl !== false, // handles v4 and v5 import
    forwardAuthorizationHeader: false
  };

  ferretRequestItem.settings = settings;

  return ferretRequestItem;
};

const isInsomniaV5Export = (data) => {
  // V5 format has a type property at the root level
  if (data.type && data.type.startsWith('collection.insomnia.rest/5')) {
    return true;
  }
  return false;
};

const parseInsomniaV5Collection = (data) => {
  const ferretCollection = {
    name: data.name || 'Untitled Collection',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };

  try {
    // Parse the collection items
    const parseCollectionItems = (items, allItems = []) => {
      if (!Array.isArray(items)) {
        throw new Error('Invalid items format: expected array');
      }

      return items.map((item, index) => {
        if (!item) {
          return null;
        }

        // In v5, requests might be defined with method property or meta.type
        if (item.method && item.url) {
          const request = {
            _id: item.meta?.id || uuid(),
            name: item.name || 'Untitled Request',
            url: item.url || '',
            method: item.method || '',
            headers: item.headers || [],
            parameters: item.parameters || [],
            pathParameters: item.pathParameters || [],
            authentication: item.authentication || {},
            body: item.body || {},
            settings: item.settings || {}
          };
          return transformInsomniaRequestItem(request, index, allItems);
        } else if (item.children && Array.isArray(item.children)) {
          // Process folder
          return {
            uid: uuid(),
            name: item.name || 'Untitled Folder',
            type: 'folder',
            items: parseCollectionItems(item.children, item.children)
          };
        }
        return null;
      }).filter(Boolean);
    };

    if (data.collection && Array.isArray(data.collection)) {
      ferretCollection.items = parseCollectionItems(data.collection, data.collection);
    }

    // Parse environments if available
    if (data.environments) {
      ferretCollection.environments = buildV5Environments(data.environments);
    }

    return ferretCollection;
  } catch (err) {
    console.error('Error parsing collection:', err);
    throw new Error('An error occurred while parsing the Insomnia v5 collection: ' + err.message);
  }
};

const parseInsomniaCollection = (data) => {
  const ferretCollection = {
    name: '',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };

  try {
    const insomniaResources = get(data, 'resources', []);
    const insomniaCollection = insomniaResources.find((resource) => resource._type === 'workspace');

    if (!insomniaCollection) {
      throw new Error('Collection not found inside Insomnia export');
    }

    ferretCollection.name = insomniaCollection.name;

    const requestsAndFolders
      = insomniaResources.filter((resource) => resource._type === 'request' || resource._type === 'request_group')
        || [];

    function createFolderStructure(resources, parentId = null) {
      const requestGroups
        = resources.filter((resource) => resource._type === 'request_group' && resource.parentId === parentId) || [];
      const requests = resources.filter((resource) => resource._type === 'request' && resource.parentId === parentId);

      const folders = requestGroups.map((folder, index, allFolder) => {
        const name = addSuffixToDuplicateName(folder, index, allFolder);
        const requests = resources.filter(
          (resource) => resource._type === 'request' && resource.parentId === folder._id
        );

        return {
          uid: uuid(),
          name,
          type: 'folder',
          items: createFolderStructure(resources, folder._id).concat(
            requests.filter((r) => r.parentId === folder._id).map(transformInsomniaRequestItem)
          )
        };
      });

      return folders.concat(requests.map(transformInsomniaRequestItem));
    }

    ferretCollection.items = createFolderStructure(requestsAndFolders, insomniaCollection._id);

    // Build environments from resources
    ferretCollection.environments = buildV4Environments(insomniaResources, insomniaCollection._id);
    return ferretCollection;
  } catch (err) {
    console.error('Error parsing collection:', err);
    throw new Error('An error occurred while parsing the Insomnia collection: ' + err.message);
  }
};

export const insomniaToFerret = (insomniaCollection) => {
  try {
    if (typeof insomniaCollection !== 'object') {
      insomniaCollection = jsyaml.load(insomniaCollection, { schema: jsyaml.JSON_SCHEMA });
    }
    let collection;
    if (isInsomniaV5Export(insomniaCollection)) {
      collection = parseInsomniaV5Collection(insomniaCollection);
    } else {
      collection = parseInsomniaCollection(insomniaCollection);
    }

    const transformedCollection = transformItemsInCollection(collection);
    const hydratedCollection = hydrateSeqInCollection(transformedCollection);
    const validatedCollection = validateSchema(hydratedCollection);
    return validatedCollection;
  } catch (err) {
    console.error(err);
    throw new Error('Import collection failed: ' + err.message);
  }
};

export default insomniaToFerret;
