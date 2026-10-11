// A request chooses one of an environment's options by holding an ordinary request variable of the
// same name; the request variable shadows the environment's value for this request only.

const isActive = (variable) => variable.enabled !== false;

/** The value this request uses for the option variable: its override, else the environment's default. */
export const getChosenOptionValue = ({ vars, name, defaultValue }) => {
  const override = (vars || []).find((variable) => variable.name === name && isActive(variable));
  return override ? String(override.value ?? '') : defaultValue;
};

/** Whether this request holds its own choice instead of following the environment's default. */
export const isOptionOverridden = ({ vars, name }) => (vars || []).some((variable) => variable.name === name && isActive(variable));

/**
 * Request variables after choosing `value` for `name`. Choosing the environment's default removes the
 * override so the request follows the environment again.
 */
export const applyOptionChoice = ({ vars = [], name, value, defaultValue, createUid }) => {
  if (value === defaultValue) {
    return vars.filter((variable) => variable.name !== name);
  }
  if (vars.some((variable) => variable.name === name)) {
    return vars.map((variable) => (variable.name === name ? { ...variable, value, enabled: true } : variable));
  }
  return [...vars, { uid: createUid(), name, value, description: '', enabled: true }];
};
