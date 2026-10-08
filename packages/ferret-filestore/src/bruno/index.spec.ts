import { describe, it, expect } from '@jest/globals';
import { convertBrunoFile } from './index';
import { parseRequest, parseCollection } from '../index';

const BRUNO_REQUEST = [
  'meta {',
  '  name: Login',
  '  type: http',
  '  seq: 1',
  '}',
  '',
  'post {',
  '  url: https://bru.example.com/login',
  '  body: json',
  '  auth: none',
  '}',
  '',
  'body:json {',
  '  {',
  '    "client": "bru.cli"',
  '  }',
  '}',
  '',
  'script:pre-request {',
  '  bru.setVar("startedAt", Date.now());',
  '  await bru.runRequest("auth/refresh.bru");',
  '}',
  '',
  'script:post-response {',
  '  bru.setEnvVar("token", res.body.token);',
  '}',
  '',
  'tests {',
  '  test("has token", () => expect(bru.getEnvVar("token")).to.be.a("string"));',
  '}',
  '',
  'docs {',
  '  Uses bru.setEnvVar to store the token.',
  '}',
  ''
].join('\n');

describe('convertBrunoFile', () => {
  it('renames bruno.json to ferret.json without changing its content', () => {
    const content = '{ "version": "1", "name": "API", "type": "collection" }';
    expect(convertBrunoFile('api/bruno.json', content)).toEqual({ path: 'api/ferret.json', content });
  });

  it('converts a .bru request into a parseable .fer request with converted scripts', () => {
    const result = convertBrunoFile('auth/Login.bru', BRUNO_REQUEST);
    expect(result?.path).toBe('auth/Login.fer');

    const parsed = parseRequest(result!.content, { format: 'fer' });
    expect(parsed.request.script.req).toBe('fer.setVar("startedAt", Date.now());\nawait fer.runRequest("auth/refresh.fer");');
    expect(parsed.request.script.res).toBe('fer.setEnvVar("token", res.body.token);');
    expect(parsed.request.tests).toBe('test("has token", () => expect(fer.getEnvVar("token")).to.be.a("string"));');
  });

  it('leaves URLs, bodies and docs that merely mention bru untouched', () => {
    const { content } = convertBrunoFile('Login.bru', BRUNO_REQUEST)!;
    expect(content).toContain('url: https://bru.example.com/login');
    expect(content).toContain('"client": "bru.cli"');
    expect(content).toContain('Uses bru.setEnvVar to store the token.');
  });

  it('converts gRPC hook scripts and app code, keeping line endings', () => {
    const bru = [
      'script:grpc:before-call-start {',
      '  bru.setVar("a", 1);',
      '}',
      '',
      'app {',
      '  enabled: true',
      '  code: \'\'\'',
      '    <p>bru</p>',
      '    <script>window.bru.ctx.submitRequest();</script>',
      '  \'\'\'',
      '}',
      ''
    ].join('\r\n');

    const { content } = convertBrunoFile('stream.bru', bru)!;
    expect(content).toContain('  fer.setVar("a", 1);\r\n');
    expect(content).toContain('<p>bru</p>');
    expect(content).toContain('<script>window.fer.ctx.submitRequest();</script>');
    expect(content).not.toMatch(/[^\r]\n/);
  });

  it('renames extensions.bruno and converts scripts in an OpenCollection file', () => {
    const yml = [
      '# exported from Bruno',
      'opencollection: 1.0.0',
      'info:',
      '  name: API',
      'request:',
      '  scripts:',
      '    - type: before-request',
      '      code: |-',
      '        bru.setVar("x", 1);',
      'extensions:',
      '  bruno:',
      '    scripts:',
      '      flow: sequential',
      ''
    ].join('\n');

    const result = convertBrunoFile('opencollection.yml', yml);
    expect(result?.path).toBe('opencollection.yml');
    expect(result!.content).toContain('# exported from Bruno');
    expect(result!.content).toContain('  ferret:\n');
    expect(result!.content).toContain('fer.setVar("x", 1);');

    const parsed = parseCollection(result!.content, { format: 'yml' });
    expect(parsed.ferretConfig.scripts.flow).toBe('sequential');
  });

  it('converts scripts in a YAML request but not URLs or descriptions', () => {
    const yml = [
      'info:',
      '  name: Get user',
      '  type: http',
      'http:',
      '  method: GET',
      '  url: https://bru.example.com/users',
      'runtime:',
      '  scripts:',
      '    - type: after-response',
      '      code: |-',
      '        bru.setVar("id", res.body.id);',
      ''
    ].join('\n');

    const { content } = convertBrunoFile('users/Get user.yml', yml)!;
    expect(content).toContain('url: https://bru.example.com/users');
    expect(content).toContain('fer.setVar("id", res.body.id);');
  });

  it('returns null for files that need no change', () => {
    expect(convertBrunoFile('README.md', 'Run with bru.')).toBeNull();
    expect(convertBrunoFile('Get.yml', 'info:\n  name: Get\n')).toBeNull();
    expect(convertBrunoFile('.env', 'TOKEN=abc')).toBeNull();
  });
});
