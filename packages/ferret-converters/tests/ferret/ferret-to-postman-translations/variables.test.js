import translateFerToPostman from '../../../src/utils/ferret-to-postman-translator';

describe('Ferret to Postman Variables Translation', () => {
  // Regular variables tests
  it('should translate fer.getVar', () => {
    const code = 'fer.getVar("test");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("test");');
  });

  it('should translate fer.setVar', () => {
    const code = 'fer.setVar("test", "value");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.set("test", "value");');
  });

  it('should translate fer.hasVar', () => {
    const code = 'fer.hasVar("userId");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.has("userId");');
  });

  it('should translate fer.deleteVar', () => {
    const code = 'fer.deleteVar("tempVar");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.unset("tempVar");');
  });

  it('should translate fer.interpolate', () => {
    const code = 'fer.interpolate("Hello {{name}}");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.replaceIn("Hello {{name}}");');
  });

  it('should translate fer.interpolate with complex template', () => {
    const code = 'const greeting = fer.interpolate("Hello {{name}}, your user id is {{userId}}");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const greeting = pm.variables.replaceIn("Hello {{name}}, your user id is {{userId}}");');
  });

  // Global variables tests
  it('should translate fer.getGlobalEnvVar', () => {
    const code = 'fer.getGlobalEnvVar("test");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.globals.get("test");');
  });

  it('should translate fer.setGlobalEnvVar', () => {
    const code = 'fer.setGlobalEnvVar("test", "value");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.globals.set("test", "value");');
  });

  it('should translate fer.hasGlobalEnvVar', () => {
    const code = 'fer.hasGlobalEnvVar("token");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.globals.has("token");');
  });

  it('should translate fer.deleteGlobalEnvVar', () => {
    const code = 'fer.deleteGlobalEnvVar("token");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.globals.unset("token");');
  });

  it('should translate fer.deleteAllGlobalEnvVars', () => {
    const code = 'fer.deleteAllGlobalEnvVars();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.globals.clear();');
  });

  it('should translate fer.getAllGlobalEnvVars', () => {
    const code = 'const globals = fer.getAllGlobalEnvVars();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const globals = pm.globals.toObject();');
  });

  // Collection variables tests
  it('should translate fer.getCollectionVar', () => {
    const code = 'fer.getCollectionVar("baseUrl");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.collectionVariables.get("baseUrl");');
  });

  it('should translate fer.setCollectionVar', () => {
    const code = 'fer.setCollectionVar("baseUrl", "https://api.example.com");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.collectionVariables.set("baseUrl", "https://api.example.com");');
  });

  it('should translate fer.hasCollectionVar', () => {
    const code = 'fer.hasCollectionVar("baseUrl");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.collectionVariables.has("baseUrl");');
  });

  it('should translate fer.deleteCollectionVar', () => {
    const code = 'fer.deleteCollectionVar("baseUrl");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.collectionVariables.unset("baseUrl");');
  });

  it('should translate fer.getAllCollectionVars', () => {
    const code = 'const vars = fer.getAllCollectionVars();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const vars = pm.collectionVariables.toObject();');
  });

  it('should translate fer.deleteAllCollectionVars', () => {
    const code = 'fer.deleteAllCollectionVars();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.collectionVariables.clear();');
  });

  // Folder variables tests
  it('should translate fer.getFolderVar', () => {
    const code = 'fer.getFolderVar("folderToken");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("folderToken");');
  });

  // Request variables tests
  it('should translate fer.getRequestVar', () => {
    const code = 'fer.getRequestVar("requestId");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("requestId");');
  });

  // Combined tests
  it('should handle conditional expressions with variable calls', () => {
    const code = 'const userStatus = fer.hasVar("userId") ? "logged-in" : "guest";';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const userStatus = pm.variables.has("userId") ? "logged-in" : "guest";');
  });

  it('should handle all variable methods together', () => {
    const code = `
// All variable methods
const hasUserId = fer.hasVar("userId");
const userId = fer.getVar("userId");
fer.setVar("requestTime", new Date().toISOString());

console.log(\`Has userId: \${hasUserId}, User ID: \${userId}\`);
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const hasUserId = pm.variables.has("userId");');
    expect(translatedCode).toContain('const userId = pm.variables.get("userId");');
    expect(translatedCode).toContain('pm.variables.set("requestTime", new Date().toISOString());');
  });

  it('should handle nested expressions with variables', () => {
    const code = 'fer.setVar("fullPath", fer.getEnvVar("baseUrl") + fer.getVar("endpoint"));';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.variables.set("fullPath", pm.environment.get("baseUrl") + pm.variables.get("endpoint"));');
  });
});
