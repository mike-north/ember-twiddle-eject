import chalk from 'chalk';
import * as commander from 'commander';
import twiddleEject from './index';

let twiddleUrl!: string;
let projectName!: string;

commander
  .arguments('<twiddle-url> <project-name>')
  .action((twUrl, prName) => {
    twiddleUrl = twUrl;
    projectName = prName;
  })
  .parse(process.argv);

if (typeof twiddleUrl === 'undefined' || typeof projectName === 'undefined') {
  if (typeof twiddleUrl === 'undefined') {
    process.stderr.write(chalk.red('ERROR: no twiddle URL given!') + '\n');
  }
  if (typeof projectName === 'undefined') {
    process.stderr.write(chalk.red('ERROR: no project name given!') + '\n');
  }
  commander.outputHelp();
  process.exit(1);
}

process.stdout.write('Twiddle URL: ' + chalk.green(twiddleUrl) + '\n');
process.stdout.write('New Project Name: ' + chalk.green(projectName) + '\n');
twiddleEject(twiddleUrl, projectName);
