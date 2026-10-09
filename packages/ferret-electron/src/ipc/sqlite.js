const { ipcMain } = require('electron');
const { getStatements, getFiles } = require('../services/sqlite');
const { readRunnerExchange, clearRunnerResponses } = require('../services/runner-exchange');
const { listHistory, getHistoryEntry, deleteHistoryEntry, clearHistory } = require('../services/request-history');

const requireUid = (value, name) => {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
};

const requireFileId = (value) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('id must be a positive integer');
  }
  return value;
};

const requireHistoryId = (value) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('id must be a positive integer');
  }
  return value;
};

const registerSqliteIpc = (mainWindow) => {
  // Tells the renderer's History list to reload after entries are removed, as it does after a new send.
  const notifyHistoryChanged = () => mainWindow?.webContents.send('main:history-updated');

  ipcMain.handle('datastore:file-index:file_index_size', () => {
    return getStatements().execute('file_index_size');
  });

  ipcMain.handle('datastore:file-index:file_index_clear', () => {
    return getStatements().execute('file_index_clear');
  });

  ipcMain.handle('datastore:runner_responses:get_runner_response', (_event, params) => {
    const request_uid = requireUid(params?.request_uid, 'request_uid');
    return readRunnerExchange(request_uid);
  });

  ipcMain.handle('datastore:runner_responses:delete_runner_responses_for_collection', (_event, params) => {
    const collection_uid = requireUid(params?.collection_uid, 'collection_uid');
    return clearRunnerResponses(collection_uid);
  });

  ipcMain.handle('datastore:request_history:list_history', (_event, params) => {
    return listHistory({
      beforeSentAt: params?.before_sent_at ?? null,
      beforeId: params?.before_id ?? null,
      search: typeof params?.search === 'string' ? params.search : null,
      limit: params?.limit
    });
  });

  ipcMain.handle('datastore:request_history:get_history_entry', (_event, params) => {
    return getHistoryEntry(requireHistoryId(params?.id));
  });

  ipcMain.handle('datastore:request_history:delete_history_entry', async (_event, params) => {
    const removed = await deleteHistoryEntry(requireHistoryId(params?.id));
    notifyHistoryChanged();
    return removed;
  });

  ipcMain.handle('datastore:request_history:delete_all_history', async () => {
    const cleared = await clearHistory();
    notifyHistoryChanged();
    return cleared;
  });

  ipcMain.handle('datastore:files:stat', (_event, params) => {
    return getFiles().stat(requireFileId(params?.id));
  });

  ipcMain.handle('datastore:files:read', (_event, params) => {
    return getFiles().read(requireFileId(params?.id));
  });
};

module.exports = { registerSqliteIpc };
