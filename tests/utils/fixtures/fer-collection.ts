import fs from 'fs';
import path from 'path';

/**
 * Minimal on-disk `.fer` collection builders for tests that need a precisely named / structured
 * collection built before the app opens it (so it mounts in one read).
 *
 * Use these when you need exact control over item names and nesting. For a bulk auto-generated
 * collection (parametric request count / depth), use `./generator.ts` instead.
 */

export interface WriteRequestOptions {
  /** Sort order within the parent */
  seq: number;
  /** HTTP verb (lowercased into the request block); default 'get' */
  method?: string;
  /** Request URL; default 'http://localhost:8081/echo' */
  url?: string;
  /** Names of saved response examples to attach to the request */
  examples?: string[];
}

/** Create the collection directory + `ferret.json` (the marker that makes a dir a Ferret collection). */
export const initFerCollection = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ferret.json'),
    JSON.stringify({ version: '1', name, type: 'collection' }, null, 2)
  );
};

/** Create a folder subdir + its `folder.fer` meta. Returns the folder's path. */
export const writeFerFolder = (dir: string, name: string, seq: number) => {
  const folderDir = path.join(dir, name);
  fs.mkdirSync(folderDir, { recursive: true });
  fs.writeFileSync(path.join(folderDir, 'folder.fer'), `meta {\n  name: ${name}\n  seq: ${seq}\n}\n`);
  return folderDir;
};

/**
 * Write an HTTP request `.fer`, optionally with saved response examples. The `example { ... }`
 * block shape matches the fer serializer output (see
 * packages/ferret-lang/v2/tests/examples/fixtures/fer/ferToJson-single-example.fer).
 */
export const writeFerRequest = (dir: string, name: string, options: WriteRequestOptions) => {
  const { seq, method = 'get', url = 'http://localhost:8081/echo', examples = [] } = options;
  const exampleBlocks = examples
    .map((ex) => `\nexample {\n  name: ${ex}\n  request: {\n    url: ${url}\n    method: ${method}\n    mode: none\n  }\n}\n`)
    .join('');
  fs.writeFileSync(
    path.join(dir, `${name}.fer`),
    `meta {\n  name: ${name}\n  type: http\n  seq: ${seq}\n}\n\n${method} {\n  url: ${url}\n}\n${exampleBlocks}`
  );
};
