import { validatedEnvironmentName } from '@useferret/common/utils';
import { uuid } from '../common/index.js';
import {
  isTypedValue,
  hasTypedMetadata,
  TypedVariableFields,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './common/datatype';
import type {
  Environment,
  Variable,
  FerretEnvironment,
  FerretEnvironmentVariable
} from './types';

interface OCVariableOption {
  key: string;
  value: string;
}

interface OCVariable extends Omit<Variable, 'value'> {
  name: string;
  value?: string | { type: string; data: unknown };
  secret?: boolean;
  disabled?: boolean;
  // Ferret options variable: `value` is then the key of the default option
  options?: OCVariableOption[];
}

const toOptionStrings = (options: unknown[]): OCVariableOption[] =>
  options.map((option: any) => ({ key: String(option?.key ?? ''), value: String(option?.value ?? '') }));

export const fromOpenCollectionEnvironments = (environments: Environment[] | undefined): FerretEnvironment[] => {
  if (!environments?.length) {
    return [];
  }

  return environments.map((env): FerretEnvironment => ({
    uid: uuid(),
    name: env.name || 'Untitled Environment',
    variables: (env.variables || []).map((v): FerretEnvironmentVariable => {
      const variable = v as OCVariable;
      const isSecret = variable.secret === true;

      const result: FerretEnvironmentVariable = {
        uid: uuid(),
        name: variable.name || '',
        value: '',
        type: 'text',
        enabled: variable.disabled !== true,
        secret: isSecret
      };

      if (isSecret) {
        // Secret values are not present in the source; never carry a dataType.
        if (variable.description) {
          result.description = 
          	typeof variable.description === 'string'
            	? variable.description
	            : (variable.description as { content?: string })?.content || '';
	      
        }
        return result;
      }

      if (variable.value === undefined && !Array.isArray(variable.options)) {
        return result;
      }

      if (Array.isArray(variable.options)) {
        result.dataType = 'options';
        result.value = isTypedValue(variable.value) ? String(variable.value.data ?? '') : String(variable.value ?? '');
        result.options = toOptionStrings(variable.options);
      } else if (isTypedValue(variable.value)) {
        Object.assign(result, fromOpenCollectionTypedValue(variable.value));
      } else if (typeof variable.value === 'string') {
        result.value = variable.value;
      }

      if (variable.description) {
        result.description = typeof variable.description === 'string'
          ? variable.description
          : (variable.description as { content?: string })?.content || '';
      }

      return result;
    }),
    color: env.color || null,
    extends: validatedEnvironmentName(env.extends) || null
  }));
};

export const toOpenCollectionEnvironments = (environments: FerretEnvironment[] | undefined): Environment[] | undefined => {
  if (!environments?.length) {
    return undefined;
  }

  return environments.map((env): Environment => {
    const ocEnv: Environment = {
      name: env.name || 'Untitled Environment',
      color: env.color ?? undefined,
      variables: (env.variables || []).map((v): OCVariable => {
        const ocVar: OCVariable = { name: v.name || '' };

        if (v.secret) {
          ocVar.secret = true;
          // Secret variables don't include the value in export.
        } else {
          const valueStr = serializeVariableValue(v.value);
          if (v.dataType === 'options') {
            ocVar.value = valueStr;
            ocVar.options = toOptionStrings(v.options || []);
          } else {
            // Not an options variable here, so the data type is one of the OpenCollection value types.
            const typed = v as TypedVariableFields;
            ocVar.value = hasTypedMetadata(typed) ? toOpenCollectionTypedValue(typed, valueStr) : valueStr;
          }
        }

        if (v.enabled === false) {
          ocVar.disabled = true;
        }

        if (v.description && typeof v.description === 'string' && v.description.trim().length) {
          ocVar.description = v.description;
        }

        return ocVar;
      }) as Variable[]
    };

    const environmentExtendsFrom = validatedEnvironmentName(env.extends);
    if (environmentExtendsFrom) {
      ocEnv.extends = environmentExtendsFrom;
    }

    return ocEnv;
  });
};
