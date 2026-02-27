import { describe, it, expect, vi } from 'vitest';
import type { Logger } from './logging.js';
import { createLogger } from './logging.js';

/** Winston-specific properties on the concrete logger, not part of the public Logger interface. */
interface WinstonLogger extends Logger {
  level: string;
  silent: boolean;
  transports: unknown[];
}

/**
 * Tests for the createLogger factory function that creates configured
 * Winston logger instances with customizable log levels, silent mode,
 * and optional file transport for persistent logging.
 */

describe('createLogger - Winston logger factory and configuration', () => {
  describe('default configuration', () => {
    it('should create a logger with default warn level', () => {
      const logger = createLogger() as WinstonLogger;
      expect(logger.level).toBe('warn');
      expect(logger.silent).toBe(false);
    });
  });

  describe('custom log levels', () => {
    it('should create a logger with specified level', () => {
      const logger = createLogger({ level: 'verbose' }) as WinstonLogger;
      expect(logger.level).toBe('verbose');
      expect(logger.silent).toBe(false);
    });

    it('should create a silent logger when level is silent', () => {
      const logger = createLogger({ level: 'silent' }) as WinstonLogger;
      expect(logger.silent).toBe(true);
    });

    it('should create a logger with info level', () => {
      const logger = createLogger({ level: 'info' }) as WinstonLogger;
      expect(logger.level).toBe('info');
    });

    it('should create a logger with warn level', () => {
      const logger = createLogger({ level: 'warn' }) as WinstonLogger;
      expect(logger.level).toBe('warn');
    });

    it('should create a logger with debug level', () => {
      const logger = createLogger({ level: 'debug' }) as WinstonLogger;
      expect(logger.level).toBe('debug');
    });

    it('should have standard Winston npm log methods', () => {
      const logger = createLogger();
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.verbose).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('transport configuration', () => {
    it('should add file transport when file config is provided', () => {
      const logger = createLogger({
        level: 'info',
        file: { path: 'test.log' },
      }) as WinstonLogger;
      expect(logger.transports).toHaveLength(2);
    });

    it('should only have console transport by default', () => {
      const logger = createLogger({ level: 'info' }) as WinstonLogger;
      expect(logger.transports).toHaveLength(1);
    });

    it('should add onLog callback transport when onLog is provided', () => {
      const logger = createLogger({
        level: 'info',
        onLog: () => {},
      }) as WinstonLogger;
      expect(logger.transports).toHaveLength(2);
    });

    it('should have 3 transports when both file and onLog are provided', () => {
      const logger = createLogger({
        level: 'info',
        file: { path: 'test.log' },
        onLog: () => {},
      }) as WinstonLogger;
      expect(logger.transports).toHaveLength(3);
    });
  });

  describe('onLog callback behavior', () => {
    it('should invoke onLog callback when a message is logged', async () => {
      const entries: { level: string; message: string; timestamp: Date }[] = [];
      const logger = createLogger({
        level: 'info',
        onLog: (entry) => entries.push(entry),
      });

      logger.info('test callback message');

      await vi.waitFor(() => { expect(entries.length).toBeGreaterThan(0); });

      expect(entries[0]!.message).toBe('test callback message');
      expect(entries[0]!.level).toBe('info');
      expect(entries[0]!.timestamp).toBeInstanceOf(Date);
    });

    it('should invoke onLog for multiple log levels', async () => {
      const entries: { level: string; message: string; timestamp: Date }[] = [];
      const logger = createLogger({
        level: 'debug',
        onLog: (entry) => entries.push(entry),
      });

      logger.error('error msg');
      logger.warn('warn msg');
      logger.info('info msg');
      logger.debug('debug msg');

      await vi.waitFor(() => { expect(entries.length).toBe(4); });

      const levels = entries.map(e => e.level);
      expect(levels).toContain('error');
      expect(levels).toContain('warn');
      expect(levels).toContain('info');
      expect(levels).toContain('debug');
    });
  });

  describe('console format output', () => {
    it('should not throw when logging with metadata', () => {
      const logger = createLogger({ level: 'debug' });
      expect(() => logger.info('message with meta', { extra: 'data', count: 42 })).not.toThrow();
    });

    it('should not throw when logging without metadata', () => {
      const logger = createLogger({ level: 'debug' });
      expect(() => logger.info('plain message')).not.toThrow();
    });
  });
});
