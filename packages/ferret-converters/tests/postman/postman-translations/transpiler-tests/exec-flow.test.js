import translateCode from '../../../../src/utils/postman-to-ferret-translator';

describe('Execution Flow Translation', () => {
  // Request flow control
  it('should translate pm.setNextRequest', () => {
    const code = 'pm.setNextRequest("Get User Details");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.setNextRequest("Get User Details");');
  });

  it('should translate pm.setNextRequest(null) to fer.runner.stopExecution()', () => {
    const code = 'pm.setNextRequest(null);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.stopExecution();');
  });

  it('should translate pm.setNextRequest("null") to fer.runner.setNextRequest("null") (string is a valid request name)', () => {
    const code = 'pm.setNextRequest("null");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.setNextRequest("null");');
  });

  it('should keep pm.setNextRequest(<request name>) as fer.setNextRequest(<request name>) for non-null arguments', () => {
    const code = 'pm.setNextRequest("Get User Details");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.setNextRequest("Get User Details");');
  });

  it('should translate pm.execution.skipRequest', () => {
    const code = 'if (condition) pm.execution.skipRequest();';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('if (condition) fer.runner.skipRequest();');
  });

  it('should translate pm.execution.setNextRequest(null)', () => {
    const code = 'pm.execution.setNextRequest(null);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.stopExecution();');
  });

  it('should translate pm.execution.setNextRequest("null") to fer.runner.setNextRequest("null") (string is a valid request name)', () => {
    const code = 'pm.execution.setNextRequest("null");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.setNextRequest("null");');
  });

  it('should translate pm.execution.setNextRequest("req1") to fer.runner.setNextRequest("req1")', () => {
    const code = 'pm.execution.setNextRequest("req1");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.setNextRequest("req1");');
  });

  it('should translate pm.execution.setNextRequest() with no arguments to fer.runner.setNextRequest()', () => {
    const code = 'pm.execution.setNextRequest();';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('fer.runner.setNextRequest();');
  });

  it('should handle pm.execution.setNextRequest with non-null parameters', () => {
    const code = `
        // Continue normal flow
        pm.execution.setNextRequest("Get user details");
        
        // With variable
        const nextReq = "Update profile";
        pm.execution.setNextRequest(nextReq);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('fer.runner.setNextRequest("Get user details");');
    expect(translatedCode).toContain('fer.runner.setNextRequest(nextReq);');
  });

  it('should handle all execution control methods together', () => {
    const code = `
        // All execution control methods
        if (pm.response.code === 401) {
            pm.execution.skipRequest();
        } else if (pm.response.code === 500) {
            pm.execution.setNextRequest(null);
        } else {
            pm.setNextRequest("Get User Details");
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('if (res.getStatus() === 401) {');
    expect(translatedCode).toContain('fer.runner.skipRequest();');
    expect(translatedCode).toContain('} else if (res.getStatus() === 500) {');
    expect(translatedCode).toContain('fer.runner.stopExecution();');
    expect(translatedCode).toContain('} else {');
    expect(translatedCode).toContain('fer.runner.setNextRequest("Get User Details");');
  });
});
