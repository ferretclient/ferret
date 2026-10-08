const ferToJsonV2 = require('../v2/src/ferToJson');
const jsonToFerV2 = require('../v2/src/jsonToFer');
const ferToEnvJsonV2 = require('../v2/src/envToJson');
const envJsonToFerV2 = require('../v2/src/jsonToEnv');
const dotenvToJson = require('../v2/src/dotenvToJson');

const collectionFerToJson = require('../v2/src/collectionFerToJson');
const jsonToCollectionFer = require('../v2/src/jsonToCollectionFer');
const { outdentString } = require('../v2/src/utils');

// Todo: remove V2 suffixes
// Changes will have to be made to the CLI and GUI

module.exports = {
  ferToJsonV2,
  jsonToFerV2,
  ferToEnvJsonV2,
  envJsonToFerV2,

  collectionFerToJson,
  jsonToCollectionFer,

  dotenvToJson,

  outdentString
};
