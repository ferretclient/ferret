export type FerretDefaultHeaderSource = 'ferret' | 'axios' | 'node';

export type FerretDefaultHeader = {
  name: string;
  /** Value shown in the Headers UI. */
  previewValue?: string;
  /** False for required defaults such as Host. */
  omittable: boolean;
  source: FerretDefaultHeaderSource;
};

/** Headers Ferret, Axios, or Node add automatically on HTTP sends. */
export const FERRET_DEFAULT_HEADERS: FerretDefaultHeader[] = [
  {
    name: 'User-Agent',
    previewValue: 'ferret-runtime/<version>',
    omittable: true,
    source: 'ferret'
  },
  {
    name: 'Accept',
    previewValue: 'application/json, text/plain, */*',
    omittable: true,
    source: 'axios'
  },
  {
    name: 'Accept-Encoding',
    previewValue: 'gzip, compress, deflate, br',
    omittable: true,
    source: 'axios'
  },
  {
    name: 'Connection',
    previewValue: 'keep-alive',
    omittable: true,
    source: 'node'
  },
  {
    name: 'Host',
    previewValue: '<derived from request URL>',
    omittable: false,
    source: 'node'
  }
];

export const getFerretDefaultHeaderNames = (): string[] =>
  FERRET_DEFAULT_HEADERS.map((header) => header.name);

type RequestWithExplicitHeaderNames = {
  headers?: Record<string, unknown>;
  __explicitHeaderNames?: string[];
};

/** Headers the user or scripts set, not Axios defaults. Refresh before send. */
export const refreshExplicitHeaderNames = <T extends RequestWithExplicitHeaderNames>(request: T): T => {
  const headers = request?.headers;
  if (!headers || typeof headers !== 'object') {
    return request;
  }

  request.__explicitHeaderNames = Object.keys(headers).filter((name) => {
    const value = headers[name];
    return value !== undefined && value !== null && value !== false;
  });

  return request;
};

export type ApplyOmitHeadersResult = {
  /** True when Connection should be stripped after agents are attached. */
  omitConnection: boolean;
};

type AxiosLikeHeaders = {
  set: (name: string, value: unknown) => void;
};

const normalizeHeaderNameList = (names?: string[] | null): string[] => {
  if (!Array.isArray(names) || !names.length) {
    return [];
  }

  return names
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter((name) => name.length > 0);
};

export type OmitHeadersOptions = {
  omitHeaders?: string[] | null;
  headersToDelete?: string[] | null;
  explicitHeaderNames?: string[] | null;
};

/**
 * Lowercased names to drop from a request.
 * Host is never omitted. User-set headers win over omitHeaders.
 * Script deleteHeader always wins.
 */
const resolveHeaderNamesToClear = ({
  omitHeaders,
  headersToDelete,
  explicitHeaderNames
}: OmitHeadersOptions = {}): string[] => {
  const explicit = new Set(
    normalizeHeaderNameList(explicitHeaderNames).map((name) => name.toLowerCase())
  );
  const deleteSet = new Set(
    normalizeHeaderNameList(headersToDelete).map((name) => name.toLowerCase())
  );
  const omitSet = new Set(
    normalizeHeaderNameList(omitHeaders).map((name) => name.toLowerCase())
  );

  return [...new Set<string>([...omitSet, ...deleteSet])].filter((lowerName) => {
    if (lowerName === 'host') {
      return false;
    }

    return !(omitSet.has(lowerName) && !deleteSet.has(lowerName) && explicit.has(lowerName));
  });
};

/**
 * True when Connection must stay off the wire. Deleting the header is not enough
 * Node's agent writes it, so the agent has to be built with keepAlive false.
 */
export const shouldOmitConnection = (options: OmitHeadersOptions = {}): boolean =>
  resolveHeaderNamesToClear(options).includes('connection');

/** Drop auto-added headers from an Axios request. Connection is left for the caller. */
export const applyOmitHeaders = (
  headers: AxiosLikeHeaders,
  options: OmitHeadersOptions = {}
): ApplyOmitHeadersResult => {
  const namesToClear = resolveHeaderNamesToClear(options);

  namesToClear.forEach((lowerName) => {
    if (lowerName !== 'connection') {
      headers.set(lowerName, null);
    }
  });

  return { omitConnection: namesToClear.includes('connection') };
};

/** User-Agent Ferret sends by default. */
export const getFerretRuntimeUserAgent = (version: string): string =>
  `ferret-runtime/${version || ''}`;
