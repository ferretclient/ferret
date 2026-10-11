import { OpenCollection } from "@opencollection/types";
import { normalizeOpenApiSyncConfigs } from "@ferretclient/common";
import { FerretCollection, FerretCollectionRoot, FerretConfig, FerretPresets, PemCertificate, Pkcs12Certificate } from "./types";
import { fromOpenCollectionActions, fromOpenCollectionAuth, fromOpenCollectionHeaders, fromOpenCollectionScripts, fromOpenCollectionVariables } from "./common";
import { uuid } from "../common";
import { fromOpenCollectionItems } from "./items";
import { fromOpenCollectionFolder } from "./folder";
import { fromOpenCollectionEnvironments } from "./environment";
import { HTTP_SCRIPT_KEYS } from '@ferretclient/common';

const fromOpenCollectionConfig = (oc: OpenCollection): FerretConfig => {
  const ferretExtension = oc.extensions?.ferret as {
    ignore?: string[];
    presets?: FerretPresets;
    scripts?: { flow?: unknown };
    openapi?: FerretConfig['openapi'];
  } | undefined;

  const ignoreList = ferretExtension && Array.isArray(ferretExtension.ignore)
    ? ferretExtension.ignore
    : ['node_modules', '.git'];

  const ferretConfig: FerretConfig = {
    name: oc.info?.name || 'Untitled Collection',
    type: 'collection',
    ignore: ignoreList
  };

  if (oc.info?.version != null && oc.info.version !== '') {
    ferretConfig.version = String(oc.info.version);
  }

  if (ferretExtension?.presets?.requestType || ferretExtension?.presets?.requestUrl || ferretExtension?.presets?.defaultEnvironment) {
    ferretConfig.presets = {};
    if (ferretExtension.presets.requestType) {
      ferretConfig.presets.requestType = ferretExtension.presets.requestType;
    }
    if (ferretExtension.presets.requestUrl) {
      ferretConfig.presets.requestUrl = ferretExtension.presets.requestUrl;
    }
    if (ferretExtension.presets.defaultEnvironment) {
      ferretConfig.presets.defaultEnvironment = ferretExtension.presets.defaultEnvironment;
    }
  }

  const scriptFlow = ferretExtension?.scripts?.flow;
  if (scriptFlow === 'sandwich' || scriptFlow === 'sequential') {
    ferretConfig.scripts = { flow: scriptFlow };
  }

  const openApiEntries = normalizeOpenApiSyncConfigs(ferretExtension?.openapi);
  if (openApiEntries.length > 0) {
    ferretConfig.openapi = openApiEntries;
  }

  const config = oc.config;
  if (!config) {
    return ferretConfig;
  }

  if (config.protobuf) {
    ferretConfig.protobuf = {
      protoFiles: config.protobuf.protoFiles?.map((f) => ({
        path: f.path
      })),
      importPaths: config.protobuf.importPaths?.map((p) => ({
        path: p.path,
        enabled: p.disabled !== true
      }))
    };
  }

  if (config.proxy) {
    ferretConfig.proxy = {
      disabled: config.proxy.disabled,
      inherit: config.proxy.inherit,
      config: config.proxy.config
    };
  }

  if (config.clientCertificates?.length) {
    ferretConfig.clientCertificates = {
      certs: config.clientCertificates.map((cert) => {
        const disabled = cert.disabled === true;
        if (cert.type === 'pem') {
          const pemCert = cert as PemCertificate;
          return {
            domain: pemCert.domain || '',
            type: 'cert' as const,
            certFilePath: pemCert.certificateFilePath || '',
            keyFilePath: pemCert.privateKeyFilePath || '',
            passphrase: pemCert.passphrase || '',
            ...(disabled && { disabled: true })
          };
        } else if (cert.type === 'pkcs12') {
          const pkcs12Cert = cert as Pkcs12Certificate;
          return {
            domain: pkcs12Cert.domain || '',
            type: 'pfx' as const,
            pfxFilePath: pkcs12Cert.pkcs12FilePath || '',
            passphrase: pkcs12Cert.passphrase || '',
            ...(disabled && { disabled: true })
          };
        }
        return null;
      }).filter((cert): cert is NonNullable<typeof cert> => cert !== null)
    };
  }

  return ferretConfig;
};

const fromOpenCollectionRoot = (oc: OpenCollection): FerretCollectionRoot => {
  const root: FerretCollectionRoot = {};

  if (oc.request) {
    // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
    const scripts = fromOpenCollectionScripts(oc.request.scripts, HTTP_SCRIPT_KEYS);
    root.request = {
      headers: fromOpenCollectionHeaders(oc.request.headers),
      auth: fromOpenCollectionAuth(oc.request.auth),
      script: scripts?.script,
      vars: {
        ...fromOpenCollectionVariables(oc.request.variables),
        res: fromOpenCollectionActions(oc.request.actions)
      },
      tests: scripts?.tests
    };
  }

  if (oc.docs) {
    root.docs = typeof oc.docs === 'string'
      ? oc.docs
      : oc.docs.content || '';
  }

  root.meta = {
    name: oc.info?.name || 'Untitled Collection'
  };

  return root;
};

export const openCollectionToFerret = (openCollection: OpenCollection): FerretCollection => {
  const ferretCollection: FerretCollection = {
    uid: uuid(),
    name: openCollection.info?.name || 'Untitled Collection',
    version: '1',
    items: fromOpenCollectionItems(openCollection.items, (folder: unknown) => fromOpenCollectionFolder(folder as Parameters<typeof fromOpenCollectionFolder>[0])),
    environments: fromOpenCollectionEnvironments(openCollection.config?.environments),
    ferretConfig: fromOpenCollectionConfig(openCollection) as Record<string, unknown>,
    root: fromOpenCollectionRoot(openCollection)
  };

  return ferretCollection;
};