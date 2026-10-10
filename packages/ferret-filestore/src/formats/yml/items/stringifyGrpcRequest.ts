import type { Item as FerretItem } from '@ferret-app/schema-types/collection/item';
import type { KeyValue as FerretKeyValue } from '@ferret-app/schema-types/common/key-value';
import type { GrpcRequest as FerretGrpcRequest } from '@ferret-app/schema-types/requests/grpc';
import type { GrpcRequest, GrpcMetadata, GrpcMessageVariant, GrpcMessage, GrpcRequestInfo, GrpcRequestDetails, GrpcRequestRuntime } from '@opencollection/types/requests/grpc';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';
import { GRPC_SCRIPT_KEYS } from '@ferret-app/common';

const stringifyGrpcRequest = (item: FerretItem): string => {
  try {
    const ocRequest: GrpcRequest = {};
    const ferretRequest = item.request as FerretGrpcRequest;

    // info block
    const info: GrpcRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'grpc'
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

    // grpc block
    const grpc: GrpcRequestDetails = {
      url: isNonEmptyString(ferretRequest.url) ? ferretRequest.url : '',
      method: isNonEmptyString(ferretRequest.method) ? ferretRequest.method : ''
    };

    // method type
    if (ferretRequest.methodType) {
      grpc.methodType = ferretRequest.methodType;
    }

    // proto file path
    if (isNonEmptyString(ferretRequest.protoPath)) {
      grpc.protoFilePath = ferretRequest.protoPath;
    }

    // metadata
    if (ferretRequest.headers?.length) {
      const metadata: GrpcMetadata[] = ferretRequest.headers.map((header: FerretKeyValue) => {
        const metadataItem: GrpcMetadata = {
          name: header.name || '',
          value: header.value || ''
        };

        if (header?.description?.trim().length) {
          metadataItem.description = header.description;
        }

        if (header.enabled === false) {
          metadataItem.disabled = true;
        }

        return metadataItem;
      });

      if (metadata.length) {
        grpc.metadata = metadata;
      }
    }

    // message
    if (ferretRequest.body?.mode === 'grpc' && ferretRequest.body.grpc?.length) {
      const messages: GrpcMessageVariant[] = ferretRequest.body.grpc.map(({ name, content }, index) => ({
        title: name || `message ${index + 1}`,
        message: content || ''
      }));
      grpc.message = messages;
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(ferretRequest.auth);
    if (auth) {
      grpc.auth = auth;
    }

    ocRequest.grpc = grpc;

    // runtime block
    const runtime: GrpcRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(ferretRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(ferretRequest, GRPC_SCRIPT_KEYS);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(ferretRequest.assertions);
    if (assertions) {
      runtime.assertions = assertions;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // docs
    if (isNonEmptyString(ferretRequest.docs)) {
      ocRequest.docs = ferretRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying gRPC request:', error);
    throw error;
  }
};

export default stringifyGrpcRequest;
