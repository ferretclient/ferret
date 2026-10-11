import { FerretError } from 'utils/common/error';
import { openApiToFerret } from '@ferretclient/converters';

export const convertOpenapiToFerret = (data, options = {}) => {
  try {
    return openApiToFerret(data, options);
  } catch (err) {
    console.error('Error converting OpenAPI to Ferret:', err);
    throw new FerretError('Import collection failed: ' + err.message);
  }
};

export const isOpenApiSpec = (data) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (typeof data.info !== 'object' || data.info === null) {
    return false;
  }

  if (typeof data.openapi === 'string' && data.openapi.trim().length) {
    return true;
  }

  if (typeof data.swagger === 'string' && data.swagger.trim().length) {
    return true;
  }

  return false;
};
