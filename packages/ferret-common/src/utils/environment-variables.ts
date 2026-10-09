/**
 * One choice of an `options` environment variable: `key` is the label shown in pickers,
 * `value` is what requests receive.
 */
export interface EnvironmentVariableOption {
  key: string;
  value: string;
}

export interface EnvironmentVariable {
  name?: string;
  value?: unknown;
  enabled?: boolean;
  secret?: boolean;
  dataType?: string;
  options?: EnvironmentVariableOption[] | null;
}

/**
 * Environment-only data type: the variable holds a list of key → value options and its `value`
 * is the key of the default option. Kept out of FERRET_VARIABLE_DATATYPES, which lists the scalar
 * types every variable level supports.
 */
export const OPTIONS_DATATYPE = 'options';

export const isOptionsVariable = (variable: EnvironmentVariable | null | undefined): boolean =>
  variable?.dataType === OPTIONS_DATATYPE && Array.isArray(variable.options);

/**
 * The value an `options` variable resolves to: the value of the option whose key it holds. With no
 * key set it falls back to the first option; a value that is not a key (e.g. written by a script)
 * is used as-is.
 */
export const resolveOptionsVariableValue = (variable: EnvironmentVariable): unknown => {
  const options = variable.options || [];
  const selected = options.find((option) => option.key === variable.value);
  if (selected) {
    return selected.value;
  }
  if (variable.value === undefined || variable.value === null || variable.value === '') {
    return options[0]?.value ?? '';
  }
  return variable.value;
};

/**
 * Problem with an options list as a user-facing message, or null when it is valid. Keys must be
 * present and unique, and may not contain "=", which separates key and value on disk.
 */
export const validateEnvironmentVariableOptions = (options: EnvironmentVariableOption[] = []): string | null => {
  const keys = new Set<string>();
  for (const option of options) {
    const key = (option.key || '').trim();
    if (!key) return 'Every option needs a name';
    if (key.includes('=')) return `Option name "${key}" cannot contain "="`;
    if (keys.has(key)) return `Option name "${key}" is used more than once`;
    keys.add(key);
  }
  return null;
};

/**
 * Flattens environment variables into a name → value map. Later entries override earlier ones, so
 * callers order the list by precedence (inherited variables ahead of the environment's own), and a
 * secret wins over a plain variable of the same name whichever order the two appear in.
 */
export const toVariablesMap = (environmentVariables: EnvironmentVariable[] = []): Record<string, unknown> => {
  const variables: Record<string, unknown> = {};
  const secretNames = new Set<string>();

  for (const variable of environmentVariables) {
    if (!variable.name || !variable.enabled) {
      continue;
    }
    if (variable.secret) {
      secretNames.add(variable.name);
    } else if (secretNames.has(variable.name)) {
      continue;
    }
    variables[variable.name] = isOptionsVariable(variable) ? resolveOptionsVariableValue(variable) : variable.value;
  }

  return variables;
};
