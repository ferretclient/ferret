import type { HttpRequestParam as FerretHttpRequestParam } from '@useferret/schema-types/requests/http';
import type { HttpRequestParam } from '@opencollection/types/requests/http';
import { uuid, ensureString } from '../../../utils';

export const toOpenCollectionParams = (params: FerretHttpRequestParam[] | null | undefined): HttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const ocParams = params.map((param: FerretHttpRequestParam): HttpRequestParam => {
    const ocParam: HttpRequestParam = {
      name: param.name || '',
      value: param.value || '',
      type: param.type
    };

    if (param?.description?.trim().length) {
      ocParam.description = param.description;
    }

    if (param.enabled === false) {
      ocParam.disabled = true;
    }

    return ocParam;
  });

  return ocParams.length ? ocParams : undefined;
};

export const toFerretParams = (params: HttpRequestParam[] | null | undefined): FerretHttpRequestParam[] | undefined => {
  if (!params?.length) {
    return undefined;
  }

  const ferretParams = params.map((param: HttpRequestParam): FerretHttpRequestParam => {
    const ferretParam: FerretHttpRequestParam = {
      uid: uuid(),
      name: ensureString(param.name),
      value: ensureString(param.value),
      type: param.type,
      enabled: param.disabled !== true
    };

    if (param.description) {
      if (typeof param.description === 'string' && param.description.trim().length) {
        ferretParam.description = param.description;
      } else if (typeof param.description === 'object' && param.description.content?.trim().length) {
        ferretParam.description = param.description.content;
      }
    }

    return ferretParam;
  });

  return ferretParams.length ? ferretParams : undefined;
};
