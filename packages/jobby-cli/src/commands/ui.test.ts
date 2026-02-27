import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommanderError } from 'commander';

vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({
    waitUntilExit: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
  }),
}));

vi.mock('../ui/App.js', () => ({
  App: 'MockedApp',
}));

import { createUiCommand } from './ui.js';

/**
 * Tests for the ui command TTY guard that prevents the interactive
 * terminal UI from launching in non-interactive environments (piped
 * output, CI, redirected stdout, etc.).
 */

describe('createUiCommand - TTY guard', () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  it('should reject with a TTY error when stdout is not a TTY', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const command = createUiCommand();
    command.exitOverride();
    command.configureOutput({ writeErr: () => { } });

    await expect(
      command.parseAsync(['node', 'ui'], { from: 'node' })
    ).rejects.toThrow(CommanderError);

    await expect(
      command.parseAsync(['node', 'ui'], { from: 'node' })
    ).rejects.toThrow('The ui command requires an interactive terminal (TTY).');
  });

  it('should not reject the TTY guard when stdout is a TTY', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });

    const command = createUiCommand();
    command.exitOverride();

    // Should not throw the TTY error; the mocked ink render resolves immediately
    await expect(
      command.parseAsync(['node', 'ui'], { from: 'node' })
    ).resolves.not.toThrow();
  });
});
