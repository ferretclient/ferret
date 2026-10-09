import { uuid } from '../../common/index.js';
import type {
  Variable,
  FerretVariable,
  FerretVariables
} from '../types';
import {
  isTypedValue,
  hasTypedMetadata,
  TypedVariableFields,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './datatype';

interface FerretVars {
  req: FerretVariables;
  res: FerretVariables;
}

export const fromOpenCollectionVariables = (variables: Variable[] | undefined): FerretVars => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const reqVars: FerretVariable[] = [];

  variables.forEach((v: Variable) => {
    const variable: FerretVariable = {
      uid: uuid(),
      name: v.name || '',
      value: '',
      enabled: v.disabled !== true,
      local: false
    };

    const options = (v as Variable & { options?: unknown }).options;
    if (Array.isArray(options)) {
      variable.dataType = 'options';
      variable.value = isTypedValue(v.value) ? String(v.value.data ?? '') : typeof v.value === 'string' ? v.value : '';
      variable.options = options.map((option: any) => ({ key: String(option?.key ?? ''), value: String(option?.value ?? '') }));
    } else if (isTypedValue(v.value)) {
      Object.assign(variable, fromOpenCollectionTypedValue(v.value));
    } else if (typeof v.value === 'string') {
      variable.value = v.value;
    }

    if (v.description) {
      variable.description = typeof v.description === 'string'
        ? v.description
        : (v.description as { content?: string })?.content || '';
    }

    reqVars.push(variable);
  });

  return { req: reqVars, res: [] };
};

export const toOpenCollectionVariables = (vars: FerretVars | { req?: FerretVariables; res?: FerretVariables } | null | undefined): Variable[] | undefined => {
  // Handle folder variables (has req/res structure) - only use req vars
  const hasReqRes = vars && 'req' in vars;
  const reqVars = hasReqRes ? vars.req : vars as FerretVariables;

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

    if (v.description && typeof v.description === 'string' && v.description.trim().length) {
      variable.description = v.description;
    }

    if (v.enabled === false) {
      variable.disabled = true;
    }

    return variable;
  });

  return ocVariables.length > 0 ? ocVariables : undefined;
};
