import type { OpenCollection } from '@opencollection/types';
import type { FolderRoot } from '@ferret-app/schema-types/collection/folder';
import { normalizeOpenApiSyncConfigs } from '@ferret-app/common';
import { parseYml } from './utils';
import { toFerretAuth } from './common/auth';
import { toFerretHttpHeaders } from './common/headers';
import { toFerretVariables } from './common/variables';
import { toFerretPostResponseVariables } from './common/actions';
import { toFerretScripts } from './common/scripts';
import { ensureString } from '../../utils';
import type { FerretPresetsExtension } from '../../types';

interface ParsedCollection {
  collectionRoot: FolderRoot;
  ferretConfig: Record<string, any>;
}

const parseCollection = (ymlString: string): ParsedCollection => {
  try {
    const oc: OpenCollection = parseYml(ymlString);

    // ferret config
    const ferretConfig: Record<string, any> = {
      opencollection: oc.opencollection || '1.0.0',
      name: ensureString(oc.info?.name, 'Untitled Collection'),
      type: 'collection',
      ignore: []
    };

    if (oc.info?.version != null && oc.info.version !== '') {
      ferretConfig.version = ensureString(oc.info.version, '');
    }

    const ferretExtension = (oc.extensions as any)?.ferret;
    if (ferretExtension?.ignore && Array.isArray(ferretExtension.ignore)) {
      ferretConfig.ignore = ferretExtension.ignore;
    }

    // presets
    if (ferretExtension?.presets) {
      const presets = ferretExtension.presets as FerretPresetsExtension;
      if (presets.request || presets.defaultEnvironment) {
        ferretConfig.presets = {
          requestType: presets.request?.type || '',
          requestUrl: presets.request?.url || ''
        };
        if (presets.defaultEnvironment) {
          ferretConfig.presets.defaultEnvironment = presets.defaultEnvironment;
        }
      }
    }

    // ferret-specific extensions
    const ferretExtensions = oc.extensions?.ferret as any;
    if (Array.isArray(ferretExtensions?.scripts?.additionalContextRoots)) {
      const sanitizedRoots = ferretExtensions.scripts.additionalContextRoots
        .filter((item: any) => typeof item === 'string');

      if (sanitizedRoots.length > 0) {
        ferretConfig.scripts = {
          ...ferretConfig.scripts,
          additionalContextRoots: sanitizedRoots
        };
      }
    }
    // scripts.flow controls collection/folder/request script execution order
    // ('sandwich' | 'sequential'); unrecognized values fall back to the runtime default.
    if (ferretExtensions?.scripts?.flow === 'sandwich' || ferretExtensions?.scripts?.flow === 'sequential') {
      ferretConfig.scripts = {
        ...ferretConfig.scripts,
        flow: ferretExtensions.scripts.flow
      };
    }

    const openApiEntries = normalizeOpenApiSyncConfigs(ferretExtensions?.openapi);
    if (openApiEntries.length > 0) {
      ferretConfig.openapi = openApiEntries;
    }

    // protobuf
    if (oc.config?.protobuf) {
      ferretConfig.protobuf = {
        protoFiles: oc.config.protobuf.protoFiles?.map((protoFile: any) => ({
          path: protoFile.path
        })) || [],
        importPaths: oc.config.protobuf.importPaths?.map((importPath: any) => ({
          path: importPath.path,
          enabled: importPath.disabled !== true
        })) || []
      };
    }

    // proxy - only support newer format
    // Default: inherit from global preferences
    ferretConfig.proxy = {
      inherit: true,
      config: {
        protocol: 'http',
        hostname: '',
        port: '',
        auth: {
          username: '',
          password: ''
        },
        bypassProxy: ''
      }
    };

    if (oc.config?.proxy && typeof oc.config.proxy === 'object') {
      // Validate newer format: must have 'inherit' and 'config' properties
      const proxyConfig = oc.config.proxy as any;

      if ('inherit' in proxyConfig && typeof proxyConfig.inherit === 'boolean' && proxyConfig.config && typeof proxyConfig.config === 'object') {
        // Valid newer format
        ferretConfig.proxy = {
          inherit: proxyConfig.inherit,
          config: {
            protocol: proxyConfig.config.protocol || 'http',
            hostname: proxyConfig.config.hostname || '',
            port: proxyConfig.config.port || '',
            auth: {
              username: proxyConfig.config.auth?.username || '',
              password: proxyConfig.config.auth?.password || ''
            },
            bypassProxy: proxyConfig.config.bypassProxy || ''
          }
        };

        // Handle optional disabled field
        if (proxyConfig.disabled === true) {
          ferretConfig.proxy.disabled = true;
        }

        // Handle optional auth.disabled field
        if (proxyConfig.config.auth?.disabled === true) {
          ferretConfig.proxy.config.auth.disabled = true;
        }
      }
      // If not in newer format, use default (inherit: true)
    }

    // client certificates
    if (oc.config?.clientCertificates?.length) {
      ferretConfig.clientCertificates = {
        certs: oc.config.clientCertificates.map((cert: any) => {
          if (cert.type === 'pem') {
            return {
              domain: cert.domain,
              type: 'cert',
              certFilePath: cert.certificateFilePath,
              keyFilePath: cert.privateKeyFilePath,
              passphrase: cert.passphrase || '',
              ...(cert.disabled === true && { disabled: true })
            };
          } else if (cert.type === 'pkcs12') {
            return {
              domain: cert.domain,
              type: 'pfx',
              pfxFilePath: cert.pkcs12FilePath,
              passphrase: cert.passphrase || '',
              ...(cert.disabled === true && { disabled: true })
            };
          }
          return null;
        }).filter((cert: any) => cert !== null)
      };
    }

    // collection root
    const collectionRoot: FolderRoot = {
      meta: null,
      request: null,
      docs: null
    };

    // request defaults
    if (oc.request) {
      collectionRoot.request = {
        headers: null,
        auth: null,
        script: {
          req: null,
          res: null
        },
        vars: {
          req: [],
          res: []
        },
        tests: null
      };

      // headers
      const headers = toFerretHttpHeaders(oc.request.headers);
      collectionRoot.request.headers = headers || [];

      // auth
      const auth = toFerretAuth(oc.request.auth);
      if (auth) {
        collectionRoot.request.auth = auth;
      }

      // variables
      const variables = toFerretVariables(oc.request.variables);
      const postResponseVars = toFerretPostResponseVariables((oc.request as any).actions);
      collectionRoot.request.vars = {
        req: variables.req,
        res: postResponseVars
      };

      // scripts
      const scripts = toFerretScripts(oc.request.scripts);
      if (scripts?.script && collectionRoot.request.script) {
        if (scripts.script.req) {
          collectionRoot.request.script.req = scripts.script.req;
        }
        if (scripts.script.res) {
          collectionRoot.request.script.res = scripts.script.res;
        }
      }
      if (scripts?.tests) {
        collectionRoot.request.tests = scripts.tests;
      }
    }

    // docs
    if (oc.docs) {
      if (typeof oc.docs === 'string') {
        collectionRoot.docs = oc.docs;
      } else if (typeof oc.docs === 'object' && oc.docs.content) {
        collectionRoot.docs = oc.docs.content;
      }
    }

    return {
      collectionRoot,
      ferretConfig
    };
  } catch (error) {
    console.error('Error parsing collection:', error);
    throw error;
  }
};

export default parseCollection;
