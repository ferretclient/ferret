import { Variable, VariableTypedValue } from '@opencollection/types/common/variables';
import { FolderRequest as FerretFolderRequest } from '@useferret/schema-types/collection/folder';
import { Variable as FerretVariable, Variables as FerretVariables } from '@useferret/schema-types/common/variables';
import { uuid, ensureString } from '../../../utils';
import {
  isTypedValue,
  hasTypedMetadata,
  TypedVariableFields,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './datatype';

/**
 * Convert Ferret pre-request variables to OpenCollection variables format.
 * Note: Post-response variables are now converted to actions (see actions.ts).
 */
export const toOpenCollectionVariables = (variables: FerretFolderRequest['vars'] | FerretVariables | null | undefined): Variable[] | undefined => {
  // Handle folder variables (has req/res structure) - only use req vars
  const hasReqRes = variables && 'req' in variables;
  const reqVars = hasReqRes ? variables.req : variables as FerretVariables;

  const reqVarsArray = Array.isArray(reqVars) ? reqVars : [];

  if (!reqVarsArray.length) {
    return undefined;
  }

  const ocVariables: Variable[] = reqVarsArray.map((v: FerretVariable): Variable => {
    const valueStr = serializeVariableValue(v.value);
    // 'options' is not an OpenCollection value type: an options variable keeps its default key as a plain
    // value next to an `options` list.
    const isOptions = v.dataType === 'options';
    const typed: TypedVariableFields = { dataType: isOptions ? undefined : v.dataType as TypedVariableFields['dataType'] };
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

    if (v?.description?.trim().length) {
      variable.description = v.description;
    }

    if (v.enabled === false) {
      variable.disabled = true;
    }
    return variable;
  });

  return ocVariables.length > 0 ? ocVariables : undefined;
};

/**
 * Convert OpenCollection variables to Ferret pre-request variables format.
 * Note: Post-response variables come from actions (see actions.ts).
 */
export const toFerretVariables = (variables: Variable[] | null | undefined): { req: FerretVariables; res: FerretVariables } => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const reqVars: FerretVariables = [];

  variables.forEach((v: Variable) => {
    const base: FerretVariable = {
      uid: uuid(),
      name: ensureString(v.name),
      value: '',
      enabled: v.disabled !== true,
      local: false
    };

    const options = (v as Variable & { options?: unknown }).options;
    if (Array.isArray(options)) {
      base.dataType = 'options';
      base.value = ensureString(isTypedValue(v.value) ? v.value.data : v.value);
      base.options = options.map((option: any) => ({
        key: ensureString(option?.key),
        value: ensureString(option?.value)
      }));
    } else if (isTypedValue(v.value)) {
      Object.assign(base, fromOpenCollectionTypedValue(v.value));
    } else {
      base.value = ensureString(v.value);
    }

    if (v.description) {
      base.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
    }

    reqVars.push(base);
  });

  return { req: reqVars, res: [] };
};
