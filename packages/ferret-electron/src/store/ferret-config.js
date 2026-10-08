/**
 * This modules stores the configs loaded from ferret.json
 */

const config = {};

// collectionUid is a hash based on the collection path
const getFerretConfig = (collectionUid, collection) => {
  if (collection?.draft?.ferretConfig) {
    return collection.draft.ferretConfig;
  }
  return config[collectionUid] || {};
};

const setFerretConfig = (collectionUid, ferretConfig) => {
  config[collectionUid] = ferretConfig;
};

const clearFerretConfig = (collectionUid) => {
  delete config[collectionUid];
};

module.exports = {
  getFerretConfig,
  setFerretConfig,
  clearFerretConfig
};
