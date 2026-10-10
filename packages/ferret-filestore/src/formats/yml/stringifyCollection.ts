import type { OpenCollection } from '@opencollection/types';
import type { ProtoFileItem, ProtoFileImportPath } from '@opencollection/types/config/protobuf';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import type { ClientCertificate, PemCertificate, Pkcs12Certificate } from '@opencollection/types/config/certificates';
import type { Variable } from '@opencollection/types/common/variables';
import type { Action } from '@opencollection/types/common/actions';
import type { Scripts } from '@opencollection/types/common/scripts';
import { normalizeOpenApiSyncConfigs } from '@ferret-app/common';
import { stringifyYml } from './utils';
import { toOpenCollectionAuth } from './common/auth';
import { toOpenCollectionHttpHeaders } from './common/headers';
import { toOpenCollectionVariables } from './common/variables';
import { toOpenCollectionActions } from './common/actions';
import { toOpenCollectionScripts } from './common/scripts';
import type { Auth } from '@opencollection/types/common/auth';
import { HTTP_SCRIPT_KEYS } from '@ferret-app/common';

const hasCollectionConfig = (ferretConfig: any): boolean => {
  // protobuf
  const hasProtobuf = (
    ferretConfig.protobuf?.protoFiles?.length > 0
    || ferretConfig.protobuf?.importPaths?.length > 0
  );

  // proxy - check if proxy is configured in newer format
  // Valid newer format: has 'inherit' property and 'config' object
  const isValidProxyFormat = ferretConfig.proxy
    && typeof ferretConfig.proxy === 'object'
    && 'inherit' in ferretConfig.proxy
    && ferretConfig.proxy.config
    && typeof ferretConfig.proxy.config === 'object';

  const hasProxy = isValidProxyFormat;

  // client certificates
  const hasClientCertificates = ferretConfig.clientCertificates?.certs?.length > 0;

  return hasProtobuf || hasProxy || hasClientCertificates;
};

const hasRequestDefaults = (collectionRoot: any): boolean => {
  const requestRoot = collectionRoot?.request;

  return Boolean((requestRoot?.headers?.length)
    || (requestRoot?.vars?.req?.length)
    || (requestRoot?.vars?.res?.length)
    || hasRequestScripts(collectionRoot)
    || hasRequestAuth(collectionRoot));
};

const hasRequestAuth = (collectionRoot: any): boolean => {
  const reqAuthMode = collectionRoot?.request?.auth?.mode;
  return Boolean(reqAuthMode && reqAuthMode !== 'none');
};

const hasRequestScripts = (collectionRoot: any): boolean => {
  if (!collectionRoot?.request) return false;

  return (collectionRoot.request.script?.req)
    || (collectionRoot.request.script?.res)
    || (collectionRoot.request.tests);
};

const hasPresets = (ferretConfig: any): boolean => {
  return ferretConfig?.presets?.requestType?.length
    || ferretConfig?.presets?.requestUrl?.length
    || ferretConfig?.presets?.defaultEnvironment?.length;
};

const stringifyCollection = (collectionRoot: any, ferretConfig: any): string => {
  try {
    const oc: OpenCollection = {};

    oc.opencollection = '1.0.0';
    oc.info = {
      name: ferretConfig.name || 'Untitled Collection'
    };

    if (ferretConfig.version != null && ferretConfig.version !== '') {
      oc.info.version = String(ferretConfig.version);
    }

    // collection config
    if (hasCollectionConfig(ferretConfig)) {
      oc.config = {};

      if (ferretConfig.protobuf?.protoFiles?.length || ferretConfig.protobuf?.importPaths?.length) {
        oc.config.protobuf = {};

        if (ferretConfig.protobuf.protoFiles?.length) {
          oc.config.protobuf.protoFiles = ferretConfig.protobuf.protoFiles.map((protoFile: any): ProtoFileItem => ({
            type: 'file' as const,
            path: protoFile.path
          }));
        }

        if (ferretConfig.protobuf.importPaths?.length) {
          oc.config.protobuf.importPaths = ferretConfig.protobuf.importPaths.map((importPath: any): ProtoFileImportPath => {
            const item: ProtoFileImportPath = { path: importPath.path };
            if (importPath.enabled === false) {
              item.disabled = true;
            }
            return item;
          });
        }
      }

      // proxy - only write newer format
      // Validate that ferretConfig.proxy is in newer format before writing
      const isValidProxyFormat = ferretConfig.proxy
        && typeof ferretConfig.proxy === 'object'
        && 'inherit' in ferretConfig.proxy
        && ferretConfig.proxy.config
        && typeof ferretConfig.proxy.config === 'object';

      if (isValidProxyFormat) {
        oc.config.proxy = {
          inherit: ferretConfig.proxy.inherit,
          config: {
            protocol: ferretConfig.proxy.config.protocol || 'http',
            hostname: ferretConfig.proxy.config.hostname || '',
            port: ferretConfig.proxy.config.port || '',
            auth: {
              username: ferretConfig.proxy.config.auth?.username || '',
              password: ferretConfig.proxy.config.auth?.password || ''
            },
            bypassProxy: ferretConfig.proxy.config.bypassProxy || ''
          }
        };

        // Add optional disabled field if true
        if (ferretConfig.proxy.disabled === true) {
          oc.config.proxy.disabled = true;
        }

        // Add optional auth.disabled field if true
        if (ferretConfig.proxy.config?.auth?.disabled === true) {
          if (oc.config.proxy.config && oc.config.proxy.config.auth) {
            oc.config.proxy.config.auth.disabled = true;
          }
        }
      }

      // client certificates
      if (ferretConfig.clientCertificates?.certs?.length) {
        oc.config.clientCertificates = ferretConfig.clientCertificates.certs
          .map((cert: any): ClientCertificate | null => {
            if (cert.type === 'cert') {
              const pemCert: PemCertificate = {
                domain: cert.domain,
                type: 'pem',
                certificateFilePath: cert.certFilePath,
                privateKeyFilePath: cert.keyFilePath,
                ...(cert.passphrase && { passphrase: cert.passphrase }),
                ...(cert.disabled === true && { disabled: true })
              };
              return pemCert;
            } else if (cert.type === 'pfx') {
              const pkcs12Cert: Pkcs12Certificate = {
                domain: cert.domain,
                type: 'pkcs12',
                pkcs12FilePath: cert.pfxFilePath,
                ...(cert.passphrase && { passphrase: cert.passphrase }),
                ...(cert.disabled === true && { disabled: true })
              };
              return pkcs12Cert;
            } else {
              // Unsupported certificate type - ignore silently
              return null;
            }
          })
          .filter((cert: ClientCertificate | null): cert is ClientCertificate => cert !== null);
      }
    }

    // request defaults
    if (hasRequestDefaults(collectionRoot)) {
      oc.request = {};

      // headers
      if (collectionRoot.request?.headers?.length) {
        const ocHeaders: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(collectionRoot.request?.headers);
        if (ocHeaders) {
          oc.request.headers = ocHeaders;
        }
      }

      // auth
      if (hasRequestAuth(collectionRoot)) {
        const ocAuth: Auth | undefined = toOpenCollectionAuth(collectionRoot.request?.auth);
        if (ocAuth) {
          oc.request.auth = ocAuth;
        }
      }

      // variables
      if (collectionRoot.request?.vars?.req?.length) {
        const ocVariables: Variable[] | undefined = toOpenCollectionVariables(collectionRoot.request?.vars);
        if (ocVariables) {
          oc.request.variables = ocVariables;
        }
      }

      // actions (post-response variables)
      if (collectionRoot.request?.vars?.res?.length) {
        const ocActions: Action[] | undefined = toOpenCollectionActions(collectionRoot.request?.vars?.res);
        if (ocActions) {
          (oc.request as any).actions = ocActions;
        }
      }

      // scripts
      if (hasRequestScripts(collectionRoot)) {
        // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to gRPC.
        const ocScripts: Scripts | undefined = toOpenCollectionScripts(collectionRoot.request, HTTP_SCRIPT_KEYS);
        if (ocScripts) {
          oc.request.scripts = ocScripts;
        }
      }
    }

    // docs
    if (collectionRoot?.docs?.trim().length) {
      oc.docs = {
        content: collectionRoot.docs,
        type: 'text/markdown'
      };
    }

    // bundled
    oc.bundled = false;

    // extensions
    oc.extensions = {};

    const hasFerretExtensions = ferretConfig.ignore?.length || hasPresets(ferretConfig);

    if (hasFerretExtensions) {
      const ferretExtension: any = {};

      if (ferretConfig.ignore?.length) {
        const ignoreList: string[] = [];
        ferretConfig.ignore.forEach((ignore: string) => {
          ignoreList.push(ignore);
        });
        ferretExtension.ignore = ignoreList;
      }

      if (hasPresets(ferretConfig)) {
        const presetsExtension: any = {};
        const presetsRequest: any = {};
        if (ferretConfig.presets.requestType?.length) {
          presetsRequest.type = ferretConfig.presets.requestType;
        }
        if (ferretConfig.presets.requestUrl?.length) {
          presetsRequest.url = ferretConfig.presets.requestUrl;
        }
        if (Object.keys(presetsRequest).length) {
          presetsExtension.request = presetsRequest;
        }
        if (ferretConfig.presets.defaultEnvironment?.length) {
          presetsExtension.defaultEnvironment = ferretConfig.presets.defaultEnvironment;
        }
        ferretExtension.presets = presetsExtension;
      }

      oc.extensions.ferret = ferretExtension;
    }

    // ferret-specific script extensions
    const ferretScripts: Record<string, unknown> = {};
    if (ferretConfig.scripts?.additionalContextRoots?.length) {
      ferretScripts.additionalContextRoots = ferretConfig.scripts.additionalContextRoots;
    }
    if (ferretConfig.scripts?.flow === 'sandwich' || ferretConfig.scripts?.flow === 'sequential') {
      ferretScripts.flow = ferretConfig.scripts.flow;
    }
    if (Object.keys(ferretScripts).length > 0) {
      if (!oc.extensions.ferret) {
        oc.extensions.ferret = {};
      }
      (oc.extensions.ferret as any).scripts = ferretScripts;
    }

    // ferret-specific extensions
    const openApiEntries = normalizeOpenApiSyncConfigs(ferretConfig.openapi);
    if (openApiEntries.length > 0) {
      if (!oc.extensions.ferret) {
        oc.extensions.ferret = {};
      }
      (oc.extensions.ferret as any).openapi = openApiEntries;
    }

    return stringifyYml(oc);
  } catch (error) {
    console.error('Error stringifying opencollection.yml:', error);
    throw error;
  }
};

export default stringifyCollection;
