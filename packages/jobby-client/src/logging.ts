import winston from 'winston';
import Transport from 'winston-transport';

/** Valid log level strings (Winston npm levels + silent). */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'verbose' | 'debug';

/** Colors for each log level. */
const LOG_COLORS: Record<string, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'blue',
  verbose: 'white',
  debug: 'gray',
};
winston.addColors(LOG_COLORS);

/** File transport configuration. */
export interface LogFileConfig {
  /**
   * Path to the log file.
   */
  path: string;

  /**
   * Log level for file output.
   * @default Same as the main logging level
   */
  level?: LogLevel | undefined;
}

/** A log entry passed to the onLog callback. */
export interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
}

/** Logging configuration. */
export interface LoggingConfig {
  /**
   * Log level.
   * @default 'warn'
   */
  level?: LogLevel | undefined;

  /**
   * Optional file transport configuration.
   */
  file?: LogFileConfig | undefined;

  /**
   * Optional callback invoked for each log entry.
   * Useful for capturing logs in UIs without exposing Winston internals.
   */
  onLog?: ((entry: LogEntry) => void) | undefined;
}

/** Logger interface used throughout the library. Decoupled from Winston internals. */
export interface Logger {
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  verbose(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
}

/**
 * Creates a configured Winston logger instance.
 *
 * @param config - Optional logging configuration
 * @returns A Winston logger instance
 */
export function createLogger(config?: LoggingConfig): Logger {
  const level = config?.level ?? 'warn';

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level: lvl, message, ...meta }) => {
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp as string} ${lvl}: ${message as string}${metaStr}`;
    }),
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ];

  if (config?.onLog) {
    const onLog = config.onLog;
    // Anonymous class expression is the idiomatic way to create a one-off
    // Winston transport inline without polluting the module scope with a
    // named class that is only used in this single branch.
    const callbackTransport = new class extends Transport {
      override log(info: { level: string; message: string }, callback: () => void): void {
        onLog({ level: info.level, message: info.message, timestamp: new Date() });
        callback();
      }
    }();
    transports.push(callbackTransport);
  }

  if (config?.file) {
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    );

    transports.push(
      new winston.transports.File({
        filename: config.file.path,
        level: config.file.level ?? level,
        format: fileFormat,
      }),
    );
  }

  return winston.createLogger({
    level,
    silent: level === 'silent',
    transports,
  });
}

