import translateFerToPostman from '../../../src/utils/ferret-to-postman-translator';

describe('Ferret to Postman Cookies Translation', () => {
  // Cookie jar translation
  it('should translate fer.cookies.jar to pm.cookies.jar', () => {
    const code = 'const jar = fer.cookies.jar();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const jar = pm.cookies.jar();');
  });

  // Cookie method translations with direct jar call chaining
  it('should translate getCookie to get (direct chaining)', () => {
    const code = 'const sessionId = fer.cookies.jar().getCookie("https://example.com", "sessionId");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const sessionId = pm.cookies.jar().get("https://example.com", "sessionId");');
  });

  it('should translate getCookies to getAll (direct chaining)', () => {
    const code = 'const allCookies = fer.cookies.jar().getCookies("https://example.com");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const allCookies = pm.cookies.jar().getAll("https://example.com");');
  });

  it('should translate setCookie to set (direct chaining)', () => {
    const code = 'fer.cookies.jar().setCookie("https://example.com", "token", "abc123");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.cookies.jar().set("https://example.com", "token", "abc123");');
  });

  it('should translate deleteCookie to unset (direct chaining)', () => {
    const code = 'fer.cookies.jar().deleteCookie("https://example.com", "sessionId");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.cookies.jar().unset("https://example.com", "sessionId");');
  });

  it('should translate deleteCookies to clear (direct chaining)', () => {
    const code = 'fer.cookies.jar().deleteCookies("https://example.com");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('pm.cookies.jar().clear("https://example.com");');
  });

  // Cookie method translations with jar variable
  it('should translate getCookie to get (jar variable)', () => {
    const code = `
const jar = fer.cookies.jar();
const sessionId = jar.getCookie("https://example.com", "sessionId");
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const sessionId = jar.get("https://example.com", "sessionId");');
  });

  it('should translate getCookies to getAll (jar variable)', () => {
    const code = `
const jar = fer.cookies.jar();
const allCookies = jar.getCookies("https://example.com");
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const allCookies = jar.getAll("https://example.com");');
  });

  it('should translate setCookie to set (jar variable)', () => {
    const code = `
const jar = fer.cookies.jar();
jar.setCookie("https://example.com", "token", "abc123");
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.set("https://example.com", "token", "abc123");');
  });

  it('should translate deleteCookie to unset (jar variable)', () => {
    const code = `
const jar = fer.cookies.jar();
jar.deleteCookie("https://example.com", "sessionId");
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.unset("https://example.com", "sessionId");');
  });

  it('should translate deleteCookies to clear (jar variable)', () => {
    const code = `
const jar = fer.cookies.jar();
jar.deleteCookies("https://example.com");
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.clear("https://example.com");');
  });

  // Complex cookie scenarios
  it('should handle multiple cookie operations together', () => {
    const code = `
const jar = fer.cookies.jar();
const domain = "https://api.example.com";

// Check existing cookie
const existingToken = jar.getCookie(domain, "authToken");

if (!existingToken) {
    // Set new cookie
    jar.setCookie(domain, "authToken", fer.getEnvVar("token"));
}

// Get all cookies for logging
const allCookies = jar.getCookies(domain);
console.log("Current cookies:", allCookies);
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const existingToken = jar.get(domain, "authToken");');
    expect(translatedCode).toContain('jar.set(domain, "authToken", pm.environment.get("token"));');
    expect(translatedCode).toContain('const allCookies = jar.getAll(domain);');
  });

  it('should handle cookie cleanup scenario', () => {
    const code = `
const jar = fer.cookies.jar();
const domain = fer.getEnvVar("apiDomain");

// Clear specific cookies
jar.deleteCookie(domain, "session");
jar.deleteCookie(domain, "tempToken");

// Or clear all cookies
if (fer.getVar("clearAll") === "true") {
    jar.deleteCookies(domain);
}
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const domain = pm.environment.get("apiDomain");');
    expect(translatedCode).toContain('jar.unset(domain, "session");');
    expect(translatedCode).toContain('jar.unset(domain, "tempToken");');
    expect(translatedCode).toContain('if (pm.variables.get("clearAll") === "true") {');
    expect(translatedCode).toContain('jar.clear(domain);');
  });

  // Direct cookie access API tests (fer.cookies.get/has/toObject)
  it('should translate fer.cookies.get to pm.cookies.get', () => {
    const code = 'const token = fer.cookies.get("authToken");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const token = pm.cookies.get("authToken");');
  });

  it('should translate fer.cookies.has to pm.cookies.has', () => {
    const code = 'const exists = fer.cookies.has("sessionId");';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const exists = pm.cookies.has("sessionId");');
  });

  it('should translate fer.cookies.toString to pm.cookies.toString', () => {
    const code = 'const str = fer.cookies.toString();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const str = pm.cookies.toString();');
  });

  it('should pass through jar().hasCookie() (no Postman equivalent)', () => {
    const code = 'const exists = fer.cookies.jar().hasCookie("https://example.com", "session");';
    const translatedCode = translateFerToPostman(code);
    // hasCookie has no Postman equivalent, so the jar() part translates but hasCookie stays
    expect(translatedCode).toContain('pm.cookies.jar().hasCookie');
  });

  it('should translate fer.cookies.toObject to pm.cookies.toObject', () => {
    const code = 'const allCookies = fer.cookies.toObject();';
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toBe('const allCookies = pm.cookies.toObject();');
  });

  it('should translate fer.cookies.has in conditional', () => {
    const code = `if (fer.cookies.has("auth")) {
  console.log(fer.cookies.get("auth"));
}`;
    const translatedCode = translateFerToPostman(code);
    expect(translatedCode).toContain('if (pm.cookies.has("auth"))');
    expect(translatedCode).toContain('console.log(pm.cookies.get("auth"))');
  });

  it('should handle mixed direct cookie access and jar methods', () => {
    const code = `
const token = fer.cookies.get("authToken");
const jar = fer.cookies.jar();
jar.setCookie("https://example.com", "newCookie", "value");
const allCookies = fer.cookies.toObject();
`;
    const translatedCode = translateFerToPostman(code);

    expect(translatedCode).toContain('const token = pm.cookies.get("authToken");');
    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.set("https://example.com", "newCookie", "value");');
    expect(translatedCode).toContain('const allCookies = pm.cookies.toObject();');
  });
});
