import type { Help, Option } from 'commander';
import chalk from 'chalk';
import {
  styleTitle,
  styleCommandText,
  styleOptionText,
  styleSubcommandText,
  styleArgumentText,
  styleDescriptionText,
} from './utils/color.js';

/** Help formatting configuration for Commander.js with colored output. */
export const helpConfig: Partial<Help> = {
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
