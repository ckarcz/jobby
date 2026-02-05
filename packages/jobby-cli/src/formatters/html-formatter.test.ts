import { describe, it, expect } from 'vitest';
import { htmlFormatter } from './html-formatter.js';

describe('htmlFormatter', () => {
  describe('compact output (default)', () => {
    it('should minify HTML by default', async () => {
      const result = await htmlFormatter.format('<div>  <p>  hello  </p>  </div>', {});
      expect(result).toBe('<div><p>hello</p></div>');
    });

    it('should remove HTML comments in compact mode', async () => {
      const result = await htmlFormatter.format('<div><!-- comment --><p>text</p></div>', {});
      expect(result).toBe('<div><p>text</p></div>');
    });

    it('should collapse whitespace in compact mode', async () => {
      const result = await htmlFormatter.format('<p>  hello   world  </p>', {});
      expect(result).toBe('<p>hello world</p>');
    });
  });

  describe('pretty output', () => {
    it('should indent HTML with --pretty', async () => {
      const result = await htmlFormatter.format('<div><p>hello</p></div>', { pretty: true });
      expect(result).toContain('\n');
      expect(result).toContain('<div>');
      expect(result).toContain('<p>');
    });

    it('should use 2-space indentation', async () => {
      const result = await htmlFormatter.format('<div><p>hello</p></div>', { pretty: true });
      expect(result).toContain('  <p>');
    });
  });

  describe('non-string data', () => {
    it('should convert non-string data to string', async () => {
      const result = await htmlFormatter.format(12345, {});
      expect(result).toBe('12345');
    });
  });
});
