import type { HttpRequestBody as FerretHttpRequestBody } from '@useferret/schema-types/requests/http';
import type {
  HttpRequestBody,
  RawBody,
  FormUrlEncodedBody,
  FormUrlEncodedEntry,
  MultipartFormBody,
  MultipartFormEntry,
  FileBody,
  FileBodyVariant
} from '@opencollection/types/requests/http';
import type { FileEntry as FerretFileEntry } from '@useferret/schema-types/common/file';

import type { KeyValue as FerretKeyValue } from '@useferret/schema-types/common/key-value';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionBody = (body: FerretHttpRequestBody | null | undefined): HttpRequestBody | undefined => {
  if (!body) {
    return undefined;
  }

  switch (body.mode) {
    case 'none':
      return undefined;

    case 'json':
      const rawBody: RawBody = {
        type: 'json',
        data: body.json || ''
      };
      return rawBody;

    case 'text':
      const textBody: RawBody = {
        type: 'text',
        data: body.text || ''
      };
      return textBody;

    case 'xml':
      const xmlBody: RawBody = {
        type: 'xml',
        data: body.xml || ''
      };
      return xmlBody;

    case 'sparql':
      const sparqlBody: RawBody = {
        type: 'sparql',
        data: body.sparql || ''
      };
      return sparqlBody;

    case 'formUrlEncoded':
      const formEntries: FormUrlEncodedEntry[] = body.formUrlEncoded?.map((entry: FerretKeyValue): FormUrlEncodedEntry => {
        const formEntry: FormUrlEncodedEntry = {
          name: entry.name || '',
          value: entry.value || ''
        };

        if (entry?.description?.trim().length) {
          formEntry.description = entry.description;
        }

        if (entry.enabled === false) {
          formEntry.disabled = true;
        }

        return formEntry;
      }) || [];

      const formBody: FormUrlEncodedBody = {
        type: 'form-urlencoded',
        ...(formEntries.length > 0 && { data: formEntries })
      } as FormUrlEncodedBody;
      return formBody;

    case 'multipartForm':
      const multipartEntries: MultipartFormEntry[] = body.multipartForm?.map((entry): MultipartFormEntry => {
        const multipartEntry: MultipartFormEntry = {
          name: entry.name || '',
          type: entry.type,
          value: entry.value || (entry.type === 'file' ? [] : '')
        };

        if (entry?.contentType?.trim().length) {
          multipartEntry.contentType = entry.contentType;
        }

        if (entry?.description?.trim().length) {
          multipartEntry.description = entry.description;
        }

        if (entry.enabled === false) {
          multipartEntry.disabled = true;
        }

        return multipartEntry;
      }) || [];

      const multipartBody: MultipartFormBody = {
        type: 'multipart-form',
        ...(multipartEntries.length > 0 && { data: multipartEntries })
      } as MultipartFormBody;
      return multipartBody;

    case 'file':
      const fileEntries: FileBodyVariant[] = body.file?.map((file): FileBodyVariant => {
        const fileEntry: FileBodyVariant = {
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected ?? false
        };

        if (file?.description?.trim().length) {
          fileEntry.description = file.description;
        }

        return fileEntry;
      }) || [];

      const fileBody: FileBody = {
        type: 'file',
        ...(fileEntries.length > 0 && { data: fileEntries })
      } as FileBody;
      return fileBody;

    case 'graphql':
      // GraphQL body is handled separately in GraphQL request stringify
      return undefined;

    default:
      return undefined;
  }
};

export const toFerretBody = (body: HttpRequestBody | null | undefined): FerretHttpRequestBody | undefined => {
  if (!body) {
    return {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: null,
      file: []
    };
  }

  const ferretBody: FerretHttpRequestBody = {
    mode: 'none',
    json: null,
    text: null,
    xml: null,
    sparql: null,
    formUrlEncoded: [],
    multipartForm: [],
    graphql: null,
    file: []
  };

  switch (body.type) {
    case 'json':
      ferretBody.mode = 'json';
      ferretBody.json = body.data || '';
      break;

    case 'text':
      ferretBody.mode = 'text';
      ferretBody.text = body.data || '';
      break;

    case 'xml':
      ferretBody.mode = 'xml';
      ferretBody.xml = body.data || '';
      break;

    case 'sparql':
      ferretBody.mode = 'sparql';
      ferretBody.sparql = body.data || '';
      break;

    case 'form-urlencoded':
      ferretBody.mode = 'formUrlEncoded';
      ferretBody.formUrlEncoded = body.data?.map((entry): FerretKeyValue => {
        const formEntry: FerretKeyValue = {
          uid: uuid(),
          name: ensureString(entry.name),
          value: ensureString(entry.value),
          enabled: entry.disabled !== true
        };

        if (entry.description) {
          if (typeof entry.description === 'string' && entry.description.trim().length) {
            formEntry.description = entry.description;
          } else if (typeof entry.description === 'object' && entry.description.content?.trim().length) {
            formEntry.description = entry.description.content;
          }
        }

        return formEntry;
      }) || [];
      break;

    case 'multipart-form':
      ferretBody.mode = 'multipartForm';
      ferretBody.multipartForm = body.data?.map((entry): any => {
        const multipartEntry: any = {
          uid: uuid(),
          type: entry.type,
          name: ensureString(entry.name),
          value: entry.type === 'file' ? (entry.value || []) : ensureString(entry.value),
          contentType: entry.contentType || null,
          enabled: entry.disabled !== true
        };

        if (entry.description) {
          if (typeof entry.description === 'string' && entry.description.trim().length) {
            multipartEntry.description = entry.description;
          } else if (typeof entry.description === 'object' && entry.description.content?.trim().length) {
            multipartEntry.description = entry.description.content;
          }
        }

        return multipartEntry;
      }) || [];
      break;

    case 'file':
      ferretBody.mode = 'file';
      ferretBody.file = body.data?.map((file): FerretFileEntry => {
        const fileEntry: FerretFileEntry = {
          uid: uuid(),
          filePath: file.filePath || '',
          contentType: file.contentType || '',
          selected: file.selected ?? false
        };

        const fileWithDescription = file as FileBodyVariant;
        const desc = typeof fileWithDescription.description === 'string'
          ? fileWithDescription.description
          : (fileWithDescription.description as { content?: string } | undefined)?.content;
        if (desc && desc.trim().length) fileEntry.description = desc;

        return fileEntry;
      }) || [];
      break;

    default:
      break;
  }

  return ferretBody;
};
