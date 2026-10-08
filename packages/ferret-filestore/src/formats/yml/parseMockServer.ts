import { parseYml } from './utils';
import { ensureString, isNonEmptyString } from '../../utils';
import { toFerretHttpHeaders } from './common/headers';
import { toFerretParams } from './common/params';
import { toFerretBody } from './common/body';
import type {
  MockServerFile,
  MockRouteEntry,
  FerretMockServer,
  FerretMockRoute,
  MockRuleCondition
} from './mockServerTypes';

const emptyRequestBody = () => ({
  mode: 'none',
  json: null,
  text: null,
  xml: null,
  sparql: null,
  formUrlEncoded: null,
  multipartForm: null,
  graphql: null,
  file: null
});

const toFerretRuleConditions = (conditions: MockRuleCondition[] | null | undefined) => {
  if (!Array.isArray(conditions)) {
    return [];
  }

  return conditions.map((condition) => ({
    target: ensureString(condition?.target),
    key: ensureString(condition?.key),
    operator: ensureString(condition?.operator, 'equals'),
    value: ensureString(condition?.value)
  }));
};

const toFerretMockRoute = (route: MockRouteEntry): FerretMockRoute => {
  const responseStatus = Number(route?.response?.status) || 200;
  const responseStatusText = ensureString(route?.response?.statusText);

  const ferretRoute: FerretMockRoute = {
    name: ensureString(route?.name, 'Untitled Mock Response'),
    description: ensureString(route?.description),
    request: {
      url: ensureString(route?.request?.url, '/'),
      method: ensureString(route?.request?.method, 'GET'),
      headers: toFerretHttpHeaders(route?.request?.headers) || [],
      params: toFerretParams(route?.request?.params) || [],
      body: toFerretBody(route?.request?.body) || emptyRequestBody()
    },
    response: {
      status: responseStatus,
      statusText: responseStatusText === 'OK' && responseStatus !== 200 ? '' : responseStatusText,
      headers: toFerretHttpHeaders(route?.response?.headers) || [],
      body: {
        type: ensureString(route?.response?.body?.type, 'json'),
        content: ensureString(route?.response?.body?.data)
      }
    },
    rules: {
      operator: route?.rules?.operator === 'OR' ? 'OR' : 'AND',
      conditions: toFerretRuleConditions(route?.rules?.conditions)
    }
  };

  const rawExample = route?.copiedFrom?.example;
  const rawRequestPath = route?.copiedFrom?.requestPath;
  const copiedFromExample = isNonEmptyString(rawExample) ? rawExample : null;
  const copiedFromRequestPath = isNonEmptyString(rawRequestPath) ? rawRequestPath : null;

  if (copiedFromExample || copiedFromRequestPath) {
    ferretRoute.copiedFrom = {
      exampleName: copiedFromExample,
      requestPathname: copiedFromRequestPath
    };
  }

  return ferretRoute;
};

const parseMockServer = (content: string): FerretMockServer => {
  const parsed: MockServerFile = parseYml(content);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid mock server file');
  }

  const info = parsed.info || ({} as NonNullable<MockServerFile['info']>);
  const mock = parsed.mock || ({} as NonNullable<MockServerFile['mock']>);

  const ferretMockServer: FerretMockServer = {
    name: ensureString(info.name, 'Mock Server'),
    port: Number(mock.port) || null,
    delay: Number(mock.delay) || 0,
    source: null,
    routes: Array.isArray(parsed.routes) ? parsed.routes.map(toFerretMockRoute) : []
  };

  const sourceType = mock.source?.type;
  const sourcePath = mock.source?.path;
  if ((sourceType === 'collection' || sourceType === 'spec') && isNonEmptyString(sourcePath)) {
    ferretMockServer.source = {
      type: sourceType,
      path: sourcePath
    };
  }

  return ferretMockServer;
};

export default parseMockServer;
