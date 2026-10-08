import translateFerToPostman from '../../../src/utils/ferret-to-postman-translator';

describe('Ferret to Postman Execution Control Translation', () => {
  // setNextRequest translations
  it('should translate fer.setNextRequest', () => {
    const code = 'fer.setNextRequest("Get User Details");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest("Get User Details");');
  });

  it('should translate fer.runner.setNextRequest', () => {
    const code = 'fer.runner.setNextRequest("Create Order");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest("Create Order");');
  });

  it('should preserve the string "null" as a request name when translating fer.runner.setNextRequest("null")', () => {
    const code = 'fer.runner.setNextRequest("null");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest("null");');
  });

  // skipRequest translation
  it('should translate fer.runner.skipRequest', () => {
    const code = 'fer.runner.skipRequest();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.execution.skipRequest();');
  });

  // stopExecution translation
  it('should translate fer.runner.stopExecution() to pm.execution.setNextRequest(null)', () => {
    const code = 'fer.runner.stopExecution();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest(null);');
  });

  // Conditional execution control
  it('should handle setNextRequest in conditionals', () => {
    const code = `
if (res.getStatus() === 401) {
    fer.setNextRequest("Refresh Token");
} else if (res.getStatus() === 200) {
    fer.setNextRequest("Process Data");
}
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('if (pm.response.code === 401) {');
    expect(translatedCode).toContain('pm.execution.setNextRequest("Refresh Token");');
    expect(translatedCode).toContain('} else if (pm.response.code === 200) {');
    expect(translatedCode).toContain('pm.execution.setNextRequest("Process Data");');
  });

  it('should handle stopExecution in error handling', () => {
    const code = `
if (res.getStatus() >= 500) {
    console.error("Server error, stopping execution");
    fer.runner.stopExecution();
}
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('if (pm.response.code >= 500) {');
    expect(translatedCode).toContain('console.error("Server error, stopping execution");');
    expect(translatedCode).toContain('pm.execution.setNextRequest(null);');
  });

  it('should handle skipRequest with condition', () => {
    const code = `
const shouldSkip = fer.getEnvVar("skipNextRequest") === "true";
if (shouldSkip) {
    fer.runner.skipRequest();
}
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const shouldSkip = pm.environment.get("skipNextRequest") === "true";');
    expect(translatedCode).toContain('if (shouldSkip) {');
    expect(translatedCode).toContain('pm.execution.skipRequest();');
  });

  it('should handle all execution control methods together', () => {
    const code = `
const status = res.getStatus();
const data = res.getBody();

if (status === 200 && data.hasMore) {
    fer.runner.setNextRequest("Fetch Next Page");
} else if (status === 429) {
    console.log("Rate limited, skipping");
    fer.runner.skipRequest();
} else if (status >= 500) {
    fer.runner.stopExecution();
}
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const status = pm.response.code;');
    expect(translatedCode).toContain('const data = pm.response.json();');
    expect(translatedCode).toContain('pm.execution.setNextRequest("Fetch Next Page");');
    expect(translatedCode).toContain('pm.execution.skipRequest();');
    expect(translatedCode).toContain('pm.execution.setNextRequest(null);');
  });

  it('should handle dynamic request names in setNextRequest', () => {
    const code = `
const nextRequest = fer.getVar("nextRequestName");
fer.setNextRequest(nextRequest);
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const nextRequest = pm.variables.get("nextRequestName");');
    expect(translatedCode).toContain('pm.execution.setNextRequest(nextRequest);');
  });
});
