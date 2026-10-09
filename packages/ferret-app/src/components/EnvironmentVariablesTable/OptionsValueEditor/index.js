import React, { useState } from 'react';
import { IconPencil } from '@tabler/icons';
import Select from 'ui/Select';
import OptionsEditorModal from './OptionsEditorModal';
import StyledWrapper from './StyledWrapper';

/**
 * Value cell of an `options` environment variable: a picker for the default option (stored as
 * the variable's value) and an editor for the option list itself.
 */
const OptionsValueEditor = ({ variable, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const options = variable.options || [];

  const handleSaveOptions = (nextOptions) => {
    const keys = nextOptions.map((option) => option.key);
    // Keep the default when it survived the edit; otherwise fall back to the first option.
    const nextValue = keys.includes(variable.value) ? variable.value : (keys[0] ?? '');
    onChange({ options: nextOptions, value: nextValue });
    setIsEditing(false);
  };

  return (
    <StyledWrapper className="flex items-center gap-2 w-full">
      {options.length ? (
        <Select
          size="sm"
          className="options-select"
          data={options.map((option) => ({ value: option.key, label: `${option.key}  ·  ${option.value}` }))}
          value={variable.value}
          onChange={(key) => onChange({ value: key })}
          allowDeselect={false}
          placeholder="Default option"
          data-testid="env-var-options-default"
        />
      ) : (
        <span className="no-options">No options yet</span>
      )}
      <button
        type="button"
        className="edit-options"
        onClick={() => setIsEditing(true)}
        data-testid="env-var-options-edit"
      >
        <IconPencil size={14} strokeWidth={1.5} />
        {options.length ? `Edit (${options.length})` : 'Add options'}
      </button>
      {isEditing ? (
        <OptionsEditorModal
          variableName={variable.name}
          options={options}
          onSave={handleSaveOptions}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </StyledWrapper>
  );
};

export default OptionsValueEditor;
