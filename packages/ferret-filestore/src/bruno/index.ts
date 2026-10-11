import * as YAML from 'yaml';
import { convertBrunoScript, convertBrunoAppCode } from '@ferretclient/common';

/**
 * Bruno → Ferret conversion of individual collection files.
 *
 * A Bruno collection on disk differs from a Ferret one only in names: `bruno.json` instead of
 * `ferret.json`, `.bru` instead of `.fer` (same grammar), the `bru` script global, and the
 * `extensions.bruno` key in OpenCollection YAML. Files are rewritten as text — or, for YAML,
 * as an edited document — rather than parsed and re-serialized, so nothing the parser does not
 * model (comments, ordering, unknown blocks) is lost.
 */

export interface ConvertedFile {
  path: string;
  content: string;
}

const SCRIPT_BLOCK_HEADER = /^(?:script:[a-z:-]+|tests)\s*\{\s*$/;
const APP_BLOCK_HEADER = /^app\s*\{\s*$/;
const MULTILINE_TEXT_BLOCK = /'''([\s\S]*?)'''/;

const basename = (filePath: string): string => filePath.split(/[\\/]/).pop() || '';

const replaceBasename = (filePath: string, name: string): string => {
  const separatorIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return separatorIndex === -1 ? name : filePath.slice(0, separatorIndex + 1) + name;
};

// In the Bru grammar a block body ends at the first line that is exactly "}".
const convertBruText = (content: string): string => {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isScriptBlock = SCRIPT_BLOCK_HEADER.test(line);
    const isAppBlock = APP_BLOCK_HEADER.test(line);
    out.push(line);
    if (!isScriptBlock && !isAppBlock) continue;

    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j] !== '}') {
      body.push(lines[j]);
      j++;
    }

    let converted = body.join(eol);
    if (isScriptBlock) {
      converted = convertBrunoScript(converted);
    } else {
      converted = converted.replace(MULTILINE_TEXT_BLOCK, (_match, code) => `'''${convertBrunoAppCode(code)}'''`);
    }

    if (body.length) out.push(converted);
    i = j - 1;
  }

  return out.join(eol);
};

const scalarKey = (node: unknown): unknown => (YAML.isScalar(node) ? node.value : node);

const convertBrunoYml = (content: string): string => {
  if (!content.includes('bru')) return content;

  const doc = YAML.parseDocument(content);
  let changed = false;

  const extensions = doc.get('extensions', true);
  if (YAML.isMap(extensions)) {
    for (const pair of extensions.items) {
      if (scalarKey(pair.key) === 'bruno' && YAML.isScalar(pair.key)) {
        pair.key.value = 'ferret';
        changed = true;
      }
    }
  }

  YAML.visit(doc, {
    Pair(_key, pair, path) {
      if (scalarKey(pair.key) !== 'code' || !YAML.isScalar(pair.value) || typeof pair.value.value !== 'string') return;

      // runtime.scripts: [{ type, code }]  → path ends [..., Pair(scripts), Seq, Map]
      // app: { code }                       → path ends [..., Pair(app), Map]
      const parentOfMap = path[path.length - 2];
      const grandparentOfMap = path[path.length - 3];
      const isScript = YAML.isSeq(parentOfMap) && YAML.isPair(grandparentOfMap) && scalarKey(grandparentOfMap.key) === 'scripts';
      const isApp = YAML.isPair(parentOfMap) && scalarKey(parentOfMap.key) === 'app';
      if (!isScript && !isApp) return;

      const original = pair.value.value;
      const converted = isScript ? convertBrunoScript(original) : convertBrunoAppCode(original);
      if (converted !== original) {
        pair.value.value = converted;
        changed = true;
      }
    }
  });

  return changed ? doc.toString({ lineWidth: 0, indent: 2, minContentWidth: 0 }) : content;
};

/**
 * Converts one file of a Bruno collection. `filePath` may be absolute or relative; only its
 * basename and extension are inspected. Returns null for files that are copied unchanged.
 */
export const convertBrunoFile = (filePath: string, content: string): ConvertedFile | null => {
  const name = basename(filePath);
  const lowerName = name.toLowerCase();

  if (lowerName === 'bruno.json') {
    return { path: replaceBasename(filePath, 'ferret.json'), content };
  }

  if (lowerName.endsWith('.bru')) {
    return { path: replaceBasename(filePath, `${name.slice(0, -'.bru'.length)}.fer`), content: convertBruText(content) };
  }

  if (lowerName.endsWith('.yml') || lowerName.endsWith('.yaml')) {
    const converted = convertBrunoYml(content);
    return converted === content ? null : { path: filePath, content: converted };
  }

  return null;
};
