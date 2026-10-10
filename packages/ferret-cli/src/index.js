const yargs = require('yargs');
const chalk = require('chalk');
const { initializeShellEnv } = require('@ferret-app/requests');

const { CLI_EPILOGUE, CLI_VERSION } = require('./constants');

const printBanner = () => {
  console.log(chalk.yellow(`Fer CLI ${CLI_VERSION}`));
};

const run = async () => {
  // Fetch shell environment (useful when CLI is run as subprocess from GUI app or cron)
  await initializeShellEnv();

  const argLength = process.argv.length;
  const commandsToPrintBanner = ['--help', '-h'];

  if (argLength <= 2 || process.argv.find((arg) => commandsToPrintBanner.includes(arg))) {
    printBanner();
  }

  const { argv } = yargs
    .scriptName('fer')
    .strict()
    .commandDir('commands')
    .epilogue(CLI_EPILOGUE)
    .usage('Usage: $0 <command> [options]')
    .demandCommand(1, 'Please specify a command, e.g. "fer run" or "fer import"')
    .help('h')
    .alias('h', 'help');
};

module.exports = {
  run
};
