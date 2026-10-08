import { parentPort } from 'node:worker_threads';
import {
  parseFerRequest,
  parseFerCollection,
  parseFerEnvironment,
  stringifyFerRequest,
  stringifyFerCollection,
  stringifyFerEnvironment
} from '../formats/fer';
import {
  parseYmlItem,
  parseYmlFolder,
  parseYmlEnvironment,
  stringifyYmlItem,
  stringifyYmlFolder,
  stringifyYmlEnvironment
} from '../formats/yml';
import { CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';

type TaskType
  = | 'parse'
    | 'stringify'
    | 'parseFolder'
    | 'stringifyFolder'
    | 'parseEnvironment'
    | 'stringifyEnvironment';

interface WorkerMessage {
  taskType: TaskType;
  data: {
    data: any;
    format?: CollectionFormat;
  };
}

const runTask = (taskType: TaskType, data: any, format: CollectionFormat): any => {
  switch (taskType) {
    case 'parse':
      return format === 'yml' ? parseYmlItem(data) : parseFerRequest(data);
    case 'stringify':
      return format === 'yml' ? stringifyYmlItem(data) : stringifyFerRequest(data);
    case 'parseFolder':
      return format === 'yml' ? parseYmlFolder(data) : parseFerCollection(data);
    case 'stringifyFolder':
      return format === 'yml' ? stringifyYmlFolder(data) : stringifyFerCollection(data, true);
    case 'parseEnvironment':
      return format === 'yml' ? parseYmlEnvironment(data) : parseFerEnvironment(data);
    case 'stringifyEnvironment':
      return format === 'yml' ? stringifyYmlEnvironment(data) : stringifyFerEnvironment(data);
    default:
      throw new Error(`Unknown task type: ${taskType}`);
  }
};

parentPort?.on('message', async (message: WorkerMessage) => {
  try {
    const { taskType, data: messageData } = message;
    const { data, format = DEFAULT_COLLECTION_FORMAT } = messageData;
    const result = runTask(taskType, data, format);
    parentPort?.postMessage(result);
  } catch (error: any) {
    console.error('Worker error:', error);
    parentPort?.postMessage({ error: error?.message });
  }
});
