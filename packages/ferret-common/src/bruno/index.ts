/**
 * Bruno → Ferret script conversion.
 *
 * Bruno scripts use the `bru` global (`bru.setVar(...)`, `const { getVar } = bru`) and reference
 * request files by their `.bru` path in `bru.runRequest("folder/req.bru")`. Ferret exposes the same
 * API as `fer` and stores requests as `.fer`, so both are rewritten here.
 *
 * Only real code is touched: identifiers inside string literals and comments are left alone, so a
 * URL such as "https://bru.example.com" or a comment mentioning `bru.` survives unchanged. Template
 * literal substitutions (`${bru.getVar('x')}`) are code and are converted.
 */

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;
const RUN_REQUEST_CALL = /\bfer\s*\.\s*runRequest\s*\(\s*$/;

const GLOBAL_OBJECT_ACCESS = /\b(?:window|globalThis|self)\s*\.\s*$/;

const lastNonSpaceChar = (text: string): string => {
  for (let i = text.length - 1; i >= 0; i--) {
    if (!/\s/.test(text[i])) return text[i];
  }
  return '';
};

// `bru` is the Bruno global unless it is a property of some other object (`obj.bru`).
const isBrunoGlobal = (precedingCode: string): boolean =>
  lastNonSpaceChar(precedingCode) !== '.' || GLOBAL_OBJECT_ACCESS.test(precedingCode);

// Index just past the closing quote of a '…' or "…" literal starting at `start`.
const findQuotedStringEnd = (src: string, start: number): number => {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote || c === '\n') return i + 1;
    i++;
  }
  return src.length;
};

// A `.bru` request path passed straight to runRequest points at a file that is now `.fer`.
const convertRunRequestPath = (literal: string, precedingCode: string): string => {
  if (!RUN_REQUEST_CALL.test(precedingCode)) return literal;
  return literal.replace(/\.bru(?=['"`]$)/, '.fer');
};

const scanTemplate = (src: string, start: number): [string, number] => {
  let out = '`';
  let i = start + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      out += src.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c === '`') {
      return [out + '`', i + 1];
    }
    if (c === '$' && src[i + 1] === '{') {
      const [inner, end] = scanCode(src, i + 2, true);
      out += '${' + inner + '}';
      i = end + 1;
      continue;
    }
    out += c;
    i++;
  }
  return [out, i];
};

// Scans code from `start`. With `untilClosingBrace`, stops at the `}` that closes a template
// substitution and returns its index; otherwise runs to the end of `src`.
function scanCode(src: string, start: number, untilClosingBrace = false): [string, number] {
  let out = '';
  let i = start;
  let braceDepth = 0;

  while (i < src.length) {
    const c = src[i];

    if (untilClosingBrace) {
      if (c === '{') braceDepth++;
      if (c === '}') {
        if (braceDepth === 0) return [out, i];
        braceDepth--;
      }
    }

    if (c === '/' && src[i + 1] === '/') {
      const newline = src.indexOf('\n', i);
      const end = newline === -1 ? src.length : newline;
      out += src.slice(i, end);
      i = end;
      continue;
    }

    if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      const end = close === -1 ? src.length : close + 2;
      out += src.slice(i, end);
      i = end;
      continue;
    }

    if (c === '"' || c === '\'') {
      const end = findQuotedStringEnd(src, i);
      out += convertRunRequestPath(src.slice(i, end), out);
      i = end;
      continue;
    }

    if (c === '`') {
      const [literal, end] = scanTemplate(src, i);
      out += literal.includes('${') ? literal : convertRunRequestPath(literal, out);
      i = end;
      continue;
    }

    if (IDENT_START.test(c)) {
      let end = i + 1;
      while (end < src.length && IDENT_PART.test(src[end])) end++;
      const word = src.slice(i, end);
      out += word === 'bru' && isBrunoGlobal(out) ? 'fer' : word;
      i = end;
      continue;
    }

    out += c;
    i++;
  }

  return [out, i];
}

export const convertBrunoScript = (code: string): string => {
  if (typeof code !== 'string' || !code.includes('bru')) return code;
  return scanCode(code, 0)[0];
};

// Collection App code is an HTML document; only its inline <script> bodies are JavaScript.
export const convertBrunoAppCode = (html: string): string => {
  if (typeof html !== 'string' || !html.includes('bru')) return html;
  return html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_match, open, body, close) => open + convertBrunoScript(body) + close);
};
