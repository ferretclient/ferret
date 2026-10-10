import type { Item as FerretItem } from '@ferret-app/schema-types/collection/item';
import type { WebSocketRequest as FerretWebSocketRequest } from '@ferret-app/schema-types/requests/websocket';
import type { WebSocketRequest, WebSocketRequestInfo, WebSocketRequestDetails, WebSocketRequestRuntime, WebSocketMessage, WebSocketMessageVariant } from '@opencollection/types/requests/websocket';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';
import { HTTP_SCRIPT_KEYS } from '@ferret-app/common';

const stringifyWebsocketRequest = (item: FerretItem): string => {
  try {
    const ocRequest: WebSocketRequest = {};
    const ferretRequest = item.request as FerretWebSocketRequest;

    // info block
    const info: WebSocketRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'websocket'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    if (isNonEmptyString(item.description)) {
      info.description = item.description;
    }
    ocRequest.info = info;

    // websocket block
    const websocket: WebSocketRequestDetails = {
      url: isNonEmptyString(ferretRequest.url) ? ferretRequest.url : ''
    };

    // headers
    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(ferretRequest.headers);
    if (headers) {
      websocket.headers = headers;
    }

    // message: single message without a custom name uses flat WebSocketMessage (backward compatible),
    // otherwise uses WebSocketMessageVariant[] to preserve names
    if (ferretRequest.body?.mode === 'ws' && ferretRequest.body.ws?.length) {
      const messages = ferretRequest.body.ws;
      const hasCustomName = messages.length === 1 && messages[0].name && messages[0].name.trim().length > 0;

      const hasContent = messages.length === 1 && (messages[0].content || '').trim().length > 0;

      if (messages.length === 1 && !hasCustomName && hasContent) {
        const msg = messages[0];
        const message: WebSocketMessage = {
          type: (msg.type as WebSocketMessage['type']) || 'text',
          data: msg.content || ''
        };
        websocket.message = message;
      } else {
        const variants: WebSocketMessageVariant[] = messages.map((msg, index) => ({
          title: msg.name || `message ${index + 1}`,
          selected: msg.selected || false,
          message: {
            type: (msg.type as WebSocketMessage['type']) || 'text',
            data: msg.content || ''
          }
        }));
        websocket.message = variants;
      }
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(ferretRequest.auth);
    if (auth) {
      websocket.auth = auth;
    }

    ocRequest.websocket = websocket;

    // runtime block
    const runtime: WebSocketRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(ferretRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    // TODO: Modify to WS scripts once WS scripts are implemented.
    const scripts: Scripts | undefined = toOpenCollectionScripts(ferretRequest, HTTP_SCRIPT_KEYS);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // settings
    const wsSettings = item.settings as Record<string, number | string | undefined> | undefined;
    if (wsSettings) {
      ocRequest.settings = {};
      const timeout = Number(wsSettings.timeout);
      ocRequest.settings.timeout = !isNaN(timeout) ? timeout : 0;
      const keepAliveInterval = Number(wsSettings.keepAliveInterval);
      ocRequest.settings.keepAliveInterval = !isNaN(keepAliveInterval) ? keepAliveInterval : 0;
    }

    // docs
    if (isNonEmptyString(ferretRequest.docs)) {
      ocRequest.docs = ferretRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying WebSocket request:', error);
    throw error;
  }
};

export default stringifyWebsocketRequest;
