import type { Item as FerretItem } from '@useferret/schema-types/collection/item';
import type { WebSocketRequest as FerretWebSocketRequest } from '@useferret/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketMessage, WebSocketMessageVariant } from '@opencollection/types/requests/websocket';
import { toFerretAuth } from '../common/auth';
import { toFerretHttpHeaders } from '../common/headers';
import { toFerretVariables } from '../common/variables';
import { toFerretScripts } from '../common/scripts';
import { uuid, ensureString } from '../../../utils';

const parseWebsocketRequest = (ocRequest: WebSocketRequest): FerretItem => {
  const info = ocRequest.info;
  const websocket = ocRequest.websocket;
  const runtime = ocRequest.runtime;

  const ferretRequest: FerretWebSocketRequest = {
    url: ensureString(websocket?.url),
    headers: toFerretHttpHeaders(websocket?.headers) || [],
    auth: toFerretAuth(websocket?.auth),
    body: {
      mode: 'ws',
      ws: []
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

  // message
  if (websocket?.message) {
    if (Array.isArray(websocket.message)) {
      // multiple messages: WebSocketMessageVariant[]
      const variants = websocket.message as WebSocketMessageVariant[];
      ferretRequest.body.ws = variants.map((variant, index) => ({
        name: variant.title || `message ${index + 1}`,
        type: variant.message?.type || 'text',
        content: ensureString(variant.message?.data),
        selected: variant.selected || false
      }));
    } else {
      // single message uses flat WebSocketMessage
      const message = websocket.message as WebSocketMessage;
      const messageData = ensureString(message.data);
      if (messageData.trim().length) {
        ferretRequest.body.ws = [{
          name: '',
          type: message.type || 'text',
          content: messageData
        }];
      }
    }
  }

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

  // variables
  const variables = toFerretVariables(runtime?.variables);
  ferretRequest.vars = variables;

  // docs
  if (ocRequest.docs) {
    ferretRequest.docs = ocRequest.docs;
  }

  // settings
  const wsSettings: Record<string, number> = {
    timeout: 0,
    keepAliveInterval: 0
  };

  if (ocRequest.settings) {
    if (typeof ocRequest.settings.timeout === 'number') {
      wsSettings.timeout = ocRequest.settings.timeout;
    }
    if (typeof ocRequest.settings.keepAliveInterval === 'number') {
      wsSettings.keepAliveInterval = ocRequest.settings.keepAliveInterval;
    }
  }

  // ferret item
  const ferretItem: FerretItem = {
    uid: uuid(),
    type: 'ws-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: ferretRequest,
    settings: wsSettings as any,
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

  return ferretItem;
};

export default parseWebsocketRequest;
