import type { Action, ActionSetVariable, ActionVariableScope } from '@opencollection/types/common/actions';
import type { Variable as FerretVariable, Variables as FerretVariables } from '@ferret-app/schema-types/common/variables';
import { uuid, ensureString } from '../../../utils';

/**
 * Convert Ferret post-response variables to OpenCollection actions.
 * Post-response variables in Ferret are converted to 'set-variable' actions
 * with phase 'after-response'.
 */
export const toOpenCollectionActions = (resVariables: FerretVariables | null | undefined): Action[] | undefined => {
  if (!resVariables?.length) {
    return undefined;
  }

  const actions: Action[] = resVariables.map((v: FerretVariable): ActionSetVariable => {
    const action: ActionSetVariable = {
      type: 'set-variable',
      phase: 'after-response',
      selector: {
        expression: ensureString(v.value),
        method: 'jsonq'
      },
      variable: {
        name: v.name || '',
        scope: v.local ? 'request' : 'runtime' as ActionVariableScope
      }
    };

    if (v.description?.trim().length) {
      action.description = v.description;
    }

    if (v.enabled === false) {
      action.disabled = true;
    }

    return action;
  });

  return actions.length > 0 ? actions : undefined;
};

/**
 * Convert OpenCollection actions to Ferret post-response variables.
 * Only 'set-variable' actions with phase 'after-response' are converted.
 */
export const toFerretPostResponseVariables = (actions: Action[] | null | undefined): FerretVariables => {
  if (!actions?.length) {
    return [];
  }

  const resVars: FerretVariables = [];

  actions.forEach((action: Action) => {
    // Only process 'set-variable' actions with 'after-response' phase
    if (action.type === 'set-variable' && action.phase === 'after-response') {
      const setVarAction = action as ActionSetVariable;

      const variable: FerretVariable = {
        uid: uuid(),
        name: ensureString(setVarAction.variable?.name),
        value: ensureString(setVarAction.selector?.expression),
        enabled: setVarAction.disabled !== true,
        local: false
      };

      if (setVarAction.description) {
        variable.description = typeof setVarAction.description === 'string'
          ? setVarAction.description
          : (setVarAction.description as any)?.content || '';
      }

      resVars.push(variable);
    }
  });

  return resVars;
};
