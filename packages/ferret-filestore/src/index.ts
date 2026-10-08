import type { FerretCollection, FerretItem, FerretEnvironment } from '@useferret/schema-types';

import {
  parseFerRequest,
  parseFerCollection,
  parseFerEnvironment,
  stringifyFerRequest,
  stringifyFerCollection,
  stringifyFerEnvironment
} from './formats/fer';
import {
  parseYmlItem,
  parseYmlCollection,
  parseYmlFolder,
  parseYmlEnvironment,
  parseYmlMockServer,
  stringifyYmlItem,
  stringifyYmlFolder,
  stringifyYmlCollection,
  stringifyYmlEnvironment,
  stringifyYmlMockServer
} from './formats/yml';
import { dotenvToJson } from '@useferret/lang';
import FerParserWorker from './workers';
import {
  ParseOptions,
  StringifyOptions,
  CollectionFormat
} from './types';
import { DEFAULT_COLLECTION_FORMAT } from './constants';
import { ferRequestParseAndRedactBodyData } from './formats/fer/utils/request-parse-and-redact-body-data';
import { redactLargeFerTextBlocks, restoreRedactedBlocks } from './formats/fer/utils/redact-large-text-blocks';

// request
export const parseRequest = (content: string, options: ParseOptions = { format: DEFAULT_COLLECTION_FORMAT }): any => {
  if (options.format === 'fer') {
    return parseFerRequest(content);
  } else if (options.format === 'yml') {
    return parseYmlItem(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseRequestAndRedactBody = (content: string, options: ParseOptions = { format: 'fer' }): any => {
  if (options.format === 'fer') {
    return ferRequestParseAndRedactBodyData(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyRequest = (requestObj: FerretItem, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'fer') {
    return stringifyFerRequest(requestObj);
  } else if (options.format === 'yml') {
    return stringifyYmlItem(requestObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// request via worker
let globalWorkerInstance: FerParserWorker | null = null;
const getWorkerInstance = (): FerParserWorker => {
  if (!globalWorkerInstance) {
    globalWorkerInstance = new FerParserWorker();
  }
  return globalWorkerInstance;
};

export const parseRequestViaWorker = async (content: string, options: { format: CollectionFormat; filename?: string }): Promise<any> => {
  const fileParserWorker = getWorkerInstance();

  return await fileParserWorker.parseRequest(content, options.format);
};

export const stringifyRequestViaWorker = async (requestObj: any, options: { format: CollectionFormat }): Promise<string> => {
  const fileParserWorker = getWorkerInstance();
  return await fileParserWorker.stringifyRequest(requestObj, options.format);
};

export const parseFolderViaWorker = async (content: string, options: { format: CollectionFormat }): Promise<any> => {
  return await getWorkerInstance().parseFolder(content, options.format);
};

export const stringifyFolderViaWorker = async (folderObj: any, options: { format: CollectionFormat }): Promise<string> => {
  return await getWorkerInstance().stringifyFolder(folderObj, options.format);
};

export const parseEnvironmentViaWorker = async (content: string, options: { format: CollectionFormat }): Promise<any> => {
  return await getWorkerInstance().parseEnvironment(content, options.format);
};

export const stringifyEnvironmentViaWorker = async (envObj: any, options: { format: CollectionFormat }): Promise<string> => {
  return await getWorkerInstance().stringifyEnvironment(envObj, options.format);
};

// collection
export const parseCollection = (content: string, options: ParseOptions = { format: DEFAULT_COLLECTION_FORMAT }): any => {
  if (options.format === 'fer') {
    return parseFerCollection(content);
  } else if (options.format === 'yml') {
    return parseYmlCollection(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyCollection = (collectionObj: FerretCollection, ferretConfig: any, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'fer') {
    return stringifyFerCollection(collectionObj, false);
  } else if (options.format === 'yml') {
    return stringifyYmlCollection(collectionObj, ferretConfig);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// folder
export const parseFolder = (content: string, options: ParseOptions = { format: DEFAULT_COLLECTION_FORMAT }): any => {
  if (options.format === 'fer') {
    return parseFerCollection(content);
  } else if (options.format === 'yml') {
    return parseYmlFolder(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyFolder = (folderObj: any, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'fer') {
    return stringifyFerCollection(folderObj, true);
  } else if (options.format === 'yml') {
    return stringifyYmlFolder(folderObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// environment
export const parseEnvironment = (content: string, options: ParseOptions = { format: DEFAULT_COLLECTION_FORMAT }): any => {
  if (options.format === 'fer') {
    return parseFerEnvironment(content);
  } else if (options.format === 'yml') {
    return parseYmlEnvironment(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyEnvironment = (envObj: FerretEnvironment, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'fer') {
    return stringifyFerEnvironment(envObj);
  } else if (options.format === 'yml') {
    return stringifyYmlEnvironment(envObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// mock server — workspace-level entity, opencollection yml only
export const parseMockServer = (content: string, options: ParseOptions = { format: 'yml' }): any => {
  if (options.format === 'yml') {
    return parseYmlMockServer(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyMockServer = (mockServerObj: any, options: StringifyOptions = { format: 'yml' }): string => {
  if (options.format === 'yml') {
    return stringifyYmlMockServer(mockServerObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseDotEnv = (content: string): Record<string, string> => {
  return dotenvToJson(content);
};

export { redactLargeFerTextBlocks, restoreRedactedBlocks };
export { convertBrunoFile } from './bruno';
export type { ConvertedFile } from './bruno';
export type { RedactedBlock, RedactionResult } from './formats/fer/utils/redact-large-text-blocks';
export { FerParserWorker };
export * from './types';
export * from './constants';
