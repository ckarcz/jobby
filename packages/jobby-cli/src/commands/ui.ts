import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { App } from '../ui/App.js';
import { helpConfig } from '../program.js';

export function createUiCommand(): Command {
  const command = new Command('ui')
    .configureHelp(helpConfig)
    .description('launch interactive terminal UI for searching jobs')
    .action(async () => {
      const { waitUntilExit, cleanup } = render(
        React.createElement(App),
        {
          patchConsole: false, // Changed: avoid console interference
          exitOnCtrlC: true,
        }
      );

      try {
        await waitUntilExit();
      } finally {
        cleanup();
      }
    });
  return command;
}
