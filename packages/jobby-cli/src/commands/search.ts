import { Command, Option } from 'commander';
import chalk from 'chalk';
import process from 'node:process';
import {
  JobbyClient,
  ValidationError,
  type LogLevel,
  type JobType,
  type ExperienceLevel,
  type MinimumSalary,
  type WorkplaceType,
  type ListingAge,
  JOB_TYPE_CHOICES,
  EXPERIENCE_LEVEL_CHOICES,
  MINIMUM_SALARY_CHOICES,
  WORKPLACE_TYPE_CHOICES,
  LISTING_AGE_CHOICES,
} from 'jobby-client';
import type { JobSearchQueryCliArgs, ActiveCliArgsRef } from '../types.js';
import { fetchDetailsInBatches } from '../utils/enrich.js';
import { logLevelChoices, formatChoices } from '../constants.js';
import { outputResult } from '../utils/output.js';
import { readFromStream } from '../utils/stream.js';
import { parseNumber } from '../utils/parse.js';
import { helpConfig } from '../program.js';

/** Executes a job search using the provided CLI arguments and outputs the results. */
export async function queryForJobs(args: JobSearchQueryCliArgs): Promise<void> {
  const logLevel = (args.debug ? 'debug' : args.logLevel) ?? 'silent';
  const client = new JobbyClient({
    logging: { level: logLevel as LogLevel },
  });

  const searchParams = {
    keyword: args.keyword,
    location: args.location,
    jobType: args.jobType as JobType | undefined,
    experienceLevel: args.experienceLevel as ExperienceLevel | undefined,
    minimumSalary: args.minimumSalary as MinimumSalary | undefined,
    workplaceType: args.workplaceType as WorkplaceType | undefined,
    listingAge: args.listingAge as ListingAge | undefined,
    geoId: args.geoId,
    companyId: args.companyId,
  };

  const paginationParams = {
    start: args.start,
    skip: args.skip,
    take: args.take,
  };

  if (args.format === 'rawHtml') {
    if (args.detailed) {
      throw new ValidationError('--detailed cannot be used with --format rawHtml');
    }
    const rawHtml = await client.jobs.queryForJobsRawHtml(searchParams, paginationParams);
    if (rawHtml) {
      await outputResult(rawHtml, args);
    }
    return;
  }

  const response = await client.jobs.queryForJobs(searchParams, paginationParams);

  if (args.detailed && response.results.length > 0) {
    const enrichedResults = await fetchDetailsInBatches(
      response.results,
      (id) => client.jobs.queryForJobDetailsById(id),
    );
    await outputResult({ ...response, results: enrichedResults }, args);
    return;
  }

  await outputResult(response, args);
}

/** Creates the `search` subcommand with all options and argument parsing. */
export function createSearchCommand(activeCliArgsRef: ActiveCliArgsRef = { current: {} }): Command {
  const command = new Command('search')
    .configureHelp(helpConfig)
    .description('search for jobs with filters')
    .usage('[keyword] [options]')
    .argument('[keyword]', 'job title, skill, or company name')
    .option('--keyword <string>', 'job title, skill, or company name')
    .option('--location <string>', 'city, state, or country')
    .addOption(
      new Option('--job-type <type>', 'type of job')
        .choices(JOB_TYPE_CHOICES)
    )
    .addOption(
      new Option('--experience-level <level>', 'required experience level')
        .choices(EXPERIENCE_LEVEL_CHOICES)
    )
    .addOption(
      new Option('--minimum-salary <salary>', 'minimum salary threshold')
        .choices(MINIMUM_SALARY_CHOICES)
    )
    .addOption(
      new Option('--workplace-type <type>', 'work location type')
        .choices(WORKPLACE_TYPE_CHOICES)
    )
    .addOption(
      new Option('--listing-age <age>', 'how recently the job was posted')
        .choices(LISTING_AGE_CHOICES)
    )
    .option('--geo-id <id>', 'LinkedIn geo ID (e.g. 103644278 for US)')
    .option('--company-id <id>', 'LinkedIn company ID (e.g. 1441 for Google)')
    .option('--start <number>', 'starting offset for pagination', parseNumber)
    .option('--skip <number>', 'number of results to skip from response', parseNumber)
    .option('--take <number>', 'maximum number of results to return', parseNumber)
    .option('--detailed', 'fetch full details for each job result')
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
    .action(async (positionalKeyword: string | undefined, opts: JobSearchQueryCliArgs) => {
      activeCliArgsRef.current = opts;
      const keyword = opts.keyword ?? positionalKeyword ?? await readFromStream(process.stdin, process.stdin.isTTY);
      await queryForJobs({ ...opts, keyword });
    });

  command.on('option:no-color', () => {
    command.configureOutput({
      getOutHasColors: () => false,
      getErrHasColors: () => false,
    });
  });

  command.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('$')} jobby search "TypeScript" --location "San Francisco" --job-type full-time
  ${chalk.dim('$')} jobby search "React" --workplace-type remote --minimum-salary 120,000
  ${chalk.dim('$')} jobby search "Python" --experience-level senior --geo-id 103644278 --take 5
  ${chalk.dim('$')} echo "TypeScript" | jobby search`);

  return command;
}
