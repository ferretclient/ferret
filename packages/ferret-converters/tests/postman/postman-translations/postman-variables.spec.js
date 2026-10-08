import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - variables commands', () => {
  test('should translate environment variable commands', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
    `;
    const result = postmanTranslation(inputScript);
    expect(result).toContain('fer.getEnvVar(\'key\')');
    expect(result).toContain('fer.setEnvVar(\'key\', \'value\')');
  });

  test('should translate runtime variable commands', () => {
    const inputScript = `
      pm.variables.get('key');
      pm.variables.set('key', 'value');
    `;
    const result = postmanTranslation(inputScript);
    expect(result).toContain('fer.getVar(\'key\')');
    expect(result).toContain('fer.setVar(\'key\', \'value\')');
  });

  test('should translate pm.collectionVariables.get', () => {
    const inputScript = 'pm.collectionVariables.get(\'key\');';
    const result = postmanTranslation(inputScript);
    expect(result).toContain('fer.getCollectionVar(\'key\')');
  });

  test('should translate pm.expect with pm.environment.has', () => {
    const inputScript = 'pm.expect(pm.environment.has(\'key\')).to.be.true;';
    const result = postmanTranslation(inputScript);
    expect(result).toContain('fer.getEnvVar(\'key\') !== undefined && fer.getEnvVar(\'key\') !== null');
    expect(result).toContain('.to.be.true');
  });

  test('should translate pm.collectionVariables.set to fer.setCollectionVar', () => {
    const inputScript = 'pm.collectionVariables.set(\'key\', \'value\');';
    expect(postmanTranslation(inputScript)).toBe('fer.setCollectionVar(\'key\', \'value\');');
  });

  test('should translate pm.collectionVariables.unset to fer.deleteCollectionVar', () => {
    const inputScript = 'pm.collectionVariables.unset(\'key\');';
    expect(postmanTranslation(inputScript)).toBe('fer.deleteCollectionVar(\'key\');');
  });

  test('should translate pm.collectionVariables.clear to fer.deleteAllCollectionVars', () => {
    const inputScript = 'pm.collectionVariables.clear();';
    expect(postmanTranslation(inputScript)).toBe('fer.deleteAllCollectionVars();');
  });

  test('should translate pm.collectionVariables.toObject to fer.getAllCollectionVars', () => {
    const inputScript = 'const vars = pm.collectionVariables.toObject();';
    expect(postmanTranslation(inputScript)).toBe('const vars = fer.getAllCollectionVars();');
  });

  test('should translate pm.globals.unset to fer.deleteGlobalEnvVar', () => {
    const inputScript = 'pm.globals.unset(\'token\');';
    expect(postmanTranslation(inputScript)).toBe('fer.deleteGlobalEnvVar(\'token\');');
  });

  test('should translate pm.globals.clear to fer.deleteAllGlobalEnvVars', () => {
    const inputScript = 'pm.globals.clear();';
    expect(postmanTranslation(inputScript)).toBe('fer.deleteAllGlobalEnvVars();');
  });
});
