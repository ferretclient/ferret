import type { Item as FerretItem, HttpItemSettings as FerretHttpItemSettings } from '@ferretclient/schema-types/collection/item';
import type { HttpRequest as FerretHttpRequest } from '@ferretclient/schema-types/requests/http';
import type { GraphQLRequest, GraphQLRequestSettings, GraphQLBody } from '@opencollection/types/requests/graphql';
import { toFerretAuth } from '../common/auth';
import { toFerretHttpHeaders } from '../common/headers';
import { toFerretParams } from '../common/params';
import { toFerretVariables } from '../common/variables';
import { toFerretPostResponseVariables } from '../common/actions';
import { toFerretScripts } from '../common/scripts';
import { toFerretAssertions } from '../common/assertions';
import { uuid, ensureString } from '../../../utils';
import { utils } from '@ferretclient/common';
const { toBool, toMaxRedirects } = utils;

const parseGraphQLRequest = (ocRequest: GraphQLRequest): FerretItem => {
  const info = ocRequest.info;
  const graphql = ocRequest.graphql;
  const runtime = ocRequest.runtime;

  const ferretRequest: FerretHttpRequest = {
    url: ensureString(graphql?.url),
    method: ensureString(graphql?.method, 'POST'),
    headers: toFerretHttpHeaders(graphql?.headers) || [],
    params: toFerretParams(graphql?.params) || [],
    auth: toFerretAuth(graphql?.auth),
    body: {
      mode: 'graphql',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: {
        query: (graphql?.body as GraphQLBody)?.query || '',
        variables: (graphql?.body as GraphQLBody)?.variables || ''
      },
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

  // ferret item
  const ferretItem: FerretItem = {
    uid: uuid(),
    type: 'graphql-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
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

    ferretItem.settings = settings;
  }

  return ferretItem;
};

export default parseGraphQLRequest;
