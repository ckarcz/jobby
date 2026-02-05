import chalk from 'chalk';

/** Styles text as a bold title for help output. */
export function styleTitle(s: string): string {
  return chalk.bold(s);
}

/** Styles text as a command name in cyan for help output. */
export function styleCommandText(s: string): string {
  return chalk.cyan(s);
}

/** Styles text as an option flag in green for help output. */
export function styleOptionText(s: string): string {
  return chalk.green(s);
}

/** Styles text as a subcommand name in cyan for help output. */
export function styleSubcommandText(s: string): string {
  return chalk.cyan(s);
}

/** Styles text as an argument placeholder in magenta for help output. */
export function styleArgumentText(s: string): string {
  return chalk.magenta(s);
}

/** Returns description text unstyled for help output. */
export function styleDescriptionText(s: string): string {
  return s;
}
