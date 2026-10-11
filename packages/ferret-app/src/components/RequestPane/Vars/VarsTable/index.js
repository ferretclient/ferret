import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { moveVar, setRequestVars } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import DataTypeSelector from 'components/DataTypeSelector';
import VarValueCell from 'components/VarValueCell';
import OptionsVarPicker from 'components/RequestPane/Vars/OptionsVarPicker';
import OptionsValueEditor from 'components/OptionsValueEditor';
import { valueToString } from '@ferretclient/common/utils';
import EditableTable from 'components/EditableTable';
import { createDescriptionColumn } from 'components/EditableTable/descriptionColumn';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import { getAllVariables, getEnvironmentOptionVariables } from 'utils/collections';

const VarsTable = ({ item, collection, vars, varType, initialScroll = 0, isDraft }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const varsWidths = focusedTab?.tableColumnWidths?.['request-vars'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const resolvableVariables = useMemo(() => getAllVariables(collection, item), [collection, item]);
  const environmentOptions = useMemo(() => getEnvironmentOptionVariables(collection), [collection]);

  const handleVarsChange = useCallback((updatedVars) => {
    dispatch(setRequestVars({
      collectionUid: collection.uid,
      itemUid: item.uid,
      vars: updatedVars,
      type: varType
    }));
  }, [dispatch, collection.uid, item.uid, varType]);

  const updateRow = (row, fields) => handleVarsChange((vars || []).map((v) => (v.uid === row.uid ? { ...v, ...fields } : v)));

  const handleVarDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveVar({
      type: varType,
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, varType, collection.uid, item.uid]);

  const getRowError = useCallback((row, index, key) => {
    if (key !== 'name') return null;
    if (!row.name || row.name.trim() === '') return null;
    if (!variableNameRegex.test(row.name)) {
      return 'Variable contains invalid characters. Must only contain alphanumeric characters, "-", "_", "."';
    }
    return null;
  }, []);

  const descriptionColumn = createDescriptionColumn({
    theme: storedTheme,
    onSave,
    onRun: handleRun,
    collection,
    item,
    nameFromRowIndex: true
  });

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      sortable: true,
      placeholder: 'Name',
      width: '20%'
    },
    {
      key: 'value',
      name: varType === 'request' ? 'Value' : (
        <div className="flex items-center">
          <span>Expr</span>
          <InfoTip className="tooltip-mod" content="You can write any valid JS expression here" infotipId={`request-${varType}-var`} />
        </div>
      ),
      placeholder: varType === 'request' ? 'Value' : 'Expr',
      render: ({ row, value, onChange, isLastEmptyRow, rowIndex }) => {
        // A request variable of the options type carries its own list of choices.
        const ownsOptions = varType === 'request' && !isLastEmptyRow && row.dataType === 'options';
        // Otherwise a request variable named like an options environment variable picks one of its options.
        const options = varType === 'request' && !isLastEmptyRow && !ownsOptions ? environmentOptions[row.name] : null;

        return (
          <VarValueCell
            editor={ownsOptions ? (
              <OptionsValueEditor variable={row} onChange={(fields) => updateRow(row, fields)} />
            ) : options ? (
              <OptionsVarPicker options={options} value={value} onChange={onChange} />
            ) : (
              <MultiLineEditor
                value={valueToString(value)}
                name={`${rowIndex}.value`}
                theme={storedTheme}
                onSave={onSave}
                onChange={onChange}
                onRun={handleRun}
                collection={collection}
                item={item}
                placeholder={value == null || (typeof value === 'string' && value.trim() === '') ? (varType === 'request' ? 'Value' : 'Expr') : ''}
              />
            )}
            renderTypeSelector={!isLastEmptyRow && varType === 'request' && !options
              ? ({ compact }) => (
                  <DataTypeSelector
                    compact={compact}
                    variable={row}
                    theme={storedTheme}
                    resolvableVariables={resolvableVariables}
                    allowOptions
                    onChange={(fields) => updateRow(row, fields)}
                  />
                )
              : null}
          />
        );
      }
    },
    descriptionColumn
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: '',
    ...(varType === 'response' ? { local: false } : {})
  };

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        tableId="request-vars"
        testId={`request-vars-${varType === 'response' ? 'res' : 'req'}`}
        columns={columns}
        rows={vars || []}
        onChange={handleVarsChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        reorderable
        onReorder={handleVarDrag}
        sortStorageKey={`request-vars-sort::${item.uid}::${varType}`}
        isDraft={isDraft}
        columnWidths={varsWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('request-vars', widths)}
        initialScroll={initialScroll}
      />
    </StyledWrapper>
  );
};

export default VarsTable;
