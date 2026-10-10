import type { GrpcRequest as FerretGrpcRequest } from '@useferret/schema-types/requests/grpc';
import stringifyItem from './stringifyItem';
import parseItem from './parseItem';

const parseGrpcItem = (yml: string) => parseItem(yml).request as FerretGrpcRequest;

const grpcItem = (script: Record<string, string | null>, tests: string | null = null) => ({
  uid: 'i1',
  type: 'grpc-request',
  name: 'say hello',
  seq: 1,
  request: {
    url: 'grpc://localhost:50051',
    method: '/hello.Greeter/SayHello',
    methodType: 'unary',
    headers: [],
    auth: { mode: 'none' },
    body: { mode: 'grpc', grpc: [{ name: 'message 1', content: '{}' }] },
    script,
    tests,
    vars: { req: [], res: [] },
    assertions: []
  }
}) as any;

describe('grpc lifecycle hooks — stringify/parse round trip', () => {
  it('writes every hook as a grpc-prefixed script type and reads them back', () => {
    const yml = stringifyItem(grpcItem({
      beforeCallStart: 'fer.setVar("a", 1);',
      afterCallEnd: 'fer.setVar("b", 2);',
      beforeMessageSend: 'fer.setVar("c", 3);',
      afterMessageReceive: 'fer.setVar("d", 4);'
    }));

    expect(yml).toContain('grpc:before-call-start');
    expect(yml).toContain('grpc:after-call-end');
    expect(yml).toContain('grpc:before-message-send');
    expect(yml).toContain('grpc:after-message-receive');

    const { script } = parseGrpcItem(yml);
    expect(script!.beforeCallStart).toBe('fer.setVar("a", 1);');
    expect(script!.afterCallEnd).toBe('fer.setVar("b", 2);');
    expect(script!.beforeMessageSend).toBe('fer.setVar("c", 3);');
    expect(script!.afterMessageReceive).toBe('fer.setVar("d", 4);');
  });

  it('preserves a multiline hook verbatim', () => {
    const beforeCallStart = ['const now = 1;', 'if (now) {', '  fer.setVar("startedAt", now);', '}'].join('\n');

    const yml = stringifyItem(grpcItem({ beforeCallStart, afterCallEnd: null }));
    const { script } = parseGrpcItem(yml);

    expect(script!.beforeCallStart).toBe(beforeCallStart);
  });

  it('round-trips one hook without inventing the others', () => {
    const yml = stringifyItem(grpcItem({ beforeCallStart: null, afterCallEnd: 'fer.setVar("b", 2);' }));

    expect(yml).not.toContain('grpc:before-call-start');
    expect(yml).not.toContain('grpc:before-message-send');
    expect(yml).not.toContain('grpc:after-message-receive');

    const { script } = parseGrpcItem(yml);
    expect(script!.beforeCallStart).toBeNull();
    expect(script!.afterCallEnd).toBe('fer.setVar("b", 2);');
    expect(script!.beforeMessageSend).toBeNull();
    expect(script!.afterMessageReceive).toBeNull();
  });

  it('writes no scripts block when every hook is empty', () => {
    const yml = stringifyItem(grpcItem({
      beforeCallStart: null,
      afterCallEnd: '   ',
      beforeMessageSend: null,
      afterMessageReceive: '   '
    }));

    expect(yml).not.toContain('scripts:');

    const { script } = parseGrpcItem(yml);
    expect(script!.beforeCallStart).toBeNull();
    expect(script!.afterCallEnd).toBeNull();
    expect(script!.beforeMessageSend).toBeNull();
    expect(script!.afterMessageReceive).toBeNull();
  });

  it('keeps tests alongside the hooks', () => {
    const yml = stringifyItem(
      grpcItem({ beforeCallStart: 'fer.setVar("a", 1);', afterCallEnd: null }, 'test("ok", () => {});')
    );

    const request = parseGrpcItem(yml);
    expect(request.script!.beforeCallStart).toBe('fer.setVar("a", 1);');
    expect(request.tests).toBe('test("ok", () => {});');
  });

  it('survives a second round trip unchanged', () => {
    const item = grpcItem({
      beforeCallStart: 'fer.setVar("a", 1);',
      afterCallEnd: 'fer.setVar("b", 2);',
      beforeMessageSend: 'fer.setVar("c", 3);',
      afterMessageReceive: 'fer.setVar("d", 4);'
    });

    const firstPass = stringifyItem(item);
    const secondPass = stringifyItem(parseItem(firstPass));

    expect(secondPass).toBe(firstPass);
  });
});
