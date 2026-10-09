import React from 'react';
import { useDispatch } from 'react-redux';
import { setRequestVars } from 'providers/ReduxStore/slices/collections';
import OptionsVarPicker from 'components/RequestPane/Vars/OptionsVarPicker';
import { getEnvironmentOptionSelections } from 'utils/collections';
import { uuid } from 'utils/common';
import { applyOptionChoice, getChosenOptionValue } from './overrides';

/**
 * Lists the active environment's options variables so this request can choose which option it uses.
 * The choice is stored as a request variable of the same name; picking the environment's own option
 * removes it again.
 */
const EnvironmentOptions = ({ item, collection, requestVars }) => {
  const dispatch = useDispatch();
  const selections = getEnvironmentOptionSelections(collection);

  if (!selections.length) {
    return null;
  }

  const choose = ({ name, defaultValue }, value) => {
    dispatch(setRequestVars({
      collectionUid: collection.uid,
      itemUid: item.uid,
      vars: applyOptionChoice({ vars: requestVars, name, value, defaultValue, createUid: uuid }),
      type: 'request'
    }));
  };

  return (
    <div className="mb-4" data-testid="request-environment-options">
      <div className="mb-1 title text-xs">Environment options</div>
      <div className="mb-2 text-xs text-muted">
        Choose which option this request uses. The choice applies to this request only.
      </div>
      <div className="flex flex-col gap-2">
        {selections.map((selection) => (
          <div className="flex items-center gap-3" key={selection.name} data-testid={`request-environment-option-${selection.name}`}>
            <span className="w-1/4 truncate" title={selection.name}>{selection.name}</span>
            <div className="w-1/2">
              <OptionsVarPicker
                options={selection.options}
                value={getChosenOptionValue({ vars: requestVars, name: selection.name, defaultValue: selection.defaultValue })}
                onChange={(value) => choose(selection, value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvironmentOptions;
