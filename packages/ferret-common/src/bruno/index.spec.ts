import { describe, it, expect } from '@jest/globals';
import { convertBrunoScript, convertBrunoAppCode } from './index';

describe('convertBrunoScript', () => {
  it('renames the bru global to fer', () => {
    expect(convertBrunoScript('bru.setVar("token", res.body.token);')).toBe('fer.setVar("token", res.body.token);');
  });

  it('renames bru when destructured or passed around', () => {
    expect(convertBrunoScript('const { getVar } = bru;\nhelper(bru);')).toBe('const { getVar } = fer;\nhelper(fer);');
  });

  it('renames bru accessed through the global object', () => {
    expect(convertBrunoScript('window.bru.ctx.submitRequest(); globalThis.bru.getVar("x");')).toBe('window.fer.ctx.submitRequest(); globalThis.fer.getVar("x");');
  });

  it('leaves properties, longer identifiers and Ferret code alone', () => {
    const code = 'obj.bru = 1; const brush = bruno; fer.setVar("a", 1);';
    expect(convertBrunoScript(code)).toBe(code);
  });

  it('does not touch string literals or comments', () => {
    const code = [
      '// bru.setVar is documented at bru.example.com',
      '/* bru.getVar */',
      'const url = "https://bru.example.com";',
      'const msg = \'bru.done\';'
    ].join('\n');
    expect(convertBrunoScript(code)).toBe(code);
  });

  it('converts code inside template substitutions but not the template text', () => {
    expect(convertBrunoScript('const s = `bru: ${bru.getVar("x")}`;')).toBe('const s = `bru: ${fer.getVar("x")}`;');
  });

  it('rewrites .bru request paths passed to runRequest', () => {
    expect(convertBrunoScript('await bru.runRequest("users/get user.bru");')).toBe('await fer.runRequest("users/get user.fer");');
    expect(convertBrunoScript('await bru.runRequest(\'a.bru\');')).toBe('await fer.runRequest(\'a.fer\');');
    expect(convertBrunoScript('await bru.runRequest(`a.bru`);')).toBe('await fer.runRequest(`a.fer`);');
  });

  it('leaves .bru inside other string literals alone', () => {
    const code = 'const file = "notes.bru"; fer.setVar("f", file);';
    expect(convertBrunoScript(code)).toBe(code);
  });

  it('is idempotent and passes through non-strings', () => {
    const once = convertBrunoScript('bru.sleep(10);');
    expect(convertBrunoScript(once)).toBe(once);
    expect(convertBrunoScript(undefined as unknown as string)).toBeUndefined();
    expect(convertBrunoScript('')).toBe('');
  });
});

describe('convertBrunoAppCode', () => {
  it('converts only inline script bodies', () => {
    const html = '<h1>bru.dashboard</h1>\n<script type="module">\n  window.bru.ctx.onResponseChange(render);\n</script>';
    expect(convertBrunoAppCode(html)).toBe(
      '<h1>bru.dashboard</h1>\n<script type="module">\n  window.fer.ctx.onResponseChange(render);\n</script>'
    );
  });
});
