import { FerretError } from 'utils/common/error';
import { postmanToFerretEnvironment } from '@useferret/converters';
import { coerceEnvName, dedupeImportedSecrets } from 'utils/environments';

const importEnvironment = async (parsedFiles) => {
  try {
    const valid = [];
    const invalid = [];

    for (const parsedFile of parsedFiles) {
      try {
        const environment = postmanToFerretEnvironment(parsedFile.content);
        const name = coerceEnvName(environment.name);
        if (name === null) {
          throw new FerretError('Invalid environment: missing or invalid name');
        }
        valid.push({ ...environment, name, variables: dedupeImportedSecrets(environment.variables), filePath: parsedFile.filePath, fileName: parsedFile.fileName });
      } catch (err) {
        console.error(`Error processing file: ${parsedFile.fileName}`, err);
        invalid.push({ fileName: parsedFile.fileName, error: err.message });
      }
    }

    return { valid, invalid };
  } catch (err) {
    console.log(err);
    throw err instanceof FerretError ? err : new FerretError('Import Environment failed');
  }
};

export default importEnvironment;
