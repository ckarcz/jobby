import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { createJobbyMock } from './utils/test-helpers.js';

vi.mock('chalk', () => ({
  default: {
    bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
    green: (s: string) => `\x1b[32m${s}\x1b[39m`,
    magenta: (s: string) => `\x1b[35m${s}\x1b[39m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
    dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
  },
}));

vi.mock('cli-highlight', () => ({
  highlight: (str: string) => `\x1b[highlighted]${str}\x1b[/highlighted]`,
}));

vi.mock('jobby-client', () => createJobbyMock());

import { createProgram } from './program.js';
import { logLevelChoices, formatChoices } from './constants.js';
import {
  JOB_TYPE_CHOICES as jobTypeChoices,
  EXPERIENCE_LEVEL_CHOICES as experienceLevelChoices,
  MINIMUM_SALARY_CHOICES as minimumSalaryChoices,
  WORKPLACE_TYPE_CHOICES as workplaceTypeChoices,
  LISTING_AGE_CHOICES as listingAgeChoices,
} from 'jobby-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Tests for the Commander.js program configuration: command registration,
 * option definitions, option parsing, choice validation, default values,
 * help output formatting, version display, and choice constant values.
 */

function getSearchCommand(): Command {
  const program = createProgram();
  const cmd = program.commands.find(c => c.name() === 'search')!;
  cmd.action(() => { /* no-op */ });
  return cmd;
}

function getDetailsCommand(): Command {
  const program = createProgram();
  const cmd = program.commands.find(c => c.name() === 'details')!;
  cmd.action(() => { /* no-op */ });
  return cmd;
}

// ---------------------------------------------------------------------------
// Program setup
// ---------------------------------------------------------------------------

describe('createProgram - program initialization', () => {
  it('should create a Commander program instance', () => {
    const program = createProgram();
    expect(program).toBeInstanceOf(Command);
  });

  it('should set program name to "jobby"', () => {
    const program = createProgram();
    expect(program.name()).toBe('jobby');
  });

  it('should set program description', () => {
    const program = createProgram();
    expect(program.description()).toBe('search for jobs on LinkedIn from the command line');
  });

  it('should register the search subcommand', () => {
    const program = createProgram();
    const searchCommand = program.commands.find(cmd => cmd.name() === 'search');
    expect(searchCommand).toBeDefined();
    expect(searchCommand?.description()).toBe('search for jobs with filters');
  });

  it('should register the details subcommand', () => {
    const program = createProgram();
    const detailsCommand = program.commands.find(cmd => cmd.name() === 'details');
    expect(detailsCommand).toBeDefined();
    expect(detailsCommand?.description()).toBe('get detailed information for a specific job posting');
  });

  it('should configure no-color output on all commands when --no-color is set', () => {
    const program = createProgram();
    program.exitOverride();

    // Override all subcommand actions to no-op to prevent actual execution
    program.commands.forEach(cmd => cmd.action(() => {}));

    // Trigger the option:no-color event
    program.emit('option:no-color');

    // Verify that output was configured to disable colors on all subcommands
    for (const cmd of program.commands) {
      const output = cmd.configureOutput();
      expect(output?.getOutHasColors?.()).toBe(false);
      expect(output?.getErrHasColors?.()).toBe(false);
    }

    // Also verify the root program
    const rootOutput = program.configureOutput();
    expect(rootOutput?.getOutHasColors?.()).toBe(false);
    expect(rootOutput?.getErrHasColors?.()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Search command option definitions
// ---------------------------------------------------------------------------

describe('createProgram - search command option definitions', () => {
  let searchCommand: Command;

  beforeEach(() => {
    const program = createProgram();
    searchCommand = program.commands.find(cmd => cmd.name() === 'search')!;
  });

  describe('search query options', () => {
    it('should define --keyword as a string option', () => {
      const option = searchCommand.options.find(opt => opt.long === '--keyword');
      expect(option).toBeDefined();
    });

    it('should define --location as a string option', () => {
      const option = searchCommand.options.find(opt => opt.long === '--location');
      expect(option).toBeDefined();
    });

    it('should define --job-type with correct choices', () => {
      const option = searchCommand.options.find(opt => opt.long === '--job-type');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual(jobTypeChoices);
    });

    it('should define --experience-level with correct choices', () => {
      const option = searchCommand.options.find(opt => opt.long === '--experience-level');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual(experienceLevelChoices);
    });

    it('should define --minimum-salary with correct choices', () => {
      const option = searchCommand.options.find(opt => opt.long === '--minimum-salary');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual(minimumSalaryChoices);
    });

    it('should define --workplace-type with correct choices', () => {
      const option = searchCommand.options.find(opt => opt.long === '--workplace-type');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual(workplaceTypeChoices);
    });

    it('should define --listing-age with correct choices', () => {
      const option = searchCommand.options.find(opt => opt.long === '--listing-age');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual(listingAgeChoices);
    });

    it('should define --geo-id as a string option', () => {
      const option = searchCommand.options.find(opt => opt.long === '--geo-id');
      expect(option).toBeDefined();
    });

    it('should define --company-id as a string option', () => {
      const option = searchCommand.options.find(opt => opt.long === '--company-id');
      expect(option).toBeDefined();
    });
  });

  describe('search pagination options', () => {
    it('should define --start as a numeric option', () => {
      expect(searchCommand.options.find(opt => opt.long === '--start')).toBeDefined();
    });

    it('should define --skip as a numeric option', () => {
      expect(searchCommand.options.find(opt => opt.long === '--skip')).toBeDefined();
    });

    it('should define --take as a numeric option', () => {
      expect(searchCommand.options.find(opt => opt.long === '--take')).toBeDefined();
    });
  });

  describe('search output options', () => {
    it('should define --format with choices and default to "json"', () => {
      const option = searchCommand.options.find(opt => opt.long === '--format');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual([...formatChoices]);
      expect(option?.defaultValue).toBe('json');
    });

    it('should define --file as a string option', () => {
      const option = searchCommand.options.find(opt => opt.long === '--file');
      expect(option).toBeDefined();
    });

    it('should define --pretty as a boolean flag', () => {
      expect(searchCommand.options.find(opt => opt.long === '--pretty')).toBeDefined();
    });

    it('should define --no-color as a boolean flag', () => {
      expect(searchCommand.options.find(opt => opt.long === '--no-color')).toBeDefined();
    });
  });

  describe('search logging options', () => {
    it('should define --log-level with choices and default to "silent"', () => {
      const option = searchCommand.options.find(opt => opt.long === '--log-level');
      expect(option).toBeDefined();
      expect(option?.argChoices).toEqual([...logLevelChoices]);
      expect(option?.defaultValue).toBe('silent');
    });

    it('should define --debug as a boolean flag', () => {
      expect(searchCommand.options.find(opt => opt.long === '--debug')).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Details command option definitions
// ---------------------------------------------------------------------------

describe('createProgram - details command option definitions', () => {
  let detailsCommand: Command;

  beforeEach(() => {
    const program = createProgram();
    detailsCommand = program.commands.find(cmd => cmd.name() === 'details')!;
  });

  it('should define an optional [id-or-url] positional argument', () => {
    const args = detailsCommand.registeredArguments;
    expect(args).toHaveLength(1);
    expect(args[0].name()).toBe('id-or-url');
    expect(args[0].required).toBe(false);
  });

  it('should define --format with choices and default to "json"', () => {
    const option = detailsCommand.options.find(opt => opt.long === '--format');
    expect(option).toBeDefined();
    expect(option?.argChoices).toEqual([...formatChoices]);
    expect(option?.defaultValue).toBe('json');
  });

  it('should define --file as a string option', () => {
    const option = detailsCommand.options.find(opt => opt.long === '--file');
    expect(option).toBeDefined();
  });

  it('should define --pretty as a boolean flag', () => {
    expect(detailsCommand.options.find(opt => opt.long === '--pretty')).toBeDefined();
  });

  it('should define --no-color as a boolean flag', () => {
    expect(detailsCommand.options.find(opt => opt.long === '--no-color')).toBeDefined();
  });

  it('should define --log-level with choices and default to "silent"', () => {
    const option = detailsCommand.options.find(opt => opt.long === '--log-level');
    expect(option).toBeDefined();
    expect(option?.argChoices).toEqual([...logLevelChoices]);
    expect(option?.defaultValue).toBe('silent');
  });

  it('should define --debug as a boolean flag', () => {
    expect(detailsCommand.options.find(opt => opt.long === '--debug')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Search command option parsing
// ---------------------------------------------------------------------------

describe('search command option parsing', () => {
  describe('search query string options', () => {
    it('should parse --keyword to opts.keyword', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--keyword', 'TypeScript'], { from: 'node' });
      expect(cmd.opts().keyword).toBe('TypeScript');
    });

    it('should parse --location to opts.location', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--location', 'NYC'], { from: 'node' });
      expect(cmd.opts().location).toBe('NYC');
    });

    it('should parse --keyword and --location together', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--keyword', 'TypeScript', '--location', 'NYC'], { from: 'node' });
      const opts = cmd.opts();
      expect(opts.keyword).toBe('TypeScript');
      expect(opts.location).toBe('NYC');
    });

    it('should parse positional keyword argument', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', 'TypeScript'], { from: 'node' });
      expect(cmd.args).toContain('TypeScript');
    });

    it('should accept keywords with special characters', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--keyword', 'C#'], { from: 'node' });
      expect(cmd.opts().keyword).toBe('C#');
    });

    it('should accept locations with spaces', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--location', 'New York'], { from: 'node' });
      expect(cmd.opts().location).toBe('New York');
    });
  });

  describe('search --job-type choice parsing', () => {
    it.each([
      'full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship', 'other',
    ] as const)('should accept --job-type %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--job-type', value], { from: 'node' });
      expect(cmd.opts().jobType).toEqual([value]);
    });

    it('should accept multiple --job-type values', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--job-type', 'full-time', 'contract'], { from: 'node' });
      expect(cmd.opts().jobType).toEqual(['full-time', 'contract']);
    });
  });

  describe('search --experience-level choice parsing', () => {
    it.each([
      'internship', 'entry-level', 'associate', 'senior', 'director', 'executive',
    ] as const)('should accept --experience-level %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--experience-level', value], { from: 'node' });
      expect(cmd.opts().experienceLevel).toEqual([value]);
    });

    it('should accept multiple --experience-level values', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--experience-level', 'senior', 'director'], { from: 'node' });
      expect(cmd.opts().experienceLevel).toEqual(['senior', 'director']);
    });
  });

  describe('search --minimum-salary choice parsing', () => {
    it.each([
      '40,000', '60,000', '80,000', '100,000', '120,000', '140,000', '160,000', '180,000', '200,000',
    ] as const)('should accept --minimum-salary %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--minimum-salary', value], { from: 'node' });
      expect(cmd.opts().minimumSalary).toBe(value);
    });
  });

  describe('search --workplace-type choice parsing', () => {
    it.each([
      'on-site', 'remote', 'hybrid',
    ] as const)('should accept --workplace-type %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--workplace-type', value], { from: 'node' });
      expect(cmd.opts().workplaceType).toEqual([value]);
    });

    it('should accept multiple --workplace-type values', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--workplace-type', 'remote', 'hybrid'], { from: 'node' });
      expect(cmd.opts().workplaceType).toEqual(['remote', 'hybrid']);
    });
  });

  describe('search --listing-age choice parsing', () => {
    it.each([
      'past-24-hours', 'past-week', 'past-month',
    ] as const)('should accept --listing-age %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--listing-age', value], { from: 'node' });
      expect(cmd.opts().listingAge).toBe(value);
    });
  });

  describe('search boolean flag parsing', () => {
    it('should parse --geo-id to opts.geoId', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--geo-id', '103644278'], { from: 'node' });
      expect(cmd.opts().geoId).toBe('103644278');
    });

    it('should parse --company-id to opts.companyId', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--company-id', '1441'], { from: 'node' });
      expect(cmd.opts().companyId).toBe('1441');
    });

    it('should parse --pretty to true when present', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--pretty'], { from: 'node' });
      expect(cmd.opts().pretty).toBe(true);
    });

    it('should parse --debug to true when present', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--debug'], { from: 'node' });
      expect(cmd.opts().debug).toBe(true);
    });

    it('should set noColor to true when --no-color is present', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--no-color'], { from: 'node' });
      expect(cmd.opts().color).toBe(false);
    });
  });

  describe('search pagination option parsing', () => {
    it('should parse --start, --skip, --take as numbers', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--start', '10', '--skip', '2', '--take', '5'], { from: 'node' });
      const opts = cmd.opts();
      expect(opts.start).toBe(10);
      expect(opts.skip).toBe(2);
      expect(opts.take).toBe(5);
    });

    it('should parse zero as a valid pagination value', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--start', '0'], { from: 'node' });
      expect(cmd.opts().start).toBe(0);
    });

    it('should reject negative values for pagination', () => {
      const cmd = getSearchCommand();
      expect(() => cmd.parse(['node', 'search', '--start', '-1'], { from: 'node' })).toThrow(
        'Invalid number (must be non-negative): -1',
      );
    });

    it('should throw for non-numeric --start value', () => {
      const cmd = getSearchCommand();
      expect(() => cmd.parse(['node', 'search', '--start', 'abc'], { from: 'node' })).toThrow();
    });

    it('should throw for non-numeric --skip value', () => {
      const cmd = getSearchCommand();
      expect(() => cmd.parse(['node', 'search', '--skip', 'xyz'], { from: 'node' })).toThrow();
    });

    it('should throw for non-numeric --take value', () => {
      const cmd = getSearchCommand();
      expect(() => cmd.parse(['node', 'search', '--take', 'nope'], { from: 'node' })).toThrow();
    });
  });

  describe('search --file option parsing', () => {
    it('should parse --file to opts.file', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--file', 'output.json'], { from: 'node' });
      expect(cmd.opts().file).toBe('output.json');
    });

    it('should accept file paths with directories', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--file', './results/output.json'], { from: 'node' });
      expect(cmd.opts().file).toBe('./results/output.json');
    });
  });

  describe('search --log-level choice parsing', () => {
    it.each([
      'silent', 'error', 'warn', 'info', 'verbose', 'debug',
    ] as const)('should accept --log-level %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--log-level', value], { from: 'node' });
      expect(cmd.opts().logLevel).toBe(value);
    });
  });

  describe('search --format choice parsing', () => {
    it.each([
      'json', 'xml', 'yaml', 'csv', 'rawHtml',
    ] as const)('should accept --format %s', (value) => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search', '--format', value], { from: 'node' });
      expect(cmd.opts().format).toBe(value);
    });
  });

  describe('search default values when options are omitted', () => {
    it('should default --format to "json"', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().format).toBe('json');
    });

    it('should default --log-level to "silent"', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().logLevel).toBe('silent');
    });

    it('should leave --keyword undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().keyword).toBeUndefined();
    });

    it('should leave --location undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().location).toBeUndefined();
    });

    it('should leave --job-type undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().jobType).toBeUndefined();
    });

    it('should leave --experience-level undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().experienceLevel).toBeUndefined();
    });

    it('should leave --minimum-salary undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().minimumSalary).toBeUndefined();
    });

    it('should leave --workplace-type undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().workplaceType).toBeUndefined();
    });

    it('should leave --listing-age undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().listingAge).toBeUndefined();
    });

    it('should leave --geo-id undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().geoId).toBeUndefined();
    });

    it('should leave --company-id undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().companyId).toBeUndefined();
    });

    it('should leave --file undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().file).toBeUndefined();
    });

    it('should leave --pretty undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().pretty).toBeUndefined();
    });

    it('should leave --debug undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().debug).toBeUndefined();
    });

    it('should leave --start undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().start).toBeUndefined();
    });

    it('should leave --skip undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().skip).toBeUndefined();
    });

    it('should leave --take undefined when not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().take).toBeUndefined();
    });

    it('should default color to true when --no-color is not provided', () => {
      const cmd = getSearchCommand();
      cmd.parse(['node', 'search'], { from: 'node' });
      expect(cmd.opts().color).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Details command option parsing
// ---------------------------------------------------------------------------

describe('details command option parsing', () => {
  describe('details url argument', () => {
    it('should parse positional url argument', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://linkedin.com/jobs/view/123'], { from: 'node' });
      expect(cmd.args).toContain('https://linkedin.com/jobs/view/123');
    });

    it('should allow url argument to be omitted', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details'], { from: 'node' });
      expect(cmd.args).toHaveLength(0);
    });
  });

  describe('details --file option parsing', () => {
    it('should parse --file to opts.file', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com', '--file', 'details.json'], { from: 'node' });
      expect(cmd.opts().file).toBe('details.json');
    });
  });

  describe('details output options', () => {
    it('should parse --format json', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com', '--format', 'json'], { from: 'node' });
      expect(cmd.opts().format).toBe('json');
    });

    it('should parse --pretty flag', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com', '--pretty'], { from: 'node' });
      expect(cmd.opts().pretty).toBe(true);
    });

    it('should set noColor to true when --no-color is present', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com', '--no-color'], { from: 'node' });
      expect(cmd.opts().color).toBe(false);
    });
  });

  describe('details logging options', () => {
    it.each([
      'silent', 'error', 'warn', 'info', 'verbose', 'debug',
    ] as const)('should accept --log-level %s', (value) => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com', '--log-level', value], { from: 'node' });
      expect(cmd.opts().logLevel).toBe(value);
    });

    it('should parse --debug flag', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com', '--debug'], { from: 'node' });
      expect(cmd.opts().debug).toBe(true);
    });
  });

  describe('details default values when options are omitted', () => {
    it('should default --format to "json"', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com'], { from: 'node' });
      expect(cmd.opts().format).toBe('json');
    });

    it('should default --log-level to "silent"', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com'], { from: 'node' });
      expect(cmd.opts().logLevel).toBe('silent');
    });

    it('should leave --file undefined when not provided', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com'], { from: 'node' });
      expect(cmd.opts().file).toBeUndefined();
    });

    it('should leave --pretty undefined when not provided', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com'], { from: 'node' });
      expect(cmd.opts().pretty).toBeUndefined();
    });

    it('should leave --debug undefined when not provided', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com'], { from: 'node' });
      expect(cmd.opts().debug).toBeUndefined();
    });

    it('should default color to true when --no-color is not provided', () => {
      const cmd = getDetailsCommand();
      cmd.parse(['node', 'details', 'https://example.com'], { from: 'node' });
      expect(cmd.opts().color).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Command validation - invalid inputs
// ---------------------------------------------------------------------------

describe('command validation - invalid choice rejection', () => {
  describe('search command choice validation', () => {
    it('should reject invalid --job-type choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--job-type', 'invalid'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --experience-level choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--experience-level', 'invalid'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --workplace-type choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--workplace-type', 'invalid'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --listing-age choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--listing-age', 'invalid'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --minimum-salary choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--minimum-salary', '50000'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --format choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--format', 'invalid'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --log-level choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--log-level', 'invalid'], { from: 'node' })).toThrow();
    });
  });

  describe('details command choice validation', () => {
    it('should reject invalid --format choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'details', 'https://example.com', '--format', 'invalid'], { from: 'node' })).toThrow();
    });

    it('should reject invalid --log-level choice', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'details', 'https://example.com', '--log-level', 'trace'], { from: 'node' })).toThrow();
    });
  });

  describe('unknown command and option rejection', () => {
    it('should reject an unknown command', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'unknown'], { from: 'node' })).toThrow();
    });

    it('should reject an unknown option on search', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'search', '--unknown-option'], { from: 'node' })).toThrow();
    });

    it('should reject an unknown option on details', () => {
      const program = createProgram();
      program.exitOverride();
      expect(() => program.parse(['node', 'cli', 'details', 'https://example.com', '--unknown-option'], { from: 'node' })).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Help output
// ---------------------------------------------------------------------------

describe('help output formatting', () => {
  describe('main program help', () => {
    it('should display program name and subcommands', () => {
      const program = createProgram();
      const helpOutput = program.helpInformation();
      expect(helpOutput).toContain('jobby');
      expect(helpOutput).toContain('search');
      expect(helpOutput).toContain('details');
    });

    it('should display examples section', () => {
      const program = createProgram();
      program.exitOverride();
      let helpOutput = '';
      program.configureOutput({ writeOut: (str) => { helpOutput += str; }, writeErr: () => { } });
      try { program.parse(['node', 'cli', '--help'], { from: 'node' }); } catch { /* expected */ }
      expect(helpOutput).toContain('Examples:');
      expect(helpOutput).toContain('jobby search');
    });
  });

  describe('search command help', () => {
    it('should display search description and key options', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      const helpOutput = cmd.helpInformation();
      expect(helpOutput).toContain('search for jobs with filters');
      expect(helpOutput).toContain('--keyword');
      expect(helpOutput).toContain('--location');
      expect(helpOutput).toContain('--job-type');
    });

    it('should display all search option flags', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      const helpOutput = cmd.helpInformation();
      expect(helpOutput).toContain('--keyword');
      expect(helpOutput).toContain('--location');
      expect(helpOutput).toContain('--job-type');
      expect(helpOutput).toContain('--experience-level');
      expect(helpOutput).toContain('--minimum-salary');
      expect(helpOutput).toContain('--workplace-type');
      expect(helpOutput).toContain('--listing-age');
      expect(helpOutput).toContain('--geo-id');
      expect(helpOutput).toContain('--company-id');
      expect(helpOutput).toContain('--start');
      expect(helpOutput).toContain('--skip');
      expect(helpOutput).toContain('--take');
      expect(helpOutput).toContain('--file');
      expect(helpOutput).toContain('--format');
      expect(helpOutput).toContain('--pretty');
      expect(helpOutput).toContain('--no-color');
      expect(helpOutput).toContain('--log-level');
      expect(helpOutput).toContain('--debug');
    });

    it('should display search examples including stdin pipe', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      cmd.exitOverride();
      let helpOutput = '';
      cmd.configureOutput({ writeOut: (str) => { helpOutput += str; }, writeErr: () => { } });
      try { cmd.parse(['node', 'search', '--help'], { from: 'node' }); } catch { /* expected */ }
      expect(helpOutput).toContain('Examples:');
      expect(helpOutput).toContain('--job-type full-time');
      expect(helpOutput).toContain('echo "TypeScript" | jobby search');
    });

    it('should show choices in custom format (not Commander default)', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      const helpOutput = cmd.helpInformation();
      expect(helpOutput).toContain('choices:');
      expect(helpOutput).toContain('"full-time"');
      expect(helpOutput).toContain('"on-site"');
      expect(helpOutput).toContain('"internship"');
      expect(helpOutput).not.toContain('(choices:');
    });

    it('should show defaults in custom format (not Commander default)', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      const helpOutput = cmd.helpInformation();
      expect(helpOutput).toContain('default:');
      expect(helpOutput).toContain('"silent"');
      expect(helpOutput).toContain('"json"');
      expect(helpOutput).not.toContain('(default:');
    });
  });

  describe('details command help', () => {
    it('should display details description and id-or-url argument', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'details')!;
      const helpOutput = cmd.helpInformation();
      expect(helpOutput).toContain('get detailed information');
      expect(helpOutput).toContain('[id-or-url]');
    });

    it('should display all details option flags', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'details')!;
      const helpOutput = cmd.helpInformation();
      expect(helpOutput).toContain('--file');
      expect(helpOutput).toContain('--format');
      expect(helpOutput).toContain('--pretty');
      expect(helpOutput).toContain('--no-color');
      expect(helpOutput).toContain('--log-level');
      expect(helpOutput).toContain('--debug');
    });
  });
});

// ---------------------------------------------------------------------------
// Version output
// ---------------------------------------------------------------------------

describe('version output', () => {
  it('should display version from package.json with --version', async () => {
    const program = createProgram();
    program.exitOverride();
    let versionOutput = '';
    program.configureOutput({ writeOut: (str) => { versionOutput += str; }, writeErr: () => { } });
    try { await program.parseAsync(['node', 'cli', '--version']); } catch { /* expected */ }
    expect(versionOutput).toContain('1.0.0');
  });

  it('should not have a short -v flag for version', () => {
    const program = createProgram();
    const versionOption = program.options.find(opt => opt.long === '--version');
    expect(versionOption?.short).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Option choice arrays
// ---------------------------------------------------------------------------

describe('option choice constant values', () => {
  it('should include all expected job type choices', () => {
    expect(jobTypeChoices).toEqual(
      expect.arrayContaining(['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship', 'other'])
    );
    expect(jobTypeChoices).toHaveLength(7);
  });

  it('should include all expected experience level choices', () => {
    expect(experienceLevelChoices).toEqual(
      expect.arrayContaining(['internship', 'entry-level', 'associate', 'senior', 'director', 'executive'])
    );
    expect(experienceLevelChoices).toHaveLength(6);
  });

  it('should include all expected minimum salary choices', () => {
    expect(minimumSalaryChoices).toEqual(
      expect.arrayContaining(['40,000', '60,000', '80,000', '100,000', '120,000', '140,000', '160,000', '180,000', '200,000'])
    );
    expect(minimumSalaryChoices).toHaveLength(9);
  });

  it('should include all expected workplace type choices', () => {
    expect(workplaceTypeChoices).toEqual(
      expect.arrayContaining(['on-site', 'remote', 'hybrid'])
    );
    expect(workplaceTypeChoices).toHaveLength(3);
  });

  it('should include all expected listing age choices', () => {
    expect(listingAgeChoices).toEqual(
      expect.arrayContaining(['past-24-hours', 'past-week', 'past-month'])
    );
    expect(listingAgeChoices).toHaveLength(3);
  });

  it('should include all expected log level choices', () => {
    expect([...logLevelChoices]).toEqual(
      expect.arrayContaining(['silent', 'error', 'warn', 'info', 'verbose', 'debug'])
    );
    expect(logLevelChoices).toHaveLength(6);
  });

  it('should include all expected format choices', () => {
    expect([...formatChoices]).toEqual(['json', 'xml', 'yaml', 'csv', 'rawHtml']);
    expect(formatChoices).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Help output colorization
// ---------------------------------------------------------------------------

const ANSI_REGEX = /\x1b\[/;

describe('help output colorization', () => {
  describe('main program help with colors enabled', () => {
    it('should contain ANSI escape codes in helpInformation when colors are enabled', () => {
      const program = createProgram();
      program.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = program.helpInformation();
      expect(ANSI_REGEX.test(helpOutput)).toBe(true);
    });

    it('should style section titles with bold', () => {
      const program = createProgram();
      program.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = program.helpInformation();
      // Bold open code \x1b[1m should appear (from styleTitle)
      expect(helpOutput).toContain('\x1b[1m');
    });

    it('should style subcommand names with cyan', () => {
      const program = createProgram();
      program.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = program.helpInformation();
      // Cyan code \x1b[36m should appear (from styleSubcommandText)
      expect(helpOutput).toContain('\x1b[36m');
    });
  });

  describe('main program help with colors disabled', () => {
    it('should NOT contain ANSI escape codes when colors are disabled', () => {
      const program = createProgram();
      program.configureOutput({ getOutHasColors: () => false, getErrHasColors: () => false });
      const helpOutput = program.helpInformation();
      expect(ANSI_REGEX.test(helpOutput)).toBe(false);
    });

    it('should still contain section text content when colors are disabled', () => {
      const program = createProgram();
      program.configureOutput({ getOutHasColors: () => false, getErrHasColors: () => false });
      const helpOutput = program.helpInformation();
      expect(helpOutput).toContain('jobby');
      expect(helpOutput).toContain('search');
      expect(helpOutput).toContain('details');
    });
  });

  describe('addHelpText examples with colors', () => {
    it('should include ANSI codes in examples when colors are enabled', () => {
      const program = createProgram();
      program.exitOverride();
      program.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      let helpOutput = '';
      program.configureOutput({ writeOut: (str) => { helpOutput += str; }, getOutHasColors: () => true });
      try { program.parse(['node', 'cli', '--help'], { from: 'node' }); } catch { /* expected */ }
      expect(ANSI_REGEX.test(helpOutput)).toBe(true);
      expect(helpOutput).toContain('Examples:');
    });

    it('should strip ANSI codes from examples when colors are disabled', () => {
      const program = createProgram();
      program.exitOverride();
      let helpOutput = '';
      program.configureOutput({ writeOut: (str) => { helpOutput += str; }, getOutHasColors: () => false });
      try { program.parse(['node', 'cli', '--help'], { from: 'node' }); } catch { /* expected */ }
      expect(ANSI_REGEX.test(helpOutput)).toBe(false);
      expect(helpOutput).toContain('Examples:');
    });
  });

  describe('search command help colorization', () => {
    it('should contain ANSI codes when colors are enabled', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      cmd.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = cmd.helpInformation();
      expect(ANSI_REGEX.test(helpOutput)).toBe(true);
    });

    it('should style option names with green', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      cmd.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = cmd.helpInformation();
      // Green code \x1b[32m should appear (from styleOptionText)
      expect(helpOutput).toContain('\x1b[32m');
    });

    it('should NOT contain ANSI codes when colors are disabled', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'search')!;
      cmd.configureOutput({ getOutHasColors: () => false, getErrHasColors: () => false });
      const helpOutput = cmd.helpInformation();
      expect(ANSI_REGEX.test(helpOutput)).toBe(false);
    });
  });

  describe('details command help colorization', () => {
    it('should contain ANSI codes when colors are enabled', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'details')!;
      cmd.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = cmd.helpInformation();
      expect(ANSI_REGEX.test(helpOutput)).toBe(true);
    });

    it('should style argument text with magenta', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'details')!;
      cmd.configureOutput({ getOutHasColors: () => true, getErrHasColors: () => true });
      const helpOutput = cmd.helpInformation();
      // Magenta code \x1b[35m should appear (from styleArgumentText for [url])
      expect(helpOutput).toContain('\x1b[35m');
    });

    it('should NOT contain ANSI codes when colors are disabled', () => {
      const program = createProgram();
      const cmd = program.commands.find(c => c.name() === 'details')!;
      cmd.configureOutput({ getOutHasColors: () => false, getErrHasColors: () => false });
      const helpOutput = cmd.helpInformation();
      expect(ANSI_REGEX.test(helpOutput)).toBe(false);
    });
  });

  describe('--no-color flag on root program', () => {
    it('should define --no-color on the root program', () => {
      const program = createProgram();
      const option = program.options.find(opt => opt.long === '--no-color');
      expect(option).toBeDefined();
    });
  });
});
