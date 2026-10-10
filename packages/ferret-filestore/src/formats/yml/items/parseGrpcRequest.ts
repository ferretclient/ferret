import type { Item as FerretItem } from '@ferret-app/schema-types/collection/item';
import type { GrpcRequest as FerretGrpcRequest } from '@ferret-app/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata, GrpcMessageVariant } from '@opencollection/types/requests/grpc';
import type { KeyValue as FerretKeyValue } from '@ferret-app/schema-types/common/key-value';
import { toFerretAuth } from '../common/auth';
import { toFerretVariables } from '../common/variables';
import { toFerretScripts } from '../common/scripts';
import { toFerretAssertions } from '../common/assertions';
import { isNonEmptyString, uuid, ensureString } from '../../../utils';

const toFerretGrpcMetadata = (metadata: GrpcMetadata[] | null | undefined): FerretKeyValue[] | undefined => {
  if (!metadata?.length) {
    return undefined;
  }

  const ferretMetadata = metadata.map((meta: GrpcMetadata): FerretKeyValue => {
    const ferretMeta: FerretKeyValue = {
      uid: uuid(),
      name: ensureString(meta.name),
      value: ensureString(meta.value),
      enabled: meta.disabled !== true
    };

    if (meta.description) {
      const desc = typeof meta.description === 'string' ? meta.description : (meta.description as any)?.content || '';
      if (desc.trim().length) {
        ferretMeta.description = desc;
      }
    }

    return ferretMeta;
  });

  return ferretMetadata.length ? ferretMetadata : undefined;
};

const parseGrpcRequest = (ocRequest: GrpcRequest): FerretItem => {
  const info = ocRequest.info;
  const grpc = ocRequest.grpc;
  const runtime = ocRequest.runtime;

  const ferretRequest: FerretGrpcRequest = {
    url: ensureString(grpc?.url),
    method: ensureString(grpc?.method),
    methodType: grpc?.methodType || '',
    protoPath: grpc?.protoFilePath || null,
    headers: toFerretGrpcMetadata(grpc?.metadata) || [],
    auth: toFerretAuth(grpc?.auth),
    body: {
      mode: 'grpc',
      grpc: []
    },
    script: {
      beforeCallStart: null,
      beforeMessageSend: null,
      afterMessageReceive: null,
      afterCallEnd: null
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
  const rawMessage = grpc?.message;
  if (Array.isArray(rawMessage)) {
    ferretRequest.body.grpc = (rawMessage as GrpcMessageVariant[]).map(({ title, message }, index) => ({
      name: title || `message ${index + 1}`,
      content: ensureString(message)
    }));
  } else if (isNonEmptyString(rawMessage)) {
    ferretRequest.body.grpc = [{
      name: '',
      content: rawMessage as string
    }];
  }

  // scripts
  const scripts = toFerretScripts(runtime?.scripts);
  if (scripts?.script && ferretRequest.script) {
    if (scripts.script.beforeCallStart) {
      ferretRequest.script.beforeCallStart = scripts.script.beforeCallStart;
    }
    if (scripts.script.beforeMessageSend) {
      ferretRequest.script.beforeMessageSend = scripts.script.beforeMessageSend;
    }
    if (scripts.script.afterMessageReceive) {
      ferretRequest.script.afterMessageReceive = scripts.script.afterMessageReceive;
    }
    if (scripts.script.afterCallEnd) {
      ferretRequest.script.afterCallEnd = scripts.script.afterCallEnd;
    }
  }
  if (scripts?.tests) {
    ferretRequest.tests = scripts.tests;
  }

  // variables
  const variables = toFerretVariables(runtime?.variables);
  ferretRequest.vars = variables;

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
    type: 'grpc-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: ferretRequest,
    settings: {},
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

export default parseGrpcRequest;
