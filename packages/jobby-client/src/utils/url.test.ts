import { describe, it, expect } from 'vitest';
import { urlWithNoQueryParams, extractJobIdFromUrl, buildCanonicalJobUrl, extractCompanySlug } from './url.js';

/**
 * Tests for the urlWithNoQueryParams utility that strips query parameters
 * from URLs while preserving path segments and fragments.
 */

describe('urlWithNoQueryParams - query parameter removal from URLs', () => {
  describe('valid URL inputs', () => {
    it('should remove query parameters from URL', () => {
      const url = 'https://example.com/path?foo=bar&baz=qux';
      expect(urlWithNoQueryParams(url)).toBe('https://example.com/path');
    });

    it('should return URL unchanged if no query parameters', () => {
      const url = 'https://example.com/path';
      expect(urlWithNoQueryParams(url)).toBe('https://example.com/path');
    });

    it('should handle URLs with trailing slash', () => {
      const url = 'https://example.com/path/?query=1';
      expect(urlWithNoQueryParams(url)).toBe('https://example.com/path/');
    });

    it('should handle URLs with fragments', () => {
      const url = 'https://example.com/path?query=1#section';
      expect(urlWithNoQueryParams(url)).toBe('https://example.com/path#section');
    });

    it('should handle complex URLs with multiple path segments', () => {
      const url = 'https://www.linkedin.com/company/example-corp/life/?viewAsMember=true';
      expect(urlWithNoQueryParams(url)).toBe('https://www.linkedin.com/company/example-corp/life/');
    });
  });

  describe('null/undefined/empty inputs', () => {
    it('should return undefined for null input', () => {
      expect(urlWithNoQueryParams(null)).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(urlWithNoQueryParams(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(urlWithNoQueryParams('')).toBeUndefined();
    });
  });

  describe('relative and invalid URL inputs', () => {
    it('should resolve relative LinkedIn URL with base URL', () => {
      expect(urlWithNoQueryParams('/jobs/view/123?trk=x')).toBe('https://www.linkedin.com/jobs/view/123');
    });

    it('should resolve relative company URL with base URL', () => {
      expect(urlWithNoQueryParams('/company/test-co?trk=tracking')).toBe('https://www.linkedin.com/company/test-co');
    });

    it('should return undefined for completely invalid URL', () => {
      expect(urlWithNoQueryParams('http://[invalid')).toBeUndefined();
    });
  });
});

describe('extractJobIdFromUrl - extract numeric job ID from LinkedIn URLs', () => {
  it('should extract ID from URL with slug', () => {
    expect(extractJobIdFromUrl('https://www.linkedin.com/jobs/view/programming-development-sap-abap-at-planit-group-llc-4368607271')).toBe('4368607271');
  });

  it('should extract ID from plain numeric URL', () => {
    expect(extractJobIdFromUrl('https://www.linkedin.com/jobs/view/123')).toBe('123');
  });

  it('should extract ID from URL with trailing slash', () => {
    expect(extractJobIdFromUrl('https://www.linkedin.com/jobs/view/some-job-456/')).toBe('456');
  });

  it('should return undefined for null input', () => {
    expect(extractJobIdFromUrl(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(extractJobIdFromUrl(undefined)).toBeUndefined();
  });

  it('should return undefined for URL with no numeric ID', () => {
    expect(extractJobIdFromUrl('https://www.linkedin.com/jobs/view/no-id-here')).toBeUndefined();
  });
});

describe('buildCanonicalJobUrl - build canonical job URL from ID and original URL', () => {
  it('should build canonical URL preserving original host', () => {
    expect(buildCanonicalJobUrl('4368607271', 'https://www.linkedin.com/jobs/view/some-slug-4368607271')).toBe('https://www.linkedin.com/jobs/view/4368607271');
  });

  it('should preserve non-www host', () => {
    expect(buildCanonicalJobUrl('123', 'https://linkedin.com/jobs/view/123')).toBe('https://linkedin.com/jobs/view/123');
  });

  it('should return undefined for null jobId', () => {
    expect(buildCanonicalJobUrl(null, 'https://www.linkedin.com/jobs/view/123')).toBeUndefined();
  });

  it('should return undefined for null originalUrl', () => {
    expect(buildCanonicalJobUrl('123', null)).toBeUndefined();
  });

  it('should return undefined for invalid originalUrl', () => {
    expect(buildCanonicalJobUrl('123', 'not-a-url')).toBeUndefined();
  });
});

describe('urlWithNoQueryParams - additional edge cases', () => {
  it('should preserve fragment when removing query params', () => {
    expect(urlWithNoQueryParams('https://example.com/path#section')).toBe('https://example.com/path#section');
  });

  it('should handle URL with empty query string', () => {
    expect(urlWithNoQueryParams('https://example.com/path?')).toBe('https://example.com/path');
  });

  it('should handle URL with only fragment and query', () => {
    expect(urlWithNoQueryParams('https://example.com?foo=bar#section')).toBe('https://example.com/#section');
  });
});

describe('extractJobIdFromUrl - additional edge cases', () => {
  it('should return undefined for empty string', () => {
    expect(extractJobIdFromUrl('')).toBeUndefined();
  });

  it('should extract last numeric segment from path with multiple numbers', () => {
    expect(extractJobIdFromUrl('https://linkedin.com/jobs/view/12345')).toBe('12345');
  });

  it('should return undefined for URL with trailing whitespace', () => {
    expect(extractJobIdFromUrl('https://linkedin.com/jobs/view/123  ')).toBeUndefined();
  });

  it('should return undefined for bare number without leading slash', () => {
    expect(extractJobIdFromUrl('42')).toBeUndefined();
  });

  it('should return undefined for string ending with digits but no leading slash', () => {
    expect(extractJobIdFromUrl('page42')).toBeUndefined();
  });
});

describe('extractCompanySlug - extract company slug from LinkedIn company URLs', () => {
  it('should extract slug from standard URL', () => {
    expect(extractCompanySlug('https://linkedin.com/company/intuit')).toBe('intuit');
  });

  it('should handle trailing slash', () => {
    expect(extractCompanySlug('https://linkedin.com/company/intuit/')).toBe('intuit');
  });

  it('should handle URL with query params already stripped', () => {
    expect(extractCompanySlug('https://linkedin.com/company/test-co')).toBe('test-co');
  });

  it('should return undefined for null input', () => {
    expect(extractCompanySlug(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(extractCompanySlug(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(extractCompanySlug('')).toBeUndefined();
  });

  it('should return undefined for non-company URLs', () => {
    expect(extractCompanySlug('https://linkedin.com/jobs/view/123')).toBeUndefined();
  });

  it('should handle URL with subpath after slug', () => {
    expect(extractCompanySlug('https://linkedin.com/company/intuit/life')).toBe('intuit');
  });

  it('should handle URL with query params', () => {
    expect(extractCompanySlug('https://linkedin.com/company/intuit?trk=tracking')).toBe('intuit');
  });

  it('should handle URL with hash fragment', () => {
    expect(extractCompanySlug('https://linkedin.com/company/intuit#section')).toBe('intuit');
  });
});

describe('buildCanonicalJobUrl - additional edge cases', () => {
  it('should return undefined for empty string jobId', () => {
    expect(buildCanonicalJobUrl('', 'https://linkedin.com/jobs/view/123')).toBeUndefined();
  });

  it('should return undefined for empty string originalUrl', () => {
    expect(buildCanonicalJobUrl('123', '')).toBeUndefined();
  });

  it('should preserve http protocol', () => {
    expect(buildCanonicalJobUrl('123', 'http://linkedin.com/jobs/view/old-slug-123')).toBe('http://linkedin.com/jobs/view/123');
  });
});
