import { Command, Option } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'node:module';
import { createSearchCommand } from './commands/search.js';
import { createDetailsCommand } from './commands/details.js';
import { createUiCommand } from './commands/ui.js';
import type { JobSearchQueryCliArgs, JobDetailsQueryCliArgs } from './types.js';
import {
  styleTitle,
  styleCommandText,
  styleOptionText,
  styleSubcommandText,
  styleArgumentText,
  styleDescriptionText,
} from './utils/color.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

/**
 * Holds the active CLI args set by action handlers before execution.
 * Allows error handlers to access parsed options like debug mode.
 */
export const activeCliArgs: { current: JobSearchQueryCliArgs | JobDetailsQueryCliArgs } = {
  current: {},
};

/** Help formatting configuration for Commander.js with colored output. */
export const helpConfig = {
  optionDescription(option: Option): string {
    const parts: string[] = [option.description];
    if (option.argChoices) {
      const choices = option.argChoices.map((c: string) => `"${c}"`).join(', ');
      parts.push(`${chalk.yellow('choices:')} ${chalk.cyan(`[${choices}]`)}`);
    }
    if (option.defaultValue !== undefined) {
      const defaultStr = option.defaultValueDescription ?? JSON.stringify(option.defaultValue);
      parts.push(`${chalk.yellow('default:')} ${chalk.magenta(defaultStr)}`);
    }
    return parts.join(' ');
  },
  styleTitle,
  styleCommandText,
  styleOptionText,
  styleSubcommandText,
  styleArgumentText,
  styleDescriptionText,
};

/** Creates the root Commander.js program with all subcommands registered. */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('jobby')
    .description('search for jobs on LinkedIn from the command line')
    .version(packageJson.version, '--version', 'show version number')
    .addOption(new Option('--no-color', 'disable colored output'))
    .configureHelp(helpConfig);

  program.on('option:no-color', () => {
    const noColorOutput = {
      getOutHasColors: (): boolean => false,
      getErrHasColors: (): boolean => false,
    };
    program.configureOutput(noColorOutput);
    program.commands.forEach(cmd => cmd.configureOutput(noColorOutput));
  });

  program.addCommand(createSearchCommand());
  program.addCommand(createDetailsCommand());
  program.addCommand(createUiCommand());

  program.addHelpText('after',`
${chalk.bold('Examples:')}
  ${chalk.dim('$')} jobby search "software engineer" --location "New York"
  ${chalk.dim('$')} jobby search "React" --workplace-type remote --experience-level senior
  ${chalk.dim('$')} jobby details "https://linkedin.com/jobs/view/123456"

Run 'jobby <command> --help' for more information on a command.`);

  return program;
}
