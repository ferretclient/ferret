import each from 'lodash/each';
import { invalidVariableCharacterRegex } from '../constants';
import { uuid } from '../common';

const isSecret = (type) => {
  return type === 'secret';
};

const importPostmanEnvironmentVariables = (ferretEnvironment, values = []) => {
  ferretEnvironment.variables = ferretEnvironment.variables || [];

  each(values.filter((i) => !(i.key == null && i.value == null)), (i) => {
    const ferretEnvironmentVariable = {
      uid: uuid(),
      name: (i.key ?? '').replace(invalidVariableCharacterRegex, '_'),
      value: i.value ?? '',
      enabled: i.enabled ?? true,
      type: 'text',
      secret: isSecret(i.type)
    };

    ferretEnvironment.variables.push(ferretEnvironmentVariable);
  });
};

const importPostmanEnvironment = (environment) => {
  const ferretEnvironment = {
    name: environment.name,
    variables: []
  };

  importPostmanEnvironmentVariables(ferretEnvironment, environment.values);
  return ferretEnvironment;
};

export const postmanToFerretEnvironment = (postmanEnvironment) => {
  try {
    return importPostmanEnvironment(postmanEnvironment);
  } catch (err) {
    console.log(err);
    throw new Error('Unable to parse the postman environment json file');
  }
};

export default postmanToFerretEnvironment;
