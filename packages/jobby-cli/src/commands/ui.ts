import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { App } from '../ui/App.js';
import { helpConfig } from '../program.js';

// swapping terminal buffers may not work well on every OS
// it does work very well on Windows
export function swapScreenBuffer(): void {
  process.stdout.write('\x1B[?1049h');
}
export function restoreScreenBuffer(): void {
  process.stdout.write('\x1B[?1049l');
}

/** Creates the `ui` subcommand that launches the interactive terminal UI. */
export function createUiCommand(): Command {
  const command = new Command('ui')
    .configureHelp(helpConfig)
    .description('launch interactive terminal UI for searching jobs')
    .option('--no-swap', 'skip terminal screen buffer swapping')
    .action(async (_opts, cmd: Command) => {
      if (!process.stdout.isTTY) {
        cmd.error('The ui command requires an interactive terminal (TTY).');
      }
      const swap = cmd.opts<{ swap: boolean }>().swap;
      if (swap) {
        swapScreenBuffer();
      }
      const { waitUntilExit, cleanup } = render(
        React.createElement(App),
        {
          patchConsole: true,
          exitOnCtrlC: true,
          incrementalRendering: true,
        }
      );
      try {
        await waitUntilExit();
      } finally {
        cleanup();
        if (swap) {
          restoreScreenBuffer();
        }
      }
    });
  return command;
}
