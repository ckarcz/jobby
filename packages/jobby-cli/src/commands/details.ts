import { Command, Option } from 'commander';
import chalk from 'chalk';
import process from 'node:process';
import { JobbyClient, ValidationError } from 'jobby-client';
import type { JobDetailsQueryCliArgs, ActiveCliArgsRef } from '../types.js';
import { logLevelChoices, formatChoices } from '../constants.js';
import { outputResult } from '../utils/output.js';
import { readFromStream } from '../utils/stream.js';
import { helpConfig } from '../help-config.js';

/** Returns true when value is a valid absolute URL, false otherwise. */
function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Fetches and outputs job details for a resolved target (URL or ID). */
export async function queryForJobDetails(
  target: { url?: string; id?: string },
  args: JobDetailsQueryCliArgs,
): Promise<void> {
  const logLevel = (args.debug ? 'debug' : args.logLevel) ?? 'silent';
  const client = new JobbyClient({
    logging: { level: logLevel },
  });

  if (target.url) {
    if (args.format === 'rawHtml') {
      const rawHtml = await client.jobs.queryForJobDetailsRawHtmlByUrl(target.url);
      await outputResult(rawHtml, args);
      return;
    }
    const response = await client.jobs.queryForJobDetailsByUrl(target.url);
    await outputResult(response, args);
    return;
  }

  if (!target.id) {
    throw new ValidationError('Could not resolve a job ID or URL from the provided input');
  }

  if (args.format === 'rawHtml') {
    const rawHtml = await client.jobs.queryForJobDetailsRawHtmlById(target.id);
    await outputResult(rawHtml, args);
    return;
  }

  const response = await client.jobs.queryForJobDetailsById(target.id);

  await outputResult(response, args);
}

/** Creates the `details` subcommand with all options and argument parsing. */
export function createDetailsCommand(activeCliArgsRef: ActiveCliArgsRef = { current: {} }): Command {
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
      activeCliArgsRef.current = opts;
      const raw = opts.url ?? opts.id ?? idOrUrl ?? await readFromStream(process.stdin, process.stdin.isTTY);
      if (!raw) {
        throw new ValidationError('Missing required argument. Provide a job ID or URL as an argument, via --url/--id, or pipe via stdin');
      }

      const resolvedUrl = opts.url ?? ((!opts.id && isUrl(raw)) ? raw : undefined);

      if (resolvedUrl) {
        await queryForJobDetails({ url: resolvedUrl }, opts);
      } else {
        await queryForJobDetails({ id: opts.id ?? raw }, opts);
      }
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
