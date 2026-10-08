import { convertBrunoScript, convertBrunoAppCode } from '@useferret/common';

/**
 * Converts a Bruno collection JSON export into a Ferret collection JSON export.
 *
 * The two formats share their shape; Bruno names the collection config `brunoConfig` and its
 * scripts use the `bru` global. Scripts live under every `script` object (request, folder and
 * collection level — HTTP `req`/`res` and the gRPC hooks), in `tests`, and in Collection App
 * `app.code`, so the whole tree is walked rather than a fixed list of paths.
 */

const convertNode = (node) => {
  if (Array.isArray(node)) {
    return node.map(convertNode);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }

  const converted = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'script' && value && typeof value === 'object' && !Array.isArray(value)) {
      converted.script = Object.fromEntries(
        Object.entries(value).map(([hook, code]) => [hook, convertBrunoScript(code)])
      );
    } else if (key === 'tests' && typeof value === 'string') {
      converted.tests = convertBrunoScript(value);
    } else if (key === 'app' && value && typeof value === 'object' && typeof value.code === 'string') {
      converted.app = { ...value, code: convertBrunoAppCode(value.code) };
    } else {
      converted[key] = convertNode(value);
    }
  }
  return converted;
};

export const brunoToFerret = (brunoCollection) => {
  const { brunoConfig, ...rest } = brunoCollection;
  const collection = convertNode(rest);
  if (brunoConfig !== undefined) {
    collection.ferretConfig = brunoConfig;
  }
  return collection;
};

/** True for a JSON collection exported by Bruno (as opposed to one exported by Ferret). */
export const isBrunoCollectionExport = (data) =>
  Boolean(data)
  && typeof data === 'object'
  && Array.isArray(data.items)
  && ('brunoConfig' in data || /^bruno\//i.test(String(data.exportedUsing || '')));
