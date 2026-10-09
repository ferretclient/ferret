import React from 'react';
import Select from 'ui/Select';

/**
 * Value editor for a request variable named like an `options` environment variable. Lists the
 * option names and stores the chosen option's value, so the request overrides the environment's
 * default with an ordinary request variable.
 */
const OptionsVarPicker = ({ options, value, onChange }) => {
  const data = options.map((option) => ({ value: option.value, label: option.key }));
  const currentValue = value === null || value === undefined ? '' : String(value);

  // A value that no longer matches an option (e.g. the option was edited) stays visible as-is.
  if (currentValue && !options.some((option) => option.value === currentValue)) {
    data.push({ value: currentValue, label: `${currentValue} (not in options)` });
  }

  return (
    <Select
      size="sm"
      data={data}
      value={currentValue}
      onChange={onChange}
      allowDeselect={false}
      appendTo={() => document.body}
      placeholder="Choose an option"
      data-testid="request-var-options-picker"
    />
  );
};

export default OptionsVarPicker;
