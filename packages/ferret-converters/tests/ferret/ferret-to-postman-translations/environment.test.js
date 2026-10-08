import translateFerToPostman from '../../../src/utils/ferret-to-postman-translator';

describe('Ferret to Postman Environment Variable Translation', () => {
  it('should translate fer.getEnvVar', () => {
    const code = 'fer.getEnvVar("test");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.environment.get("test");');
  });

  it('should translate fer.setEnvVar', () => {
    const code = 'fer.setEnvVar("test", "value");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("test", "value");');
  });

  it('should translate fer.deleteEnvVar', () => {
    const code = 'fer.deleteEnvVar("test");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.environment.unset("test");');
  });

  it('should translate fer.hasEnvVar', () => {
    const code = 'fer.hasEnvVar("apiKey");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.environment.has("apiKey");');
  });

  it('should translate fer.getEnvName() to pm.environment.name (function to property)', () => {
    const code = 'const envName = fer.getEnvName();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const envName = pm.environment.name;');
  });

  it('should handle nested Postman API calls with environment', () => {
    const code = 'fer.setEnvVar("computed", fer.getVar("base") + "-suffix");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("computed", pm.variables.get("base") + "-suffix");');
  });

  it('should handle JSON operations with environment variables', () => {
    const code = 'fer.setEnvVar("user", JSON.stringify({ id: 123, name: "John" }));';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("user", JSON.stringify({ id: 123, name: "John" }));');
  });

  it('should handle JSON.parse with environment variables', () => {
    const code = 'const userData = JSON.parse(fer.getEnvVar("user"));';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const userData = JSON.parse(pm.environment.get("user"));');
  });

  it('should handle all environment variable methods together', () => {
    const code = `
// All environment variable methods
const token = fer.getEnvVar("token");
fer.setEnvVar("timestamp", new Date().toISOString());

console.log(\`Token: \${token}\`);
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const token = pm.environment.get("token");');
    expect(translatedCode).toContain('pm.environment.set("timestamp", new Date().toISOString());');
  });

  it('should handle environment variables with computed property names', () => {
    const code = `
const prefix = "api";
const suffix = "Key";
fer.setEnvVar(prefix + "_" + suffix, "abc123");
const computedValue = fer.getEnvVar(prefix + "_" + suffix);
`;
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toContain('pm.environment.set(prefix + "_" + suffix, "abc123");');
    expect(translatedCode).toContain('const computedValue = pm.environment.get(prefix + "_" + suffix);');
  });

  it('should handle environment variables in complex object structures', () => {
    const code = `
const config = {
    baseUrl: fer.getEnvVar("apiUrl"),
    headers: {
        "Authorization": "Bearer " + fer.getEnvVar("token"),
        "X-Api-Key": fer.getEnvVar("apiKey") || "default-key"
    },
    timeout: parseInt(fer.getEnvVar("timeout") || "5000")
};
`;
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toContain('baseUrl: pm.environment.get("apiUrl"),');
    expect(translatedCode).toContain('"Authorization": "Bearer " + pm.environment.get("token"),');
    expect(translatedCode).toContain('"X-Api-Key": pm.environment.get("apiKey") || "default-key"');
    expect(translatedCode).toContain('timeout: parseInt(pm.environment.get("timeout") || "5000")');
  });

  it('should handle environment variables in try-catch blocks', () => {
    const code = `
try {
    const configStr = fer.getEnvVar("config");
    const config = JSON.parse(configStr);
    console.log("Config loaded:", config.version);
} catch (error) {
    console.error("Failed to parse config");
    fer.setEnvVar("configError", error.message);
}
`;
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toContain('const configStr = pm.environment.get("config");');
    expect(translatedCode).toContain('pm.environment.set("configError", error.message);');
  });
});
