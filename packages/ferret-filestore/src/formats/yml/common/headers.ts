import type { FolderRequest as FerretFolderRequest } from '@ferret-app/schema-types/collection/folder';
import type { KeyValue as FerretKeyValue } from '@ferret-app/schema-types/common/key-value';
import type { HttpRequestHeader, HttpResponseHeader } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionHttpHeaders = (headers: FerretFolderRequest['headers']): HttpRequestHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: FerretKeyValue): HttpRequestHeader => {
    const httpHeader: HttpRequestHeader = {
      name: header.name || '',
      value: header.value || ''
    };
    if (header?.description?.trim().length) {
      httpHeader.description = header.description;
    }
    if (header.enabled === false) {
      httpHeader.disabled = true;
    }
    return httpHeader;
  });

  return ocHeaders.length ? ocHeaders : undefined;
};

export const toOpenCollectionResponseHeaders = (headers: FerretFolderRequest['headers']): HttpResponseHeader[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ocHeaders = headers.map((header: FerretKeyValue): HttpResponseHeader => ({
    name: header.name || '',
    value: header.value || ''
  }));

  return ocHeaders.length ? ocHeaders : undefined;
};

export const toFerretHttpHeaders = (headers: HttpRequestHeader[] | HttpResponseHeader[] | null | undefined): FerretKeyValue[] | undefined => {
  if (!headers?.length) {
    return undefined;
  }

  const ferretHeaders = headers.map((header): FerretKeyValue => {
    const ferretHeader: FerretKeyValue = {
      uid: uuid(),
      name: ensureString(header.name),
      value: ensureString(header.value),
      enabled: ('disabled' in header) ? header.disabled !== true : true
    };

    if ('description' in header && header.description) {
      ferretHeader.description = typeof header.description === 'string' ? header.description : (header.description as any)?.content || '';
    }

    return ferretHeader;
  });

  return ferretHeaders.length ? ferretHeaders : undefined;
};
