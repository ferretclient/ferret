// Forwards the caller's fer as a second arg so the host can attribute the call.
const bindRunRequest = (fer, runRequestByItemPathname) => {
  if (!runRequestByItemPathname) return;
  fer.runRequest = (relativePathname) =>
    runRequestByItemPathname(relativePathname, fer);
};

// Kept off fer to stay out of user-facing autocomplete.
const createScopeSetter = (fer) => (scope) => {
  fer._currentScope = scope || null;
};

module.exports = {
  bindRunRequest,
  createScopeSetter
};
