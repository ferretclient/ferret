import { normalizeOpenApiSyncConfigs } from "@ferretclient/common";
import { toOpenCollectionActions, toOpenCollectionAuth, toOpenCollectionHeaders, toOpenCollectionScripts, toOpenCollectionVariables } from "./common";
import { toOpenCollectionEnvironments } from "./environment";
import { toOpenCollectionFolder } from "./folder";
import { toOpenCollectionItems } from "./items";
import { FerretCollection, FerretCollectionRoot, FerretConfig, FerretPresets, ClientCertificate, CollectionConfig, OpenCollection, PemCertificate, Pkcs12Certificate, Protobuf } from "./types";
import { HTTP_SCRIPT_KEYS } from '@ferretclient/common';

const toOpenCollectionConfig = (ferretConfig: FerretConfig | undefined): CollectionConfig | undefined => {
  if (!ferretConfig) {
    return undefined;
  }

  const config: CollectionConfig = {};

  if (ferretConfig.protobuf?.protoFiles?.length || ferretConfig.protobuf?.importPaths?.length) {
    config.protobuf = {} as Protobuf;

    if (ferretConfig.protobuf.protoFiles?.length) {
      config.protobuf.protoFiles = ferretConfig.protobuf.protoFiles.map((f) => ({
        type: 'file' as const,
        path: f.path
      }));
    }

    if (ferretConfig.protobuf.importPaths?.length) {
      config.protobuf.importPaths = ferretConfig.protobuf.importPaths.map((p) => {
        const importPath: { path: string; disabled?: boolean } = { path: p.path };
        if (p.enabled === false) {
          importPath.disabled = true;
        }
        return importPath;
      });
    }
  }

  if (ferretConfig.proxy) {
    config.proxy = {
      disabled: ferretConfig.proxy.disabled,
      inherit: ferretConfig.proxy.inherit,
      config: ferretConfig.proxy.config
    };
  }

  if (ferretConfig.clientCertificates?.certs?.length) {
    config.clientCertificates = ferretConfig.clientCertificates.certs
      .map((cert): ClientCertificate | null => {
        if (cert.type === 'cert') {
          const pemCert: PemCertificate = {
            domain: cert.domain || '',
            type: 'pem',
            certificateFilePath: cert.certFilePath || '',
            privateKeyFilePath: cert.keyFilePath || ''
          };
          if (cert.passphrase) {
            pemCert.passphrase = cert.passphrase;
          }
          if (cert.disabled === true) {
            pemCert.disabled = true;
          }
          return pemCert;
        } else if (cert.type === 'pfx') {
          const pkcs12Cert: Pkcs12Certificate = {
            domain: cert.domain || '',
            type: 'pkcs12',
            pkcs12FilePath: cert.pfxFilePath || ''
          };
          if (cert.passphrase) {
            pkcs12Cert.passphrase = cert.passphrase;
          }
          if (cert.disabled === true) {
            pkcs12Cert.disabled = true;
          }
          return pkcs12Cert;
        }
        return null;
      })
      .filter((cert): cert is ClientCertificate => cert !== null);
  }

  return Object.keys(config).length > 0 ? config : undefined;
};

const hasRequestDefaults = (root: FerretCollectionRoot | undefined): boolean => {
  const request = root?.request;
  return Boolean(
    request?.headers?.length ||
    request?.vars?.req?.length ||
    request?.vars?.res?.length ||
    request?.script?.req ||
    request?.script?.res ||
    request?.tests ||
    (request?.auth && request.auth.mode !== 'none')
  );
};

export const ferretToOpenCollection = (collection: FerretCollection): OpenCollection => {
  const ferretConfig = collection.ferretConfig as FerretConfig | undefined;

  const collectionVersion = ferretConfig?.version;
  const hasCollectionVersion = collectionVersion != null && collectionVersion !== '';

  const openCollection: OpenCollection = {
    opencollection: '1.0.0',
    info: {
      name: collection.name || 'Untitled Collection',
      ...(hasCollectionVersion ? { version: String(collectionVersion) } : {})
    }
  };

  const config = toOpenCollectionConfig(ferretConfig);
  if (config) {
    openCollection.config = config;
  }

  const environments = toOpenCollectionEnvironments(collection.environments ?? undefined);
  if (environments?.length) {
    if (!openCollection.config) {
      openCollection.config = {};
    }
    openCollection.config.environments = environments;
  }

  const items = toOpenCollectionItems(collection.items, toOpenCollectionFolder);
  if (items.length) {
    openCollection.items = items as OpenCollection['items'];
  }

  if (hasRequestDefaults(collection.root as FerretCollectionRoot)) {
    const request = (collection.root as FerretCollectionRoot)?.request;
    openCollection.request = {};

    const headers = toOpenCollectionHeaders(request?.headers);
    if (headers) {
      openCollection.request.headers = headers;
    }

    const auth = toOpenCollectionAuth(request?.auth);
    if (auth) {
      openCollection.request.auth = auth;
    }

    const variables = toOpenCollectionVariables(request?.vars);
    if (variables) {
      openCollection.request.variables = variables;
    }

    const actions = toOpenCollectionActions(request?.vars?.res);
    if (actions) {
      openCollection.request.actions = actions;
    }
    // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
    const scripts = toOpenCollectionScripts(request as any, HTTP_SCRIPT_KEYS);
    if (scripts) {
      openCollection.request.scripts = scripts;
    }
  }

  if ((collection.root as FerretCollectionRoot)?.docs) {
    openCollection.docs = {
      content: (collection.root as FerretCollectionRoot).docs!,
      type: 'text/markdown'
    };
  }

  openCollection.bundled = true;

  const ferretExtension: {
    ignore?: string[];
    presets?: FerretPresets;
    scripts?: { flow?: 'sandwich' | 'sequential' };
    openapi?: FerretConfig['openapi'];
  } = {};

  if (ferretConfig?.ignore?.length) {
    ferretExtension.ignore = ferretConfig.ignore;
  }

  const presets = ferretConfig?.presets;
  if (presets?.requestType || presets?.requestUrl || presets?.defaultEnvironment) {
    ferretExtension.presets = {};
    if (presets.requestType) {
      ferretExtension.presets.requestType = presets.requestType;
    }
    if (presets.requestUrl) {
      ferretExtension.presets.requestUrl = presets.requestUrl;
    }
    if (presets.defaultEnvironment) {
      ferretExtension.presets.defaultEnvironment = presets.defaultEnvironment;
    }
  }

  const scriptFlow = ferretConfig?.scripts?.flow;
  if (scriptFlow === 'sandwich' || scriptFlow === 'sequential') {
    ferretExtension.scripts = { flow: scriptFlow };
  }

  const openApiEntries = normalizeOpenApiSyncConfigs(ferretConfig?.openapi);
  if (openApiEntries.length > 0) {
    ferretExtension.openapi = openApiEntries;
  }

  if (Object.keys(ferretExtension).length > 0) {
    openCollection.extensions = {
      ferret: ferretExtension
    };
  }

  return openCollection;
};