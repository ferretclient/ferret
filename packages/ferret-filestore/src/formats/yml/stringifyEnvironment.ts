import type { Environment as FerretEnvironment, EnvironmentVariable as FerretEnvironmentVariable } from '@useferret/schema-types/collection/environment';
import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable } from '@opencollection/types/common/variables';
import { stringifyYml } from './utils';
import { hasTypedMetadata, toOpenCollectionTypedValue, serializeVariableValue, type TypedVariableFields } from './common/datatype';
import { validatedEnvironmentExtendsFrom } from '@useferret/common/utils';

export const toOpenCollectionEnvironmentVariables = (variables: FerretEnvironmentVariable[]): (Variable | SecretVariable)[] | undefined => {
  if (!variables?.length) {
    return undefined;
  }

  const ocVariables: (Variable | SecretVariable)[] = variables
    .map((v: FerretEnvironmentVariable): Variable | SecretVariable => {
      // 'options' is not an OpenCollection value type: options variables carry an `options` list instead.
      const isOptions = v.dataType === 'options';
      const typed: TypedVariableFields = { dataType: isOptions ? undefined : v.dataType as TypedVariableFields['dataType'] };

      if (v.secret === true) {
        const secretVar: SecretVariable = {
          secret: true,
          name: v.name || ''
        };
        if (hasTypedMetadata(typed)) {
          secretVar.type = typed.dataType;
        }
        if (v.enabled === false) {
          secretVar.disabled = true;
        }
        if (v.description !== undefined) {
          secretVar.description = v.description;
        }
        return secretVar;
      }

      const valueStr = serializeVariableValue(v.value);

      // An options variable keeps its default key as a plain value next to the `options` list.
      const variable: Variable = {
        name: v.name || '',
        value: hasTypedMetadata(typed) ? toOpenCollectionTypedValue(typed, valueStr) : valueStr
      };
      if (isOptions) {
        (variable as Variable & { options?: { key: string; value: string }[] }).options = (v.options || []).map((option) => ({
          key: option.key,
          value: option.value ?? ''
        }));
      }

      if (v.enabled === false) {
        variable.disabled = true;
      }

      if (v.description !== undefined) {
        variable.description = v.description;
      }

      return variable;
    });

  return ocVariables.length > 0 ? ocVariables : undefined;
};

const stringifyEnvironment = (environment: FerretEnvironment): string => {
  try {
    const ocEnvironment: Environment = {
      name: environment.name
    };

    const environmentExtendsFrom = validatedEnvironmentExtendsFrom(environment.extends);
    if (environmentExtendsFrom) {
      (ocEnvironment as any).extends = environmentExtendsFrom;
    }

    if (environment.color) {
      ocEnvironment.color = environment.color;
    }

    if (environment.variables?.length) {
      const ocVariables = toOpenCollectionEnvironmentVariables(environment.variables);
      if (ocVariables) {
        ocEnvironment.variables = ocVariables;
      }
    }

    if (environment.externalSecrets) {
      (ocEnvironment as any).externalSecrets = {
        type: environment.externalSecrets.type,
        variables: (environment.externalSecrets.variables || []).map((variable) => ({ ...variable }))
      };
    }

    return stringifyYml(ocEnvironment);
  } catch (error) {
    console.error('Error stringifying environment:', error);
    throw error;
  }
};
export default stringifyEnvironment;
