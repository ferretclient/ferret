// Markdown files are imported as plain strings (rsbuild's `asset/source` rule does the same in the app).
// eslint-disable-next-line no-undef
module.exports = {
  process(source) {
    return { code: `module.exports = ${JSON.stringify(source)};` };
  }
};
