import { Annotation } from './annotation';
import type { UID } from './uid';

export type VariableDataType = 'string' | 'number' | 'boolean' | 'object' | 'options';

/** One choice of an `options` variable: `key` is the label shown in pickers, `value` is sent. */
export interface VariableOption {
  key: string;
  value: string;
}

/**
 * Request-scoped variable entry.
 */
export interface Variable {
  uid: UID;
  name?: string | null;
  value?: string | number | boolean | Record<string, unknown> | null;
  description?: string | null;
  enabled?: boolean;
  local?: boolean;
  dataType?: VariableDataType;
  /** Present when dataType is 'options'; `value` then holds the key of the default option. */
  options?: VariableOption[] | null;
  annotations?: Annotation[] | null;
}

export type Variables = Variable[] | null;
