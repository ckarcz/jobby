import { Command, Option } from 'commander';
import chalk from 'chalk';
import process from 'node:process';
import { JobbyClient, type LogLevel } from 'jobby-client';
import type { JobDetailsQueryCliArgs } from '../types.js';
import { logLevelChoices, formatChoices } from '../constants.js';
import { outputResult } from '../utils/output.js';
import { readFromStream } from '../utils/stream.js';
import { activeCliArgs, helpConfig } from '../program.js';

/** Checks whether a string looks like a URL rather than a plain job ID. */
function isUrl(value: string): boolean {
  return value.includes('://') || value.startsWith('http');
}

/** Fetches and outputs job details for a given ID or URL. */
export async function queryForJobDetails(idOrUrl: string, args: JobDetailsQueryCliArgs): Promise<void> {
  const logLevel = (args.debug ? 'debug' : args.logLevel) ?? 'silent';
  const client = new JobbyClient({
    logging: { level: logLevel as LogLevel },
  });

  const url = args.url ?? ((!args.id && isUrl(idOrUrl)) ? idOrUrl : undefined);
  const id = args.id ?? ((!args.url && !isUrl(idOrUrl)) ? idOrUrl : undefined);

  if (args.format === 'rawHtml') {
    const rawHtml = url
      ? await client.jobs.queryForJobDetailsRawHtmlByUrl(url)
      : await client.jobs.queryForJobDetailsRawHtmlById(id ?? '');
    await outputResult(rawHtml, args);
    return;
  }

  const response = url
    ? await client.jobs.queryForJobDetailsByUrl(url)
    : await client.jobs.queryForJobDetailsById(id ?? '');

  await outputResult(response, args);
}

/** Creates the `details` subcommand with all options and argument parsing. */
export function createDetailsCommand(): Command {
  const command = new Command('details')
    .configureHelp(helpConfig)
    .description('get detailed information for a specific job posting')
    .argument('[id-or-url]', 'LinkedIn job ID or posting URL')
    .option('--url <url>', 'LinkedIn job posting URL')
    .option('--id <id>', 'LinkedIn job ID')
    .addOption(
      new Option('--format <type>', 'output format')
        .choices([...formatChoices])
        .default('json')
    )
    .option('--file <path>', 'write output to file instead of stdout')
    .option('--pretty', 'pretty print output (where applicable)')
    .option('--debug', 'enable debug logging and show stack traces on error')
    .addOption(new Option('--no-color', 'disable colored output'))
    .addOption(
      new Option('--log-level <level>', 'set logging verbosity')
        .choices([...logLevelChoices])
        .default('silent')
    )
    .action(async (idOrUrl: string | undefined, opts: JobDetailsQueryCliArgs) => {
      activeCliArgs.current = opts;
      const value = opts.url ?? opts.id ?? idOrUrl ?? await readFromStream(process.stdin, process.stdin.isTTY);
      if (!value) {
        console.error('Error: Missing required argument. Provide a job ID or URL as an argument, via --url/--id, or pipe via stdin');
        process.exit(1);
      }
      await queryForJobDetails(value, opts);
    });

  command.on('option:no-color', () => {
    command.configureOutput({
      getOutHasColors: () => false,
      getErrHasColors: () => false,
    });
  });

  command.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('$')} jobby details "https://www.linkedin.com/jobs/view/123456"
  ${chalk.dim('$')} jobby details 123456
  ${chalk.dim('$')} jobby details --id 123456
  ${chalk.dim('$')} jobby details --url "https://www.linkedin.com/jobs/view/123456"
  ${chalk.dim('$')} echo "123456" | jobby details`);

  return command;
}
