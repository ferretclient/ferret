import React from 'react';
import {
  IconAlertCircle,
  IconBraces,
  IconCaretDown,
  IconList,
  IconNumbers,
  IconLetterT,
  IconToggleRight
} from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import {
  FERRET_VARIABLE_DATATYPES,
  OPTIONS_DATATYPE,
  isOptionsVariable,
  resolveOptionsVariableValue,
  validateVariableType
} from '@ferretclient/common/utils';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const TYPE_ICONS = {
  string: IconLetterT,
  number: IconNumbers,
  boolean: IconToggleRight,
  object: IconBraces,
  options: IconList
};

const TYPE_ICONS_SIZES = {
  string: 16,
  number: 18,
  boolean: 18,
  object: 18,
  options: 16
};

/**
 * Fields to write when a variable switches to `type`, or null when nothing changes. Switching to
 * options seeds the list with the current value, and leaving options keeps the value requests were
 * receiving, so a type switch never silently loses data.
 */
export const getTypeChangeFields = (variable, type) => {
  const selectedType = variable.dataType || 'string';
  if (type === selectedType) return null;

  if (type === OPTIONS_DATATYPE) {
    const currentValue = variable.value === null || variable.value === undefined ? '' : String(variable.value);
    const options = currentValue ? [{ key: 'Default', value: currentValue }] : [];
    return { dataType: OPTIONS_DATATYPE, options, value: options[0]?.key ?? '' };
  }

  const dataType = type === 'string' ? undefined : type;
  if (isOptionsVariable(variable)) {
    return { dataType, options: undefined, value: resolveOptionsVariableValue(variable) };
  }
  return { dataType };
};

// `allowOptions` adds the `options` type (a list of named values to pick from).
const DataTypeSelector = ({ variable, resolvableVariables, onChange, compact = false, allowOptions = false }) => {
  const selectedType = variable.dataType || 'string';
  const typeError = validateVariableType(variable.value, selectedType, resolvableVariables);

  const handleTypeChange = (type) => {
    const fields = getTypeChangeFields(variable, type);
    if (fields) onChange(fields);
  };

  const types = allowOptions ? [...FERRET_VARIABLE_DATATYPES, OPTIONS_DATATYPE] : FERRET_VARIABLE_DATATYPES;
  const items = types.map((type) => ({
    id: type,
    label: type,
    onClick: () => handleTypeChange(type)
  }));

  const TypeIcon = TYPE_ICONS[selectedType] || IconLetterT;

  return (
    <StyledWrapper>
      <div className="flex items-center relative shrink-0">
        <MenuDropdown
          items={items}
          selectedItemId={selectedType}
          placement="bottom-end"
          showTickMark={true}
          appendTo={() => document.body}
          data-testid="datatype-selector-trigger"
        >
          <div
            className="flex items-center cursor-pointer select-none"
            data-selected-type={selectedType}
            aria-label={`Data type: ${selectedType}`}
          >
            {compact ? (
              <TypeIcon className="type-icon" size={TYPE_ICONS_SIZES[selectedType]} strokeWidth={2} />
            ) : (
              <span className="type-label">{selectedType}</span>
            )}
            <IconCaretDown className="caret-icon ml-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
        {typeError && (
          <span className="ml-1">
            <IconAlertCircle
              data-tooltip-id={`type-error-${variable.uid}`}
              className="text-yellow-600 cursor-pointer"
              size={16}
            />
            <Tooltip
              positionStrategy="absolute"
              className="tooltip-mod"
              id={`type-error-${variable.uid}`}
              content={typeError}
              place="top"
            />
          </span>
        )}
      </div>
    </StyledWrapper>
  );
};

export default React.memo(DataTypeSelector);
