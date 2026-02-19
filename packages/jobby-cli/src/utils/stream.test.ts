import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { readFromStream } from './stream.js';

/**
 * Tests for the readFromStream utility that reads piped stdin data
 * with TTY detection, timeout handling, and whitespace trimming.
 */

describe('readFromStream - stdin stream reading for piped input', () => {
  describe('TTY detection', () => {
    it('should return undefined when stream is a TTY (interactive terminal)', async () => {
      const stream = new Readable({ read() { } });
      const result = await readFromStream(stream, true);
      expect(result).toBeUndefined();
    });

    it('should attempt to read when isTTY is undefined', async () => {
      const stream = new Readable({ read() { } });
      const result = await readFromStream(stream, undefined, 50);
      expect(result).toBeUndefined();
    });
  });

  describe('piped data reading', () => {
    it('should read data from a non-TTY piped stream', async () => {
      const stream = new Readable({
        read() {
          this.push('hello world');
          this.push(null);
        },
      });
      const result = await readFromStream(stream, false);
      expect(result).toBe('hello world');
    });

    it('should trim whitespace from stream data', async () => {
      const stream = new Readable({
        read() {
          this.push('  TypeScript\n  ');
          this.push(null);
        },
      });
      const result = await readFromStream(stream, false);
      expect(result).toBe('TypeScript');
    });

    it('should return undefined for empty stream', async () => {
      const stream = new Readable({
        read() {
          this.push(null);
        },
      });
      const result = await readFromStream(stream, false);
      expect(result).toBeUndefined();
    });
  });

  describe('whitespace-only and multi-chunk streams', () => {
    it('should return undefined for stream that emits only whitespace', async () => {
      const stream = new Readable({
        read() {
          this.push('   \n\t  ');
          this.push(null);
        },
      });
      const result = await readFromStream(stream, false);
      expect(result).toBeUndefined();
    });

    it('should handle stream that emits multiple data chunks before end', async () => {
      const stream = new Readable({
        read() {
          this.push('hello ');
          this.push('world');
          this.push(null);
        },
      });
      const result = await readFromStream(stream, false);
      expect(result).toBe('hello world');
    });
  });

  describe('error and timeout handling', () => {
    it('should return undefined on stream error', async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error('stream error'));
        },
      });
      const result = await readFromStream(stream, false);
      expect(result).toBeUndefined();
    });

    it('should return undefined when stream times out', async () => {
      const stream = new Readable({
        read() {
          // Never sends data or ends
        },
      });
      const result = await readFromStream(stream, false, 50);
      expect(result).toBeUndefined();
    });
  });

  describe('listener cleanup', () => {
    it('should remove all listeners after timeout', async () => {
      const stream = new Readable({
        read() {
          // Never sends data or ends — will trigger timeout
        },
      });
      const errorListenersBefore = stream.listenerCount('error');
      const dataListenersBefore = stream.listenerCount('data');
      const endListenersBefore = stream.listenerCount('end');

      await readFromStream(stream, false, 50);

      expect(stream.listenerCount('error')).toBe(errorListenersBefore);
      expect(stream.listenerCount('data')).toBe(dataListenersBefore);
      expect(stream.listenerCount('end')).toBe(endListenersBefore);
    });

    it('should remove all listeners after stream ends', async () => {
      const stream = new Readable({
        read() {
          this.push('data');
          this.push(null);
        },
      });
      const errorListenersBefore = stream.listenerCount('error');

      const result = await readFromStream(stream, false);

      expect(result).toBe('data');
      expect(stream.listenerCount('error')).toBe(errorListenersBefore);
    });

    it('should remove all listeners after stream error', async () => {
      const stream = new Readable({
        read() {
          this.destroy(new Error('test error'));
        },
      });
      const dataListenersBefore = stream.listenerCount('data');
      const endListenersBefore = stream.listenerCount('end');

      await readFromStream(stream, false);

      expect(stream.listenerCount('data')).toBe(dataListenersBefore);
      expect(stream.listenerCount('end')).toBe(endListenersBefore);
    });
  });
});
