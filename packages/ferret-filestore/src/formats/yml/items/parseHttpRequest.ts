import type { Item as FerretItem, HttpItemSettings as FerretHttpItemSettings } from '@ferret-app/schema-types/collection/item';
import type { HttpRequest as FerretHttpRequest } from '@ferret-app/schema-types/requests/http';
import type { HttpRequest, HttpRequestBody } from '@opencollection/types/requests/http';
import { toFerretAuth } from '../common/auth';
import { toFerretHttpHeaders } from '../common/headers';
import { toFerretParams } from '../common/params';
import { toFerretBody } from '../common/body';
import { toFerretVariables } from '../common/variables';
import { toFerretPostResponseVariables } from '../common/actions';
import { toFerretScripts } from '../common/scripts';
import { toFerretAssertions } from '../common/assertions';
import { toFerretApp } from '../common/app';
import { normalizeOmitHeaders } from '../common/omit-headers';
import { uuid, ensureString } from '../../../utils';
import { utils } from '@ferret-app/common';
const { toBool, toMaxRedirects } = utils;

const parseHttpRequest = (ocRequest: HttpRequest): FerretItem => {
  const info = ocRequest.info;
  const http = ocRequest.http;
  const runtime = ocRequest.runtime;

  const ferretRequest: FerretHttpRequest = {
    url: ensureString(http?.url),
    method: ensureString(http?.method, 'GET'),
    headers: toFerretHttpHeaders(http?.headers) || [],
    params: toFerretParams(http?.params) || [],
    auth: toFerretAuth(http?.auth),
    body: toFerretBody(http?.body as HttpRequestBody) || {
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
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // scripts
  const scripts = toFerretScripts(runtime?.scripts);
  if (scripts?.script && ferretRequest.script) {
    if (scripts.script.req) {
      ferretRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      ferretRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    ferretRequest.tests = scripts.tests;
  }

  // variables (pre-request from variables, post-response from actions)
  const variables = toFerretVariables(runtime?.variables);
  const postResponseVars = toFerretPostResponseVariables(runtime?.actions);
  ferretRequest.vars = {
    req: variables.req,
    res: postResponseVars
  };

  // assertions
  const assertions = toFerretAssertions(runtime?.assertions);
  if (assertions) {
    ferretRequest.assertions = assertions;
  }

  // docs
  if (ocRequest.docs) {
    ferretRequest.docs = ocRequest.docs;
  }

  // app
  const app = toFerretApp((ocRequest as any).app);

  // ferret item
  const ferretItem: FerretItem = {
    uid: uuid(),
    type: 'http-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: ferretRequest,
    settings: null,
    app,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  // description
  if (info?.description) {
    const desc = typeof info.description === 'string' ? info.description : (info.description as any)?.content || '';
    if (desc.trim().length) {
      ferretItem.description = desc;
    }
  }

  // settings
  if (ocRequest.settings) {
    const settings: FerretHttpItemSettings = {};

    settings.encodeUrl = toBool(ocRequest.settings.encodeUrl, true);

    if (typeof ocRequest.settings.timeout === 'number') {
      settings.timeout = ocRequest.settings.timeout;
    } else if (ocRequest.settings.timeout === 'inherit') {
      settings.timeout = 'inherit';
    } else {
      settings.timeout = 0;
    }

    settings.followRedirects = toBool(ocRequest.settings.followRedirects, true);
    settings.maxRedirects = toMaxRedirects(ocRequest.settings.maxRedirects);
    settings.forwardAuthorizationHeader = toBool(ocRequest.settings.forwardAuthorizationHeader, true);

    const omitHeaders = normalizeOmitHeaders(ocRequest.settings.omitHeaders);
    if (omitHeaders) {
      settings.omitHeaders = omitHeaders;
    }

    ferretItem.settings = settings;
  }

  // examples
  if (ocRequest.examples?.length) {
    ferretItem.examples = ocRequest.examples.map((example) => {
      const ferretExample: any = {
        uid: uuid(),
        itemUid: uuid(),
        name: ensureString(example.name, 'Untitled Example'),
        type: 'http-request',
        request: null,
        response: null
      };

      if (example.description) {
        if (typeof example.description === 'string' && example.description.trim().length) {
          ferretExample.description = example.description;
        } else if (typeof example.description === 'object' && example.description.content?.trim().length) {
          ferretExample.description = example.description.content;
        }
      }

      if (example.request) {
        ferretExample.request = {
          url: ensureString(example.request.url),
          method: ensureString(example.request.method, 'GET'),
          headers: toFerretHttpHeaders(example.request.headers) || [],
          params: toFerretParams(example.request.params) || [],
          body: toFerretBody(example.request.body) || {
            mode: 'none',
            json: null,
            text: null,
            xml: null,
            sparql: null,
            formUrlEncoded: null,
            multipartForm: null,
            graphql: null,
            file: null
          }
        };
      }

      if (example.response) {
        ferretExample.response = {
          status: typeof example.response.status === 'number' ? example.response.status
            : example.response.status !== undefined ? Number(example.response.status) : null,
          statusText: example.response.statusText || null,
          headers: toFerretHttpHeaders(example.response.headers) || [],
          body: null
        };

        if (example.response.body) {
          ferretExample.response.body = {
            type: example.response.body.type || 'text',
            content: example.response.body.data || ''
          };
        }
      }

      return ferretExample;
    });
  }

  return ferretItem;
};

export default parseHttpRequest;
