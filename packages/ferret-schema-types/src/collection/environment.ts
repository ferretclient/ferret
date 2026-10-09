import type { UID, Annotation } from '../common';

export type EnvironmentVariableDataType = 'string' | 'number' | 'boolean' | 'object' | 'options';

/** One choice of an `options` variable: `key` is the label shown in pickers, `value` is sent. */
export interface EnvironmentVariableOption {
  key: string;
  value: string;
}

export interface EnvironmentVariable {
  uid: UID;
  name?: string | null;
  value?: string | number | boolean | Record<string, unknown> | null;
  type: 'text';
  enabled?: boolean;
  secret?: boolean;
  description?: string | null;
  dataType?: EnvironmentVariableDataType;
  /** Present when dataType is 'options'; `value` then holds the key of the default option. */
  options?: EnvironmentVariableOption[] | null;
  annotations?: Annotation[] | null;
}

export interface ExternalSecretVariables {
  name: string;
  [key: string]: string;
}

export interface ExternalSecrets {
  type: string;
  variables: ExternalSecretVariables[];
}

export interface Environment {
  uid: UID;
  name: string;
  variables: EnvironmentVariable[];
  externalSecrets?: ExternalSecrets;
  color?: string | null;
  extends?: string | string[] | null;
}

export type Environments = Environment[];
