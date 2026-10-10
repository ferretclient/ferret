import type { Environment as FerretEnvironment, EnvironmentVariable as FerretEnvironmentVariable } from '@ferret-app/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { parseYml } from './utils';
import { uuid, ensureString } from '../../utils';
import { isTypedValue, fromOpenCollectionTypedValue } from './common/datatype';
import { validatedEnvironmentExtendsFrom } from '@ferret-app/common/utils';

const isSecretVariable = (v: Variable | SecretVariable): v is SecretVariable => {
  return 'secret' in v && v.secret === true;
};

export const toFerretEnvironmentVariables = (variables: (Variable | SecretVariable)[] | null | undefined): FerretEnvironmentVariable[] => {
  if (!variables?.length) {
    return [];
  }

  return variables.map((v): FerretEnvironmentVariable => {
    if (isSecretVariable(v)) {
      const variable: FerretEnvironmentVariable = {
        uid: uuid(),
        name: ensureString(v.name),
        value: '',
        type: 'text',
        enabled: v.disabled !== true,
        secret: true
      };

      if (v.type && v.type !== 'string' && v.type !== 'null') {
        variable.dataType = v.type;
      }

      if (v.description) {
        variable.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
      }

      return variable;
    }

    const variable: FerretEnvironmentVariable = {
      uid: uuid(),
      name: ensureString(v.name),
      value: '',
      type: 'text',
      enabled: v.disabled !== true,
      secret: false
    };

    const options = (v as Variable & { options?: unknown }).options;
    if (Array.isArray(options)) {
      variable.dataType = 'options';
      variable.value = ensureString(isTypedValue(v.value) ? v.value.data : v.value);
      variable.options = options.map((option: any) => ({
        key: ensureString(option?.key),
        value: ensureString(option?.value)
      }));
    } else if (isTypedValue(v.value)) {
      Object.assign(variable, fromOpenCollectionTypedValue(v.value));
    } else {
      variable.value = ensureString(v.value);
    }

    if (v.description) {
      variable.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
    }

    return variable;
  });
};

const toFerretExternalSecrets = (externalSecrets: any): FerretEnvironment['externalSecrets'] | undefined => {
  if (!externalSecrets || typeof externalSecrets !== 'object') {
    return undefined;
  }

  const variables = Array.isArray(externalSecrets.variables)
    ? externalSecrets.variables.map((variable: any) => {
        const result: Record<string, string> = { name: ensureString(variable?.name) };
        Object.keys(variable || {}).forEach((key) => {
          if (key !== 'name') {
            result[key] = ensureString(variable[key]);
          }
        });
        return result;
      })
    : [];

  return { type: ensureString(externalSecrets.type), variables } as FerretEnvironment['externalSecrets'];
};

const parseEnvironment = (ymlString: string): FerretEnvironment => {
  try {
    const ocEnvironment: Environment = parseYml(ymlString);

    const ferretEnvironment: FerretEnvironment = {
      uid: uuid(),
      name: ensureString(ocEnvironment.name, 'Untitled Environment'),
      variables: toFerretEnvironmentVariables(ocEnvironment.variables),
      color: ocEnvironment.color || null
    };

    const ocEnvironmentExtendsFrom = validatedEnvironmentExtendsFrom(ocEnvironment.extends);
    if (ocEnvironmentExtendsFrom) {
      ferretEnvironment.extends = ocEnvironmentExtendsFrom;
    }

    const externalSecrets = toFerretExternalSecrets((ocEnvironment as any).externalSecrets);
    if (externalSecrets) {
      ferretEnvironment.externalSecrets = externalSecrets;
    }

    return ferretEnvironment;
  } catch (error) {
    console.error('Error parsing environment:', error);
    throw error;
  }
};

export default parseEnvironment;
