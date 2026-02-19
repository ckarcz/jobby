/** Shared test utilities for jobby-client unit tests. */

// eslint-disable-next-line @typescript-eslint/no-empty-function -- intentional noop for silent logging
const noopLog = (): void => {};

interface NoopLogger {
  error: () => void;
  warn: () => void;
  info: () => void;
  http: () => void;
  verbose: () => void;
  debug: () => void;
  silly: () => void;
  level: string;
  silent: boolean;
  transports: never[];
}

/** Creates a noop logger mock matching the winston Logger interface used by createLogger. */
export function createNoopLogger(): NoopLogger {
  return {
    error: noopLog,
    warn: noopLog,
    info: noopLog,
    http: noopLog,
    verbose: noopLog,
    debug: noopLog,
    silly: noopLog,
    level: 'silent',
    silent: true,
    transports: [],
  };
}

/** Factory suitable for use in vi.mock('../logging.js', async () => { ... }). */
export function loggingMockFactory(): { createLogger: () => NoopLogger } {
  return {
    createLogger: (): NoopLogger => createNoopLogger(),
  };
}
