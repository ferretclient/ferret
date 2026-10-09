import React from 'react';
import { useDispatch } from 'react-redux';
import { setRequestVars } from 'providers/ReduxStore/slices/collections';
import OptionsVarPicker from 'components/RequestPane/Vars/OptionsVarPicker';
import { getEnvironmentOptionSelections, getUnsavedEnvironmentOptionNames, requestReferencesVariable } from 'utils/collections';
import { uuid } from 'utils/common';
import { applyOptionChoice, getChosenOptionValue } from './overrides';

/**
 * Lets this request choose which option it uses for the active environment's options variables. The
 * choice is stored as a request variable of the same name; picking the environment's own option
 * removes it again.
 *
 * - Full (Vars tab): every options variable of the environment, with an explanation.
 * - `compact` + `onlyReferenced` (under the URL bar): a single row with just the variables this request
 *   mentions as `{{name}}`, so the choice sits where the variable is used.
 *
 * Options that exist only in the environment's unsaved draft cannot be chosen here yet; a hint says so.
 */
const EnvironmentOptions = ({ item, collection, requestVars, compact = false, onlyReferenced = false }) => {
  const dispatch = useDispatch();
  const isRelevant = (name) => !onlyReferenced || requestReferencesVariable(item, name);
  const selections = getEnvironmentOptionSelections(collection).filter((selection) => isRelevant(selection.name));
  const unsavedNames = getUnsavedEnvironmentOptionNames(collection).filter(isRelevant);

  if (!selections.length && !unsavedNames.length) {
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

  const hint = unsavedNames.length ? (
    <div className="text-xs text-muted" data-testid="request-environment-options-unsaved">
      Save the environment to choose {unsavedNames.map((name) => `{{${name}}}`).join(', ')} here. Its options exist only in the unsaved editor.
    </div>
  ) : null;

  const pickers = selections.map((selection) => (
    <div className="flex items-center gap-2" key={selection.name} data-testid={`request-environment-option-${selection.name}`}>
      <span className={compact ? 'text-xs text-muted' : 'w-1/4 truncate'} title={selection.name}>{selection.name}</span>
      <div className={compact ? 'w-48' : 'w-1/2'}>
        <OptionsVarPicker
          options={selection.options}
          value={getChosenOptionValue({ vars: requestVars, name: selection.name, defaultValue: selection.defaultValue })}
          onChange={(value) => choose(selection, value)}
        />
      </div>
    </div>
  ));

  if (compact) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1" data-testid="request-environment-options-bar">
        {pickers}
        {hint}
      </div>
    );
  }

  return (
    <div className="mb-4" data-testid="request-environment-options">
      <div className="mb-1 title text-xs">Environment options</div>
      <div className="mb-2 text-xs text-muted">
        Choose which option this request uses. The choice applies to this request only.
      </div>
      <div className="flex flex-col gap-2">{pickers}</div>
      {hint && <div className="mt-2">{hint}</div>}
    </div>
  );
};

export default EnvironmentOptions;
