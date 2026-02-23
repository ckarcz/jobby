/**
 * Removes query parameters from a URL.
 * @param urlString - The URL string to strip query parameters from.
 * @returns The URL without query parameters, or undefined if the input is nullish or invalid.
 */
export function urlWithNoQueryParams(urlString: string | null | undefined): string | undefined {
  if (!urlString) {
    return undefined;
  }
  try {
    const url = new URL(urlString);
    url.search = '';
    return url.href;
  } catch {
    // Try as a relative URL with LinkedIn as base
    try {
      const url = new URL(urlString, 'https://www.linkedin.com');
      url.search = '';
      return url.href;
    } catch {
      return undefined;
    }
  }
}

/**
 * Extracts the numeric job ID from a LinkedIn job URL.
 * The URL must contain `/view/` followed by an optional slug and a numeric ID.
 * Example: "https://www.linkedin.com/jobs/view/software-engineer-at-company-4368607271" → "4368607271"
 * @param jobUrl - The LinkedIn job URL to extract the ID from.
 * @returns The numeric job ID string, or undefined if the input is nullish or no ID is found.
 */
export function extractJobIdFromUrl(jobUrl: string | null | undefined): string | undefined {
  if (!jobUrl) {
    return undefined;
  }
  const match = /\/view\/.*?(\d+)\/?$/.exec(jobUrl);
  return match?.[1] ?? undefined;
}

/**
 * Builds a canonical LinkedIn job URL from a job ID, preserving the original URL's host.
 * Example: buildCanonicalJobUrl("4368607271", "https://www.linkedin.com/jobs/view/some-title-4368607271")
 *   → "https://www.linkedin.com/jobs/view/4368607271"
 * @param jobId - The numeric job ID.
 * @param originalUrl - The original job URL, used to derive the protocol and host.
 * @returns The canonical job URL, or undefined if either input is nullish or the URL is invalid.
 */
export function buildCanonicalJobUrl(jobId: string | null | undefined, originalUrl: string | null | undefined): string | undefined {
  if (!jobId || !originalUrl) {
    return undefined;
  }
  try {
    const url = new URL(originalUrl);
    return `${url.protocol}//${url.host}/jobs/view/${jobId}`;
  } catch {
    return undefined;
  }
}

/**
 * Extracts the company slug from a LinkedIn company page URL.
 * Example: "https://linkedin.com/company/intuit" → "intuit"
 * @param companyPageUrl - The LinkedIn company page URL to extract the slug from.
 * @returns The company slug string, or undefined if the input is nullish or no slug is found.
 */
export function extractCompanySlug(companyPageUrl: string | null | undefined): string | undefined {
  if (!companyPageUrl) {
    return undefined;
  }
  const match = /\/company\/([^/?#]+)/.exec(companyPageUrl);
  return match?.[1] ?? undefined;
}
