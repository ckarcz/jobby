import { exec, execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const pkgRoot = path.resolve(__dirname, '../..');
const entrypoint = path.join(pkgRoot, 'src/bin.ts');

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Runs the CLI via `npx tsx src/bin.ts` so no build step is required.
 * Uses execFile with an argument array to avoid manual shell quoting.
 * The `shell: true` option is needed for `npx` resolution on Windows.
 */
export function runCli(
  args: string[] = [],
  opts: { env?: Record<string, string>; timeout?: number } = {},
): Promise<CliResult> {
  const env = { ...process.env, ...opts.env };

  return new Promise<CliResult>((resolve) => {
    execFile('npx', ['tsx', entrypoint, ...args], {
      cwd: pkgRoot,
      env,
      encoding: 'utf-8',
      timeout: opts.timeout ?? 15_000,
      shell: true,
    }, (_error, stdout, stderr) => {
      const exitCode = _error ? (_error as { code?: number }).code ?? 1 : 0;
      resolve({
        stdout: (stdout ?? '').toString(),
        stderr: (stderr ?? '').toString(),
        exitCode,
      });
    });
  });
}

/**
 * Runs an arbitrary shell command asynchronously.
 * Used by color.test.ts for running probe scripts.
 */
export function runCommand(
  cmd: string,
  opts: { cwd?: string; env?: Record<string, string> } = {},
): Promise<CliResult> {
  return new Promise<CliResult>((resolve) => {
    exec(cmd, {
      cwd: opts.cwd ?? pkgRoot,
      env: opts.env ? { ...process.env, ...opts.env } : undefined,
      encoding: 'utf-8',
      timeout: 15_000,
    }, (_error, stdout, stderr) => {
      const exitCode = _error ? (_error as { code?: number }).code ?? 1 : 0;
      resolve({
        stdout: (stdout ?? '').toString(),
        stderr: (stderr ?? '').toString(),
        exitCode,
      });
    });
  });
}
