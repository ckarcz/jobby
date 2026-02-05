import { describe, it, expect } from 'vitest';
import { csvFormatter } from './csv-formatter.js';

describe('csvFormatter', () => {
  describe('single object', () => {
    it('should output header and data row', async () => {
      const result = await csvFormatter.format({ name: 'John', age: 30 }, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('name,age');
      expect(lines[1]).toBe('John,30');
    });
  });

  describe('array of objects', () => {
    it('should output header and multiple data rows', async () => {
      const data = [
        { name: 'Alice', role: 'Engineer' },
        { name: 'Bob', role: 'Designer' },
      ];
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('name,role');
      expect(lines[1]).toBe('Alice,Engineer');
      expect(lines[2]).toBe('Bob,Designer');
    });
  });

  describe('SearchResponse with results', () => {
    it('should format the results array as CSV', async () => {
      const data = {
        results: [
          { company: 'Acme', position: 'Dev' },
          { company: 'Globex', position: 'PM' },
        ],
        pagination: { start: 0, count: 2 },
      };
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('company,position');
      expect(lines[1]).toBe('Acme,Dev');
      expect(lines[2]).toBe('Globex,PM');
    });
  });

  describe('special characters', () => {
    it('should quote fields containing commas', async () => {
      const result = await csvFormatter.format({ text: 'hello, world' }, {});
      expect(result).toContain('"hello, world"');
    });

    it('should escape double quotes', async () => {
      const result = await csvFormatter.format({ text: 'say "hi"' }, {});
      expect(result).toContain('"say ""hi"""');
    });
  });

  describe('nested objects', () => {
    it('should flatten nested objects with dot notation', async () => {
      const result = await csvFormatter.format({ salary: { min: 100, max: 200 } }, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('salary.min,salary.max');
      expect(lines[1]).toBe('100,200');
    });
  });

  describe('Date values', () => {
    it('should format Date objects as ISO strings', async () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      const result = await csvFormatter.format({ created: date }, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('created');
      expect(lines[1]).toBe('2024-01-15T00:00:00.000Z');
    });
  });

  describe('array values in objects', () => {
    it('should JSON-stringify array values', async () => {
      const result = await csvFormatter.format({ tags: ['a', 'b'] }, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('tags');
      expect(lines[1]).toContain('[');
    });
  });

  describe('empty array of objects', () => {
    it('should return empty string for empty results array', async () => {
      const data = { results: [] };
      const result = await csvFormatter.format(data, {});
      expect(result).toBe('');
    });
  });

  describe('primitive data', () => {
    it('should return string representation of number', async () => {
      const result = await csvFormatter.format(42, {});
      expect(result).toBe('42');
    });

    it('should return string as-is', async () => {
      const result = await csvFormatter.format('hello', {});
      expect(result).toBe('hello');
    });
  });

  describe('null/undefined handling', () => {
    it('should return empty string for null', async () => {
      expect(await csvFormatter.format(null, {})).toBe('');
    });

    it('should return empty string for undefined', async () => {
      expect(await csvFormatter.format(undefined, {})).toBe('');
    });

    it('should output empty field for null values', async () => {
      const result = await csvFormatter.format({ a: null, b: 'ok' }, {});
      const lines = result.split('\n');
      expect(lines[1]).toBe(',ok');
    });

    it('should output empty field for undefined values', async () => {
      const result = await csvFormatter.format({ a: undefined, b: 'ok' }, {});
      const lines = result.split('\n');
      expect(lines[1]).toBe(',ok');
    });
  });

  describe('deeply nested objects', () => {
    it('should flatten multi-level nesting with dot notation', async () => {
      const data = {
        a: {
          b: {
            c: 'deep',
            d: 42,
          },
          e: 'shallow',
        },
      };
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toContain('a.b.c');
      expect(lines[0]).toContain('a.b.d');
      expect(lines[0]).toContain('a.e');
      expect(lines[1]).toContain('deep');
      expect(lines[1]).toContain('42');
      expect(lines[1]).toContain('shallow');
    });
  });

  describe('mixed types in rows', () => {
    it('should handle boolean, number, and string values', async () => {
      const data = { flag: true, count: 7, label: 'test' };
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toBe('flag,count,label');
      expect(lines[1]).toBe('true,7,test');
    });
  });

  describe('results that is NOT an array', () => {
    it('should treat object with non-array results as a single object', async () => {
      const data = { results: 'not-an-array', other: 'field' };
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toContain('results');
      expect(lines[0]).toContain('other');
      expect(lines[1]).toContain('not-an-array');
      expect(lines[1]).toContain('field');
    });
  });

  describe('flattenObject with null and undefined values', () => {
    it('should handle null values as empty strings', async () => {
      const result = await csvFormatter.format({ a: null, b: 'ok' }, {});
      const lines = result.split('\n');
      expect(lines[1]).toBe(',ok');
    });

    it('should handle undefined values as empty strings', async () => {
      const result = await csvFormatter.format({ a: undefined, b: 'ok' }, {});
      const lines = result.split('\n');
      expect(lines[1]).toBe(',ok');
    });
  });

  describe('primitive values', () => {
    it('should return string representation of a number', async () => {
      const result = await csvFormatter.format(42, {});
      expect(result).toBe('42');
    });

    it('should return the string as-is for a primitive string', async () => {
      const result = await csvFormatter.format('hello world', {});
      expect(result).toBe('hello world');
    });
  });

  describe('job details with new fields', () => {
    it('should flatten benefitsInfo and incentiveInfo into dot-notation columns', async () => {
      const data = {
        results: [
          {
            id: '123',
            summary: { position: 'Engineer', company: { name: 'Co' } },
            details: {
              description: 'A job',
              benefitsInfo: 'Benefits Eligible: Yes',
              incentiveInfo: 'Bonus Eligible: Yes',
            },
          },
        ],
      };
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toContain('details.benefitsInfo');
      expect(lines[0]).toContain('details.incentiveInfo');
      expect(lines[1]).toContain('Benefits Eligible: Yes');
      expect(lines[1]).toContain('Bonus Eligible: Yes');
    });

    it('should output empty fields for undefined benefitsInfo and incentiveInfo', async () => {
      const data = {
        results: [
          {
            id: '123',
            details: {
              benefitsInfo: undefined,
              incentiveInfo: undefined,
            },
          },
        ],
      };
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toContain('details.benefitsInfo');
      expect(lines[0]).toContain('details.incentiveInfo');
    });
  });

  describe('inconsistent keys across rows', () => {
    it('should include union of all keys with empty fields for missing keys', async () => {
      const data = [
        { a: '1', b: '2' },
        { b: '3', c: '4' },
      ];
      const result = await csvFormatter.format(data, {});
      const lines = result.split('\n');
      expect(lines[0]).toContain('a');
      expect(lines[0]).toContain('b');
      expect(lines[0]).toContain('c');
      expect(lines.length).toBe(3);
    });
  });
});
