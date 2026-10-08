import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionParams,
  toOpenCollectionParams,
  fromOpenCollectionBody,
  toOpenCollectionBody,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables,
  fromOpenCollectionActions,
  toOpenCollectionActions,
  fromOpenCollectionAssertions,
  toOpenCollectionAssertions,
  resolveTimeoutSetting
} from '../common';
import { utils, HTTP_SCRIPT_KEYS } from '@useferret/common';
import type {
  HttpRequest,
  HttpRequestSettings,
  HttpRequestExample,
  HttpRequestInfo,
  HttpRequestDetails,
  HttpRequestRuntime,
  HttpRequestHeader,
  HttpRequestBody,
  Auth,
  FerretItem,
  FerretKeyValue,
  FerretHttpRequestParam,
  FerretExample,
  FerretHttpRequest
} from '../types';
import type { HttpItemSettings as FerretHttpItemSettings } from '@useferret/schema-types/collection/item';


const { toBool, toMaxRedirects } = utils;

const getHttpBody = (body: HttpRequestBody | Array<{ title: string; selected?: boolean; body: HttpRequestBody }> | undefined): HttpRequestBody | undefined => {
  if (!body) return undefined;
  if (Array.isArray(body)) {
    const selected = body.find((v) => v.selected);
    return selected?.body || body[0]?.body;
  }
  return body;
};

export const fromOpenCollectionHttpItem = (ocRequest: HttpRequest): FerretItem => {
  const info = ocRequest.info;
  const http = ocRequest.http;
  const runtime = ocRequest.runtime;

  const scripts = fromOpenCollectionScripts(runtime?.scripts, HTTP_SCRIPT_KEYS);
  const httpBody = getHttpBody(http?.body as HttpRequestBody);

  // variables (pre-request from variables, post-response from actions)
  const variables = fromOpenCollectionVariables(runtime?.variables);
  const postResponseVars = fromOpenCollectionActions(runtime?.actions);

  const ferretRequest: FerretHttpRequest = {
    url: http?.url || '',
    method: http?.method || 'GET',
    headers: fromOpenCollectionHeaders(http?.headers) || [],
    params: fromOpenCollectionParams(http?.params) || [],
    body: fromOpenCollectionBody(httpBody) || {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: null,
      file: []
    },
    auth: fromOpenCollectionAuth(http?.auth as Auth),
    script: {
      req: scripts?.script?.req || null,
      res: scripts?.script?.res || null
    },
    vars: {
      req: variables.req,
      res: postResponseVars
    },
    assertions: fromOpenCollectionAssertions(runtime?.assertions) || [],
    tests: scripts?.tests || null,
    docs: ocRequest.docs || null
  };

  const ferretItem: FerretItem = {
    uid: uuid(),
    type: 'http-request',
    seq: info?.seq || 1,
    name: info?.name || 'Untitled Request',
    tags: info?.tags || [],
    request: ferretRequest,
    settings: null,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  if (ocRequest.settings) {
    const settings: FerretHttpItemSettings = {
      encodeUrl: toBool(ocRequest.settings.encodeUrl, true),
      timeout: resolveTimeoutSetting(ocRequest.settings.timeout),
      followRedirects: toBool(ocRequest.settings.followRedirects, true),
      maxRedirects: toMaxRedirects(ocRequest.settings.maxRedirects),
      forwardAuthorizationHeader: toBool(ocRequest.settings.forwardAuthorizationHeader, true)
    };
    if (Array.isArray(ocRequest.settings.omitHeaders) && ocRequest.settings.omitHeaders.length) {
      settings.omitHeaders = ocRequest.settings.omitHeaders;
    }
    ferretItem.settings = settings;
  }

  if (ocRequest.examples?.length) {
    ferretItem.examples = ocRequest.examples.map((example): FerretExample => ({
      uid: uuid(),
      itemUid: ferretItem.uid,
      name: example.name || 'Untitled Example',
      description: typeof example.description === 'string' ? example.description : (example.description as { content?: string })?.content || null,
      type: 'http-request',
      request: {
        url: example.request?.url || '',
        method: example.request?.method || 'GET',
        headers: fromOpenCollectionHeaders(example.request?.headers) || [],
        params: fromOpenCollectionParams(example.request?.params) || [],
        body: fromOpenCollectionBody(example.request?.body) || null
      },
      response: example.response ? {
        status: example.response.status || 200,
        statusText: example.response.statusText || 'OK',
        headers: fromOpenCollectionHeaders(example.response.headers as HttpRequestHeader[]) || [],
        body: example.response.body ? {
          type: example.response.body.type || 'text',
          content: example.response.body.data || ''
        } : null
      } : null
    }));
  }

  return ferretItem;
};

export const toOpenCollectionHttpItem = (item: FerretItem): HttpRequest => {
  const ocRequest: HttpRequest = {};
  const ferretRequest = item.request as FerretHttpRequest;
  const ferretSettings = item.settings as FerretHttpItemSettings | undefined;

  const info: HttpRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'http'
  };
  if (item.seq) {
    info.seq = item.seq;
  }
  if (item.tags?.length) {
    info.tags = item.tags;
  }
  ocRequest.info = info;

  const http: HttpRequestDetails = {
    method: ferretRequest?.method || 'GET',
    url: ferretRequest?.url || ''
  };

  const headers = toOpenCollectionHeaders(ferretRequest?.headers as FerretKeyValue[]);
  if (headers) {
    http.headers = headers;
  }

  const params = toOpenCollectionParams(ferretRequest?.params as FerretHttpRequestParam[]);
  if (params) {
    http.params = params;
  }

  const body = toOpenCollectionBody(ferretRequest?.body);
  if (body) {
    http.body = body;
  }

  // auth
  const auth = toOpenCollectionAuth(ferretRequest?.auth);
  if (auth) {
    http.auth = auth;
  }

  ocRequest.http = http;

  const runtime: HttpRequestRuntime = {};
  let hasRuntime = false;

  const variables = toOpenCollectionVariables(ferretRequest?.vars);
  if (variables) {
    runtime.variables = variables;
    hasRuntime = true;
  }

  const scripts = toOpenCollectionScripts(ferretRequest, HTTP_SCRIPT_KEYS);
  if (scripts) {
    runtime.scripts = scripts;
    hasRuntime = true;
  }

  const assertions = toOpenCollectionAssertions(ferretRequest?.assertions as FerretKeyValue[]);
  if (assertions) {
    runtime.assertions = assertions;
    hasRuntime = true;
  }

  // actions (from post-response variables)
  const resVars = ferretRequest?.vars?.res;
  const actions = toOpenCollectionActions(resVars);
  if (actions) {
    runtime.actions = actions;
    hasRuntime = true;
  }

  if (hasRuntime) {
    ocRequest.runtime = runtime;
  }

  const settings: HttpRequestSettings = {
    encodeUrl: toBool(ferretSettings?.encodeUrl, true),
    timeout: resolveTimeoutSetting(ferretSettings?.timeout),
    followRedirects: toBool(ferretSettings?.followRedirects, true),
    maxRedirects: toMaxRedirects(ferretSettings?.maxRedirects),
    forwardAuthorizationHeader: toBool(ferretSettings?.forwardAuthorizationHeader, true)
  };
  if (Array.isArray(ferretSettings?.omitHeaders) && ferretSettings.omitHeaders.length) {
    settings.omitHeaders = ferretSettings.omitHeaders;
  }
  ocRequest.settings = settings;

  if (ferretRequest?.docs) {
    ocRequest.docs = ferretRequest.docs;
  }

  if (item.examples?.length) {
    ocRequest.examples = item.examples.map((example): HttpRequestExample => {
      const ocExample: HttpRequestExample = {
        name: example.name || 'Untitled Example'
      };

      if (example.description) {
        ocExample.description = example.description;
      }

      if (example.request) {
        ocExample.request = {
          url: example.request.url || '',
          method: example.request.method || 'GET'
        };

        const exampleHeaders = toOpenCollectionHeaders(example.request.headers as FerretKeyValue[]);
        if (exampleHeaders) {
          ocExample.request.headers = exampleHeaders;
        }

        const exampleParams = toOpenCollectionParams(example.request.params as FerretHttpRequestParam[]);
        if (exampleParams) {
          ocExample.request.params = exampleParams;
        }

        const exampleBody = toOpenCollectionBody(example.request.body);
        if (exampleBody) {
          ocExample.request.body = exampleBody;
        }
      }

      if (example.response) {
        ocExample.response = {};

        if (example.response.status !== undefined) {
          ocExample.response.status = Number(example.response.status);
        }

        if (example.response.statusText) {
          ocExample.response.statusText = example.response.statusText;
        }

        const responseHeaders = toOpenCollectionHeaders(example.response.headers as FerretKeyValue[]);
        if (responseHeaders) {
          ocExample.response.headers = responseHeaders;
        }

        if (example.response.body) {
          ocExample.response.body = {
            type: (example.response.body.type as 'json' | 'text' | 'xml' | 'html' | 'binary') || 'text',
            data: String(example.response.body.content || '')
          };
        }
      }

      return ocExample;
    });
  }

  return ocRequest;
};
