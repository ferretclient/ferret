import React, { useState } from 'react';
import { IconPlus, IconTrash } from '@tabler/icons';
import { validateEnvironmentVariableOptions } from '@ferret-app/common/utils';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const EMPTY_ROW = { key: '', value: '' };

const OptionsEditorModal = ({ variableName, options, onSave, onClose }) => {
  const [rows, setRows] = useState(() => (options?.length ? options.map((option) => ({ ...option })) : [{ ...EMPTY_ROW }]));
  const [error, setError] = useState(null);

  const updateRow = (index, field, fieldValue) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: fieldValue } : row)));
    setError(null);
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_row, i) => i !== index));
    setError(null);
  };

  const handleConfirm = () => {
    const filled = rows
      .filter((row) => row.key.trim() !== '' || row.value !== '')
      .map((row) => ({ key: row.key.trim(), value: row.value }));
    const validationError = validateEnvironmentVariableOptions(filled);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(filled);
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={`Options for ${variableName || 'variable'}`}
        confirmText="Save"
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        dataTestId="env-var-options-modal"
      >
        <StyledWrapper>
          <p className="options-help">
            Requests receive the value of the selected option. The name is what you pick from.
          </p>
          <table className="options-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className="textbox w-full"
                      placeholder="Company1"
                      value={row.key}
                      onChange={(e) => updateRow(index, 'key', e.target.value)}
                      data-testid={`env-var-option-key-${index}`}
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="textbox w-full"
                      placeholder="12345"
                      value={row.value}
                      onChange={(e) => updateRow(index, 'value', e.target.value)}
                      data-testid={`env-var-option-value-${index}`}
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </td>
                  <td className="remove-cell">
                    <button
                      type="button"
                      className="remove-option"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove option ${row.key || index + 1}`}
                      data-testid={`env-var-option-remove-${index}`}
                    >
                      <IconTrash size={16} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="add-option"
            onClick={() => setRows((current) => [...current, { ...EMPTY_ROW }])}
            data-testid="env-var-option-add"
          >
            <IconPlus size={14} strokeWidth={2} />
            Add option
          </button>
          {error ? <div className="options-error" role="alert">{error}</div> : null}
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default OptionsEditorModal;
