import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveConfig, DEFAULT_CLIENT_CONFIG } from './config.js';

/**
 * Tests for configuration resolution including DEFAULT_CLIENT_CONFIG values
 * and the resolveConfig function that merges user-provided options
 * with defaults for timeout, request delay, and logging.
 */

describe('LinkedIn Jobs client configuration - defaults and resolution', () => {
  describe('DEFAULT_CLIENT_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CLIENT_CONFIG.baseUrl).toBe('www.linkedin.com');
      expect(DEFAULT_CLIENT_CONFIG.timeout).toBe(10_000);
      expect(DEFAULT_CLIENT_CONFIG.requestDelay.baseMs).toBe(2_000);
      expect(DEFAULT_CLIENT_CONFIG.requestDelay.jitterMs).toBe(1_000);
    });
  });

  describe('resolveConfig', () => {
    it('should return defaults when no config provided', () => {
      const resolved = resolveConfig();
      expect(resolved.baseUrl).toBe('www.linkedin.com');
      expect(resolved.timeout).toBe(10_000);
      expect(resolved.userAgent).toBeUndefined();
      expect(resolved.signal).toBeUndefined();
      expect(resolved.logger).toBeDefined();
    });

    it('should return defaults when empty config provided', () => {
      const resolved = resolveConfig({});
      expect(resolved.baseUrl).toBe('www.linkedin.com');
      expect(resolved.timeout).toBe(10_000);
    });

    it('should override baseUrl', () => {
      const resolved = resolveConfig({ baseUrl: 'custom.linkedin.com' });
      expect(resolved.baseUrl).toBe('custom.linkedin.com');
    });

    it('should override timeout', () => {
      const resolved = resolveConfig({ timeout: 30000 });
      expect(resolved.timeout).toBe(30000);
    });

    it('should set userAgent string', () => {
      const resolved = resolveConfig({ userAgent: 'Custom UA' });
      expect(resolved.userAgent).toBe('Custom UA');
    });

    it('should set userAgent function', () => {
      const uaFn = () => 'Dynamic UA';
      const resolved = resolveConfig({ userAgent: uaFn });
      expect(resolved.userAgent).toBe(uaFn);
    });

    it('should set signal', () => {
      const controller = new AbortController();
      const resolved = resolveConfig({ signal: controller.signal });
      expect(resolved.signal).toBe(controller.signal);
    });

    it('should create logger with default level when no logging config', () => {
      const resolved = resolveConfig();
      expect(resolved.logger).toBeDefined();
      expect(resolved.logger.level).toBe('warn');
    });

    it('should create logger with custom level from logging config', () => {
      const resolved = resolveConfig({ logging: { level: 'verbose' } });
      expect(resolved.logger.level).toBe('verbose');
    });

    it('should create silent logger when level is silent', () => {
      const resolved = resolveConfig({ logging: { level: 'silent' } });
      expect(resolved.logger.silent).toBe(true);
    });

    describe('environment variable fallbacks', () => {
      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('should use LINKEDIN_JOBS_BASE_URL when no explicit baseUrl', () => {
        vi.stubEnv('LINKEDIN_JOBS_BASE_URL', 'env.linkedin.com');
        const resolved = resolveConfig();
        expect(resolved.baseUrl).toBe('env.linkedin.com');
      });

      it('should use LINKEDIN_JOBS_TIMEOUT when no explicit timeout', () => {
        vi.stubEnv('LINKEDIN_JOBS_TIMEOUT', '30000');
        const resolved = resolveConfig();
        expect(resolved.timeout).toBe(30000);
      });

      it('should prefer explicit config over env vars', () => {
        vi.stubEnv('LINKEDIN_JOBS_BASE_URL', 'env.linkedin.com');
        vi.stubEnv('LINKEDIN_JOBS_TIMEOUT', '30000');
        const resolved = resolveConfig({ baseUrl: 'explicit.linkedin.com', timeout: 5000 });
        expect(resolved.baseUrl).toBe('explicit.linkedin.com');
        expect(resolved.timeout).toBe(5000);
      });

      it('should prefer env vars over defaults', () => {
        vi.stubEnv('LINKEDIN_JOBS_BASE_URL', 'env.linkedin.com');
        vi.stubEnv('LINKEDIN_JOBS_TIMEOUT', '15000');
        const resolved = resolveConfig({});
        expect(resolved.baseUrl).toBe('env.linkedin.com');
        expect(resolved.timeout).toBe(15000);
      });

      it('should fall back to defaults when env vars are not set', () => {
        const resolved = resolveConfig();
        expect(resolved.baseUrl).toBe('www.linkedin.com');
        expect(resolved.timeout).toBe(10_000);
      });

      it('should fall back to default when LINKEDIN_JOBS_TIMEOUT is non-numeric', () => {
        vi.stubEnv('LINKEDIN_JOBS_TIMEOUT', 'not-a-number');
        const resolved = resolveConfig();
        expect(resolved.timeout).toBe(DEFAULT_CLIENT_CONFIG.timeout);
      });
    });

    describe('requestDelay', () => {
      it('should use defaults when requestDelay not provided', () => {
        const resolved = resolveConfig({});
        expect(resolved.requestDelay.baseMs).toBe(2_000);
        expect(resolved.requestDelay.jitterMs).toBe(1_000);
      });

      it('should override baseMs', () => {
        const resolved = resolveConfig({ requestDelay: { baseMs: 5000 } });
        expect(resolved.requestDelay.baseMs).toBe(5000);
        expect(resolved.requestDelay.jitterMs).toBe(1_000);
      });

      it('should override jitterMs', () => {
        const resolved = resolveConfig({ requestDelay: { jitterMs: 500 } });
        expect(resolved.requestDelay.jitterMs).toBe(500);
      });

      it('should override all request delay values', () => {
        const resolved = resolveConfig({
          requestDelay: {
            baseMs: 3000,
            jitterMs: 200,
          },
        });
        expect(resolved.requestDelay.baseMs).toBe(3000);
        expect(resolved.requestDelay.jitterMs).toBe(200);
      });
    });

    describe('environment variable edge cases', () => {
      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('should parse LINKEDIN_JOBS_TIMEOUT "0" as 0', () => {
        vi.stubEnv('LINKEDIN_JOBS_TIMEOUT', '0');
        const resolved = resolveConfig();
        expect(resolved.timeout).toBe(0);
      });

      it('should fall back to default when LINKEDIN_JOBS_TIMEOUT is empty string', () => {
        vi.stubEnv('LINKEDIN_JOBS_TIMEOUT', '');
        const resolved = resolveConfig();
        expect(resolved.timeout).toBe(DEFAULT_CLIENT_CONFIG.timeout);
      });
    });

    describe('requestDelay edge cases', () => {
      it('should allow zero baseMs', () => {
        const resolved = resolveConfig({ requestDelay: { baseMs: 0 } });
        expect(resolved.requestDelay.baseMs).toBe(0);
      });

      it('should allow zero jitterMs', () => {
        const resolved = resolveConfig({ requestDelay: { jitterMs: 0 } });
        expect(resolved.requestDelay.jitterMs).toBe(0);
      });
    });
  });
});
