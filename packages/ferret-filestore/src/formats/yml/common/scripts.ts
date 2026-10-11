import type { Script as OpenCollectionScript, Scripts } from '@opencollection/types/common/scripts';
import type { FolderRequest as FerretFolderRequest } from '@ferretclient/schema-types/collection/folder';
import type { HttpRequest as FerretHttpRequest } from '@ferretclient/schema-types/requests/http';
import type { WebSocketRequest as FerretWebSocketRequest } from '@ferretclient/schema-types/requests/websocket';
import type { GrpcRequest as FerretGrpcRequest } from '@ferretclient/schema-types/requests/grpc';
import type { Script as FerretScript } from '@ferretclient/schema-types/common/scripts';

export const toOpenCollectionScripts = (request: FerretFolderRequest | FerretHttpRequest | FerretWebSocketRequest | FerretGrpcRequest | null | undefined, allowedKeys: string[]): Scripts | undefined => {
  const ocScripts: Scripts = [];
  const script = request?.script as FerretScript | null | undefined;

  const pushScript = (key: keyof FerretScript, type: OpenCollectionScript['type'], code: string | null | undefined) => {
    if (!allowedKeys.includes(key)) {
      return;
    }
    if (!code?.trim().length) {
      return;
    }
    ocScripts.push({ type, code: code.trim() });
  };

  pushScript('req', 'before-request', script?.req);
  pushScript('res', 'after-response', script?.res);
  pushScript('beforeCallStart', 'grpc:before-call-start', script?.beforeCallStart);
  pushScript('beforeMessageSend', 'grpc:before-message-send', script?.beforeMessageSend);
  pushScript('afterMessageReceive', 'grpc:after-message-receive', script?.afterMessageReceive);
  pushScript('afterCallEnd', 'grpc:after-call-end', script?.afterCallEnd);

  if (request?.tests?.trim().length) {
    ocScripts.push({
      type: 'tests',
      code: request.tests.trim()
    });
  }

  return ocScripts.length > 0 ? ocScripts : undefined;
};

export const toFerretScripts = (scripts: Scripts | null | undefined): {
  script?: FerretScript;
  tests?: string;
} | undefined => {
  if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
    return undefined;
  }

  const ferretScripts: {
    script?: FerretScript;
    tests?: string;
  } = {};

  const setScript = (key: keyof FerretScript, code: string) => {
    if (!ferretScripts.script) {
      ferretScripts.script = {};
    }
    ferretScripts.script[key] = code;
  };

  for (const script of scripts) {
    if (!script.code) {
      continue;
    }

    switch (script.type) {
      case 'before-request':
        setScript('req', script.code);
        break;
      case 'after-response':
        setScript('res', script.code);
        break;
      case 'grpc:before-call-start':
        setScript('beforeCallStart', script.code);
        break;
      case 'grpc:before-message-send':
        setScript('beforeMessageSend', script.code);
        break;
      case 'grpc:after-message-receive':
        setScript('afterMessageReceive', script.code);
        break;
      case 'grpc:after-call-end':
        setScript('afterCallEnd', script.code);
        break;
      case 'tests':
        ferretScripts.tests = script.code;
        break;
    }
  }

  return Object.keys(ferretScripts).length > 0 ? ferretScripts : undefined;
};
