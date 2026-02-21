#!/usr/bin/env node

import process from 'node:process';
import { JobbyError } from 'jobby-client';
import { createProgram } from './program.js';
import type { ActiveCliArgsRef } from './types.js';
import { registerDefaultFormatters } from './formatters/index.js';
import { formatErrorMessage } from './utils/errors.js';

/**
 * CLI entry point. Sets up signal handlers, initializes formatters,
 * creates the program, and parses command-line arguments.
 */
export async function main(): Promise<void> {
  const activeCliArgs: ActiveCliArgsRef = { current: {} };

  process.once('SIGINT', () => {
    if (activeCliArgs.current.debug || activeCliArgs.current.logLevel === 'debug') {
      console.debug('Received SIGINT signal. Terminating.');
    }
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    if (activeCliArgs.current.debug || activeCliArgs.current.logLevel === 'debug') {
      console.debug('Received SIGTERM signal. Terminating.');
    }
    process.exit(143);
  });
  process.once('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled promise rejection:', reason);
    process.exit(1);
  });
  process.once('uncaughtException', (error: Error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  registerDefaultFormatters();
  const program = createProgram(activeCliArgs);

  program.exitOverride();
  program.configureOutput({
    outputError: (str, write) => { write(str); },
  });

  try {
    await program.parseAsync(process.argv);
  } catch (error: unknown) {
    if (error instanceof JobbyError) {
      console.error(formatErrorMessage(error));
      if (activeCliArgs.current.debug) {
        if (error.stack) {
          console.error('\nStack trace:', error.stack);
        }
        if (error.originalError) {
          console.error('\nOriginal error:', error.originalError);
        }
      }
      process.exit(1);
    }

    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'commander.helpDisplayed' || code === 'commander.version') {
        process.exit(0);
      }
      if (code.startsWith('commander.')) {
        process.exit(1);
      }
    }

    console.error('Unexpected error:', error);
    if (activeCliArgs.current.debug && error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

void main();
