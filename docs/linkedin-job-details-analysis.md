# LinkedIn Job Listing Detail Page: Extractable Data Fields Analysis

## Testing Overview

### Testing Context

This LinkedIn job listing detail page analysis was last performed by **Claude** on `2026-02-13T12:00:00Z`.

Every time the analysis outlined in this document is run again:
- This timestamp information above must be updated every time the analysis is performed.
- This document must be updated with all available data fields from LinkedIn job listing detail pages, including JSON-LD structured data, DOM-scraped fields, meta tags, and any other extractable data. Also include any updates or changes to the page structure.

### What Was Tested

LinkedIn's public job listing detail pages (at `linkedin.com/jobs/view/{job-id}`) contain rich structured and unstructured data about individual job postings. When a user or bot fetches a job detail page, LinkedIn returns a full HTML page containing:

1. **JSON-LD structured data** (`<script type="application/ld+json">`) using the [schema.org JobPosting](https://schema.org/JobPosting) vocabulary
2. **HTML DOM elements** with semantic CSS classes containing job details
3. **Meta tags** (Open Graph, Twitter Cards, LinkedIn-specific) for social sharing and SEO
4. **Canonical links** and other `<head>` elements

The analysis covers the public/guest (unauthenticated) version of these pages at:

```
https://www.linkedin.com/jobs/view/{job-id}
```

### Why It Was Tested

The goal was to determine **every single piece of extractable data** from a LinkedIn job listing detail page, map each field to its source (JSON-LD, DOM, meta tags), and compare against the fields currently extracted by the `jobby-client` package's `parseJsonLdToJobDetailsData` and `scrapeJobDetailsDataFromDom` functions. This allows identification of extraction gaps and opportunities for richer data capture.

### Testing Methodology

1. **Code analysis**: Read the `jobby-client` source code (`job-details-query.ts`, `responses.ts`) to understand the current `ParsedJobDetailsData` interface, `JsonLdJobPostingSchema` Zod schema, and all DOM scraping selectors.

2. **Live page fetching**: Fetched 3 real LinkedIn job listing pages to observe actual data present:
   - Job `4361391458` - Manager, Software Engineering at LinkedIn (Mountain View, CA) - with salary data
   - Job `4371789856` - Full Stack Engineer II - .Net/Azure at McDonald's (Chicago, IL) - with salary data
   - Job `4368816227` - Software Engineer (C#) at Path Robotics (Columbus, OH) - without salary data

3. **Schema.org reference**: Cross-referenced with the [schema.org JobPosting](https://schema.org/JobPosting) specification to identify all possible JSON-LD fields LinkedIn could include.

4. **Test fixture analysis**: Examined the unit test mock HTML fixtures in `job-details-query.test.ts` to understand the expected HTML structure and all tested selectors.

### How to Re-Run This Analysis

1. Fetch several job listing pages using:
   ```
   https://www.linkedin.com/jobs/view/{job-id}
   ```
   Use the `executeJobDetailsQueryRawHtmlById` function from `jobby-client` to get raw HTML, or fetch directly with an HTTP client.

2. For each page, extract and examine:
   - All `<script type="application/ld+json">` blocks (parse as JSON)
   - All `<meta>` tags (especially `og:*`, `twitter:*`, `lnkd:*`)
   - The `<link rel="canonical">` element
   - All DOM elements with the CSS classes documented below

3. Compare the observed fields against this document and update accordingly.

4. Compare against the current `jobby-client` extraction code in `packages/jobby-client/src/queries/job-details-query.ts` and `packages/jobby-client/src/types/responses.ts`.

---

## JSON-LD Data Fields

LinkedIn embeds a `<script type="application/ld+json">` block in the `<head>` of each job listing page. This block contains a JSON object conforming to the [schema.org JobPosting](https://schema.org/JobPosting) type.

The `jobby-client` extracts this using the `extractJsonLd` function, which finds all `<script type="application/ld+json">` elements, parses each as JSON, and validates against the `JsonLdJobPostingSchema` Zod schema (defined in `responses.ts`). If multiple valid JobPosting blocks exist, the **last** one is used.

### JSON-LD Fields Observed in LinkedIn Pages

| # | Field | JSON Path | Description | Example Value | Extracted by Current Code? |
|---|---|---|---|---|---|
| 1 | Schema Type | `@type` | Always `"JobPosting"` | `"JobPosting"` | Yes (used for validation) |
| 2 | Schema Context | `@context` | Schema.org context URL | `"https://schema.org"` | No (not needed, but present) |
| 3 | Title | `title` | The job position title | `"Manager, Software Engineering"` | Yes |
| 4 | Description | `description` | Full job description as HTML string | `"We are looking for a <strong>talented</strong>..."` | Yes (converted to markdown) |
| 5 | Date Posted | `datePosted` | ISO date when job was posted | `"2024-01-15"` | Yes |
| 6 | Valid Through | `validThrough` | ISO date when listing expires | `"2024-03-15"` | Yes |
| 7 | Employment Type | `employmentType` | Schema.org employment type code | `"FULL_TIME"` | Yes (mapped to display string) |
| 8 | Hiring Organization Name | `hiringOrganization.name` | Company name | `"LinkedIn"` | Yes |
| 9 | Hiring Organization URL | `hiringOrganization.sameAs` | Company LinkedIn page URL | `"https://linkedin.com/company/linkedin?trk=..."` | Yes (query params stripped) |
| 10 | Job Location Locality | `jobLocation.address.addressLocality` | City name | `"Mountain View"` | Yes |
| 11 | Job Location Region | `jobLocation.address.addressRegion` | State/region code | `"CA"` | Yes |
| 12 | Job Location Country | `jobLocation.address.addressCountry` | Country code (ISO) | `"US"` | Yes (excluded from display if "US") |
| 13 | Job Location Type | `jobLocationType` | Remote work indicator | `"TELECOMMUTE"` | Yes (mapped to "Remote") |
| 14 | Base Salary Currency | `baseSalary.currency` | ISO 4217 currency code | `"USD"` | Yes |
| 15 | Base Salary Min Value | `baseSalary.value.minValue` | Minimum salary amount | `152000` | Yes |
| 16 | Base Salary Max Value | `baseSalary.value.maxValue` | Maximum salary amount | `248000` | Yes |
| 17 | Base Salary Unit Text | `baseSalary.value.unitText` | Pay period | `"YEAR"` | Yes |
| 18 | Experience Requirements | `experienceRequirements.monthsOfExperience` | Required months of experience | `60` | Yes (formatted as "5 years") |
| 19 | Education Requirements | `educationRequirements.credentialCategory` | Required education level | `"bachelor degree"` | Yes |
| 20 | Industry | `industry` | Industry name(s) | `"Technology, Information and Internet"` | Yes |
| 21 | Identifier | `identifier` | Job posting identifier object | `{"@type": "PropertyValue", "name": "LinkedIn", "value": "4361391458"}` | Yes (Zod schema captures `name` and `value`) |
| 22 | Hiring Organization Logo | `hiringOrganization.logo` | Company logo URL from JSON-LD | `"https://media.licdn.com/dms/image/..."` | Yes (priority over DOM logo) |
| 23 | Hiring Organization Type | `hiringOrganization.@type` | Organization type | `"Organization"` | **No** - not extracted |
| 24 | Job Location Type (@type) | `jobLocation.@type` | Place type identifier | `"Place"` | **No** - not needed |
| 25 | Address Type (@type) | `jobLocation.address.@type` | Postal address type | `"PostalAddress"` | **No** - not needed |
| 26 | Base Salary Type (@type) | `baseSalary.@type` | Monetary amount type | `"MonetaryAmount"` | **No** - not needed |
| 27 | Base Salary Value Type (@type) | `baseSalary.value.@type` | Quantitative value type | `"QuantitativeValue"` | **No** - not needed |

### JSON-LD Fields from Schema.org Spec Not Typically Observed on LinkedIn

The following schema.org JobPosting properties are defined in the specification but have **not** been observed in LinkedIn's JSON-LD output. They are listed here for completeness and future monitoring:

| Field | JSON Path | Schema.org Description | Observed? |
|---|---|---|---|
| `applicantLocationRequirements` | `applicantLocationRequirements` | Where applicants may apply from (for remote roles) | Not observed |
| `employmentUnit` | `employmentUnit` | Department or facility of the position | Not observed |
| `workHours` | `workHours` | Typical working hours | Not observed |
| `jobStartDate` | `jobStartDate` | When a successful applicant would start | Not observed |
| `jobImmediateStart` | `jobImmediateStart` | Whether position is available for immediate start | Not observed |
| `totalJobOpenings` | `totalJobOpenings` | Number of open positions | Not observed |
| `salaryCurrency` | `salaryCurrency` | Deprecated in favor of baseSalary | Not observed |
| `estimatedSalary` | `estimatedSalary` | Salary estimate from external sources | Not observed |
| `jobBenefits` | `jobBenefits` | Description of job benefits | Not observed |
| `incentiveCompensation` | `incentiveCompensation` | Bonus/commission description | Not observed |
| `experienceInPlaceOfEducation` | `experienceInPlaceOfEducation` | Whether experience can replace education | Not observed |
| `qualifications` | `qualifications` | Specific qualifications required | Not observed |
| `skills` | `skills` | Required or desired skills | Not observed |
| `responsibilities` | `responsibilities` | Job responsibilities | Not observed |
| `eligibilityToWorkRequirement` | `eligibilityToWorkRequirement` | Work authorization requirements | Not observed |
| `occupationalCategory` | `occupationalCategory` | Job classification code (O*NET-SOC, ISCO-08) | Not observed |
| `physicalRequirement` | `physicalRequirement` | Physical capability requirements | Not observed |
| `sensoryRequirement` | `sensoryRequirement` | Sensory ability requirements | Not observed |
| `securityClearanceRequirement` | `securityClearanceRequirement` | Security clearance requirements | Not observed |
| `specialCommitments` | `specialCommitments` | Programs like VeteranCommit | Not observed |
| `applicationContact` | `applicationContact` | Contact details for inquiries | Not observed |
| `directApply` | `directApply` | Whether URL allows direct application | Not observed |
| `relevantOccupation` | `relevantOccupation` | Related occupation reference | Not observed |

### JSON-LD TypeScript Extraction Code

The current Zod schema used for validation:

```typescript
// From packages/jobby-client/src/types/responses.ts
export const JsonLdJobPostingSchema = z.object({
  '@type': z.literal('JobPosting'),
  title: z.string().optional(),
  description: z.string().optional(),
  datePosted: z.string().optional(),
  validThrough: z.string().optional(),
  employmentType: z.string().optional(),
  hiringOrganization: z.object({
    name: z.string().optional(),
    sameAs: z.string().optional(),
    logo: z.string().optional(),
  }).optional(),
  jobLocation: z.object({
    address: z.object({
      addressLocality: z.string().optional(),
      addressRegion: z.string().optional(),
      addressCountry: z.string().optional(),
    }).optional(),
  }).optional(),
  jobLocationType: z.string().optional(),
  baseSalary: z.object({
    currency: z.string().optional(),
    value: z.object({
      minValue: z.number().optional(),
      maxValue: z.number().optional(),
      unitText: z.string().optional(),
    }).optional(),
  }).optional(),
  experienceRequirements: z.object({
    monthsOfExperience: z.number().optional(),
  }).optional(),
  educationRequirements: z.object({
    credentialCategory: z.string().optional(),
  }).optional(),
  industry: z.string().optional(),
  identifier: z.object({
    name: z.string().optional(),
    value: z.string().optional(),
  }).optional(),
}).loose();
```

> **Note:** The `.loose()` modifier allows additional unknown fields to pass validation (e.g. `@context`, `hiringOrganization.@type`). All job-relevant fields are now explicitly captured in the schema.

---

## DOM-Scraped Data Fields

The `scrapeJobDetailsDataFromDom` function in `job-details-query.ts` extracts data from the HTML DOM using CSS selectors. Each field is extracted by a dedicated helper function.

### DOM Fields Currently Extracted

| # | Field | CSS Selector / Method | Description | Example Value | Extracted? |
|---|---|---|---|---|---|
| 1 | Job URL | `link[rel="canonical"]` / `meta[property="og:url"]` / `meta[property="lnkd:url"]` | Canonical job page URL (fallback chain) | `"https://www.linkedin.com/jobs/view/manager-software-engineering-at-linkedin-4361391458"` | Yes |
| 2 | Title | `.top-card-layout__title` | Job title from top card heading | `"Manager, Software Engineering"` | Yes |
| 3 | Company Name | `.topcard__org-name-link` (text) | Company name from top card link text | `"LinkedIn"` | Yes |
| 4 | Company Page URL | `.topcard__org-name-link` (href) | Company LinkedIn page URL (query params stripped) | `"https://www.linkedin.com/company/linkedin"` | Yes |
| 5 | Company Logo URL | `.top-card-layout__entity-info-container` section > `img.artdeco-entity-image` (data-delayed-url or src) | Company logo image URL | `"https://media.licdn.com/dms/image/v2/.../company-logo_100_100/..."` | Yes |
| 6 | Location | `.topcard__flavor--bullet` (first) | Location text from top card | `"Mountain View, CA"` | Yes |
| 7 | Workplace Type | `meta[property="og:title"]` (regex matching) | Extracted from og:title pattern: "(Remote)", "(Hybrid)", "(On-site)" | `"Remote"` / `"Hybrid"` / `"On-site"` | Yes |
| 8 | Employment Type | `.description__job-criteria-item` where header = "Employment type" | Employment type from criteria list | `"Full-time"` | Yes |
| 9 | Seniority Level | `.description__job-criteria-item` where header = "Seniority level" | Seniority from criteria list | `"Mid-Senior level"` | Yes |
| 10 | Description | `.show-more-less-html__markup` (inner HTML, converted to markdown) | Full job description | *(HTML content converted to markdown)* | Yes |
| 11 | Salary (Main Rail) | `.salary-main-rail__compensation-value` (text, parsed) | Salary text from main salary section | `"$152,000.00/yr - $248,000.00/yr"` | Yes |
| 12 | Salary (Compensation) | `.compensation__salary` (text, parsed, fallback) | Salary text from alternate compensation section | `"$104,482.00/yr - $130,602.00/yr"` | Yes (fallback) |
| 13 | Posted Date (ISO) | `time.posted-time-ago__text` (datetime attribute) | ISO date from time element | `"2026-02-06"` | Yes |
| 14 | Posted Time Ago | `.posted-time-ago__text` (text) | Relative time text | `"1 week ago"` | Yes |
| 15 | Applicant Count | `.num-applicants__caption` (text) | Number of applicants text | `"Over 200 applicants"` / `"83 applicants"` | Yes |
| 16 | Industry | `.description__job-criteria-item` where header = "Industries" | Industry from criteria list | `"Technology, Information and Internet"` | Yes |
| 17 | Job Function | `.description__job-criteria-item` where header = "Job function" | Job function from criteria list | `"Engineering"` / `"Information Technology"` | Yes |
| 18 | Apply Button URL | `.apply-button` (href), `.top-card-layout__cta-container a` (href), `.apply-button--top-card` (href) | Direct apply URL (fallback chain) | `"https://linkedin.com/jobs/view/123/apply"` | Yes |
| 19 | Apply Button Text | `.apply-button` (text), `.top-card-layout__cta-container a` (text), `.apply-button--top-card` (text) | Apply button label (fallback chain) | `"Easy Apply"` / `"Apply"` | Yes |
| 20 | Short Description | `meta[property="og:description"]` (content) | Short summary from og:description meta tag | `"LinkedIn is hiring..."` | Yes |
| 21 | Sharing Image URL | `meta[property="og:image"]` (content) | Sharing/social image from og:image meta tag | `"https://media.licdn.com/..."` | Yes |
| 22 | Company Slug | Derived from company page URL via regex `/company/([^/?#]+)/` | URL-friendly company identifier | `"linkedin"` | Yes |
| 23 | Benefits Info | `.job-details-benefits__text`, `.benefits__description`, `.salary-main-rail__benefits-value` (fallback chain) | Benefits and perks information | `"Benefits Eligible: Yes"` | Yes |
| 24 | Incentive Info | `.compensation__incentive-value`, `.compensation__bonus-value`, `.salary-main-rail__incentive-value` (fallback chain) | Bonus/incentive compensation information | `"Bonus Eligible: Yes"` | Yes |

### DOM Fields NOT Currently Extracted (Gaps)

The following fields are present in the job listing page DOM but are **not** currently extracted by `scrapeJobDetailsDataFromDom`:

| # | Field | CSS Selector / Method | Description | Example Value | Priority |
|---|---|---|---|---|---|
| 1 | Similar Jobs | `.similar-jobs` section | List of related/similar job postings | Multiple job cards | Low |
| 2 | People Also Viewed | `.people-also-viewed` or similar section | Complementary job listings | Multiple job cards | Low |
| 3 | Referral Text | Referral banner section | Referral increase messaging | `"Referrals increase your chances of interviewing at LinkedIn by 2x"` | Low |
| 4 | Page Title | `<title>` element | Full page title | `"Manager, Software Engineering - LinkedIn | LinkedIn"` | Low |

### Job Criteria Extraction

The criteria extraction uses a generic `extractCriteriaValue` function that searches `.description__job-criteria-item` elements by matching the `.description__job-criteria-subheader` text:

```typescript
// From packages/jobby-client/src/queries/job-details-query.ts
function extractCriteriaValue($, label: string): string | undefined {
  let value: string | undefined;
  $('.description__job-criteria-item').each((_index, element) => {
    const header = $(element).find('.description__job-criteria-subheader').text().trim();
    if (header.toLowerCase() === label.toLowerCase()) {
      value = $(element).find('.description__job-criteria-text').text().trim() || undefined;
    }
  });
  return value;
}
```

#### Known Criteria Labels

| Label Searched | Example Value | Observed in Real Pages? |
|---|---|---|
| `"Seniority level"` | `"Mid-Senior level"`, `"Entry level"` | Yes |
| `"Employment type"` | `"Full-time"`, `"Contract"` | Yes |
| `"Job function"` | `"Engineering"`, `"Information Technology"`, `"Sales"` | Yes |
| `"Industries"` | `"Technology, Information and Internet"`, `"Restaurants"`, `"Automation Machinery Manufacturing"` | Yes |

---

## Meta Tags / Other Structured Data

### Meta Tags Observed

LinkedIn job listing pages include standard meta tags in the `<head>` section. These are primarily used for social sharing and SEO.

| # | Meta Property/Name | Description | Example Value | Extracted? |
|---|---|---|---|---|
| 1 | `og:title` | Open Graph title for social sharing | `"LinkedIn hiring Manager, Software Engineering in Mountain View, CA \| LinkedIn"` | Partially (regex for workplace type only) |
| 2 | `og:description` | Open Graph description | Short description of the job | Yes (as `shortDescription`) |
| 3 | `og:url` | Open Graph canonical URL | `"https://www.linkedin.com/jobs/view/manager-software-engineering-at-linkedin-4361391458"` | Yes (fallback for job URL) |
| 4 | `og:image` | Open Graph sharing image | Company logo or LinkedIn default | Yes (as `sharingImageUrl`) |
| 5 | `og:type` | Open Graph content type | `"website"` or similar | **No** |
| 6 | `og:site_name` | Open Graph site name | `"LinkedIn"` | **No** |
| 7 | `twitter:card` | Twitter card type | `"summary"` | **No** |
| 8 | `twitter:title` | Twitter card title | Same or similar to og:title | **No** |
| 9 | `twitter:description` | Twitter card description | Same or similar to og:description | **No** |
| 10 | `twitter:image` | Twitter card image | Company logo or LinkedIn default | **No** |
| 11 | `twitter:site` | Twitter account for the site | `"@linkedin"` | **No** |
| 12 | `lnkd:url` | LinkedIn-specific URL | Job page URL | Yes (fallback for job URL) |
| 13 | `description` (name) | Standard meta description | Job summary text | **No** |
| 14 | `viewport` | Viewport settings | `"width=device-width, initial-scale=1"` | **No** (not job data) |

### Link Tags

| # | Link Attribute | Description | Example Value | Extracted? |
|---|---|---|---|---|
| 1 | `rel="canonical"` | Canonical URL for the page | `"https://www.linkedin.com/jobs/view/manager-software-engineering-at-linkedin-4361391458"` | Yes (primary source for job URL) |
| 2 | `rel="icon"` / `rel="shortcut icon"` | Favicon | LinkedIn favicon URL | **No** (not job data) |

### Data Attributes on DOM Elements

| # | Attribute | Element | Description | Extracted? |
|---|---|---|---|---|
| 1 | `data-delayed-url` | `img.artdeco-entity-image` | Lazy-loaded company logo URL | Yes |
| 2 | `data-ghost-url` | `img.artdeco-entity-image` | Ghost/placeholder image URL | **No** (not useful) |
| 3 | `data-ghost-classes` | `img.artdeco-entity-image` | CSS classes for ghost state | **No** (not useful) |
| 4 | `datetime` | `time.posted-time-ago__text` | ISO date of posting | Yes |

### og:title Workplace Type Pattern

The `scrapeWorkplaceType` function extracts workplace type from the `og:title` meta tag content using regex pattern matching:

```typescript
// From packages/jobby-client/src/queries/job-details-query.ts
function scrapeWorkplaceType($): string | undefined {
  const metaDesc = $('meta[property="og:title"]').attr('content') ?? '';
  if (/\(remote\)/i.test(metaDesc))  return 'Remote';
  if (/\(hybrid\)/i.test(metaDesc))  return 'Hybrid';
  if (/\(on-site\)/i.test(metaDesc)) return 'On-site';
  return undefined;
}
```

The `og:title` follows the pattern: `"{Company} hiring {Title} in {Location} ({WorkplaceType}) | LinkedIn"`

---

## Fields Comparison: Available vs Extracted

### Summary Table

| Field | Source | JSON-LD Path / CSS Selector | Currently Extracted? | Notes |
|---|---|---|---|---|
| **Job ID** | Derived | Extracted from URL path | Yes | Regex on URL: `/(\d+)\s*\/?$/` |
| **Job URL** | DOM | `link[rel="canonical"]` > `og:url` > `lnkd:url` | Yes | Fallback chain with query param stripping |
| **Title** | JSON-LD + DOM | `title` / `.top-card-layout__title` | Yes | JSON-LD priority, DOM fallback |
| **Description (HTML)** | JSON-LD + DOM | `description` / `.show-more-less-html__markup` | Yes | Converted to markdown via turndown |
| **Company Name** | JSON-LD + DOM | `hiringOrganization.name` / `.topcard__org-name-link` | Yes | JSON-LD priority |
| **Company Page URL** | JSON-LD + DOM | `hiringOrganization.sameAs` / `.topcard__org-name-link` href | Yes | Query params stripped |
| **Company Logo URL** | JSON-LD + DOM | `hiringOrganization.logo` / `img.artdeco-entity-image[data-delayed-url]` | Yes | JSON-LD logo takes priority, DOM fallback |
| **Company Slug** | Derived | Extracted from company page URL regex | Yes | `/company/([^/?#]+)/` on company URL |
| **Location** | JSON-LD + DOM | `jobLocation.address.*` / `.topcard__flavor--bullet` | Yes | JSON-LD builds from locality+region+country |
| **Workplace Type** | JSON-LD + DOM | `jobLocationType` / `og:title` regex | Yes | JSON-LD: "TELECOMMUTE" = Remote; DOM: regex match |
| **Employment Type** | JSON-LD + DOM | `employmentType` / criteria "Employment type" | Yes | JSON-LD mapped: FULL_TIME -> "Full-time" etc. |
| **Seniority Level** | DOM only | Criteria "Seniority level" | Yes | Not in JSON-LD |
| **Salary (structured)** | JSON-LD + DOM | `baseSalary.*` / `.salary-main-rail__compensation-value` | Yes | JSON-LD structured; DOM parsed from text |
| **Salary (display)** | Derived | Formatted from structured salary | Yes | `formatSalaryDisplay()` |
| **Posted Date** | JSON-LD + DOM | `datePosted` / `time[datetime]` | Yes | ISO date string |
| **Expiration Date** | JSON-LD only | `validThrough` | Yes | Only from JSON-LD |
| **Posted Time Ago** | DOM only | `.posted-time-ago__text` | Yes | Relative time text |
| **Applicant Count** | DOM only | `.num-applicants__caption` | Yes | Free text, e.g. "Over 200 applicants" |
| **Industry** | JSON-LD + DOM | `industry` / criteria "Industries" | Yes | JSON-LD priority |
| **Job Function** | DOM only | Criteria "Job function" | Yes | Not in JSON-LD |
| **Experience Required** | JSON-LD only | `experienceRequirements.monthsOfExperience` | Yes | Formatted as "N years" |
| **Education Required** | JSON-LD only | `educationRequirements.credentialCategory` | Yes | e.g. "bachelor degree" |
| **JSON-LD Identifier** | JSON-LD | `identifier` | Yes | Contains job ID as PropertyValue (`name` + `value`) |
| **og:title (full)** | Meta | `meta[property="og:title"]` | Partial | Only regex-matched for workplace type |
| **og:description** | Meta | `meta[property="og:description"]` | Yes | Short job summary (as `shortDescription`) |
| **og:image** | Meta | `meta[property="og:image"]` | Yes | Sharing image URL (as `sharingImageUrl`) |
| **og:type** | Meta | `meta[property="og:type"]` | **No** | Content type |
| **og:site_name** | Meta | `meta[property="og:site_name"]` | **No** | Always "LinkedIn" |
| **twitter:card** | Meta | `meta[name="twitter:card"]` | **No** | Card type |
| **twitter:title** | Meta | `meta[name="twitter:title"]` | **No** | Same as og:title |
| **twitter:description** | Meta | `meta[name="twitter:description"]` | **No** | Same as og:description |
| **twitter:image** | Meta | `meta[name="twitter:image"]` | **No** | Sharing image |
| **meta description** | Meta | `meta[name="description"]` | **No** | SEO description |
| **Apply Button URL** | DOM | `.apply-button` href chain | Yes | Apply URL with fallback selectors |
| **Apply Button Text** | DOM | `.apply-button` text chain | Yes | Apply label with fallback selectors |
| **Similar Jobs** | DOM | Similar jobs section | **No** | Related job listings |
| **Referral Text** | DOM | Referral banner | **No** | Referral messaging |
| **Benefits/Perks** | DOM | Within description body | Partial | Structured benefits via `benefitsInfo`; free-text in description not separately extracted |
| **Benefits Info** | DOM | `.job-details-benefits__text` chain | Yes | Benefits/perks information (as `benefitsInfo`) |
| **Incentive Info** | DOM | `.compensation__incentive-value` chain | Yes | Bonus/incentive info (as `incentiveInfo`) |

### Extraction Gap Analysis

#### High-Value Gaps

All previously identified high-value gaps have been addressed:

| Former Gap | Status | Resolution |
|---|---|---|
| `identifier` (JSON-LD) | **Resolved** | Now captured in Zod schema (`identifier.name`, `identifier.value`) |
| `hiringOrganization.logo` (JSON-LD) | **Resolved** | Now extracted as primary source for `company.logoUrl`, with DOM as fallback |

#### Medium-Value Gaps

Most previously identified medium-value gaps have been addressed:

| Former Gap | Status | Resolution |
|---|---|---|
| `og:description` | **Resolved** | Now extracted as `details.shortDescription` |
| `og:image` | **Resolved** | Now extracted as `details.sharingImageUrl` |
| Benefits information | **Resolved** | Now extracted as `details.benefitsInfo` via DOM scraping with fallback selectors |
| Bonus/Incentive information | **Resolved** | Now extracted as `details.incentiveInfo` via DOM scraping with fallback selectors |

#### Low-Value Gaps (not recommended for extraction)

| Gap | Source | Rationale |
|---|---|---|
| `og:type`, `og:site_name` | Meta tags | Always the same static values, not job-specific |
| `twitter:*` tags | Meta tags | Duplicate og: tag data for Twitter card rendering |
| Similar jobs section | DOM | Different data concern; would require separate parsing |
| Referral text | DOM | Marketing text, not job data |

---

## HTML Structure Reference

### Complete Job Detail Page Structure

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Canonical URL -->
  <link rel="canonical" href="https://www.linkedin.com/jobs/view/{slug}-{job-id}">

  <!-- Meta Tags -->
  <meta property="og:title" content="{Company} hiring {Title} in {Location} ({WorkplaceType}) | LinkedIn">
  <meta property="og:description" content="...">
  <meta property="og:url" content="https://www.linkedin.com/jobs/view/{slug}-{job-id}">
  <meta property="og:image" content="...">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="LinkedIn">
  <meta property="lnkd:url" content="https://www.linkedin.com/jobs/view/{slug}-{job-id}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="...">
  <meta name="twitter:description" content="...">
  <meta name="twitter:image" content="...">
  <meta name="twitter:site" content="@linkedin">
  <meta name="description" content="...">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "Manager, Software Engineering",
    "description": "<p>We are looking for...</p>",
    "datePosted": "2026-02-06",
    "validThrough": "2026-03-15",
    "employmentType": "FULL_TIME",
    "jobLocationType": "TELECOMMUTE",
    "industry": "Technology, Information and Internet",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "LinkedIn",
      "sameAs": "https://www.linkedin.com/company/linkedin?trk=public_jobs_topcard-org-name",
      "logo": "https://media.licdn.com/dms/image/v2/.../company-logo_100_100/..."
    },
    "identifier": {
      "@type": "PropertyValue",
      "name": "LinkedIn",
      "value": "4361391458"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Mountain View",
        "addressRegion": "CA",
        "addressCountry": "US"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": 152000,
        "maxValue": 248000,
        "unitText": "YEAR"
      }
    },
    "experienceRequirements": {
      "monthsOfExperience": 60
    },
    "educationRequirements": {
      "credentialCategory": "bachelor degree"
    }
  }
  </script>
</head>
<body>
  <!-- Top Card Section -->
  <section>
    <div class="top-card-layout__entity-info-container">
      <img class="artdeco-entity-image artdeco-entity-image--square-4"
           data-delayed-url="https://media.licdn.com/dms/image/v2/.../company-logo_100_100/..."
           data-ghost-classes="artdeco-entity-image--ghost"
           data-ghost-url="https://static.licdn.com/aero-v1/sc/h/..."
           alt="LinkedIn">
    </div>
  </section>

  <h1 class="top-card-layout__title">Manager, Software Engineering</h1>

  <a class="topcard__org-name-link"
     href="https://www.linkedin.com/company/linkedin?trk=public_jobs_topcard-org-name">
    LinkedIn
  </a>

  <span class="topcard__flavor--bullet">Mountain View, CA</span>

  <!-- Salary (when present) -->
  <div class="salary-main-rail__compensation-value">$152,000.00/yr - $248,000.00/yr</div>
  <!-- OR alternate selector -->
  <div class="compensation__salary">$104,482.00/yr - $130,602.00/yr</div>

  <!-- Posted Time -->
  <time class="posted-time-ago__text" datetime="2026-02-06">1 week ago</time>

  <!-- Applicant Count -->
  <span class="num-applicants__caption">Over 200 applicants</span>

  <!-- Job Description -->
  <div class="show-more-less-html__markup">
    <p>Job description HTML content here...</p>
    <ul>
      <li>Responsibility 1</li>
      <li>Responsibility 2</li>
    </ul>
  </div>

  <!-- Job Criteria -->
  <ul class="description__job-criteria-list">
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Seniority level</h3>
      <span class="description__job-criteria-text">Mid-Senior level</span>
    </li>
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Employment type</h3>
      <span class="description__job-criteria-text">Full-time</span>
    </li>
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Job function</h3>
      <span class="description__job-criteria-text">Sales</span>
    </li>
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Industries</h3>
      <span class="description__job-criteria-text">Technology, Information and Internet</span>
    </li>
  </ul>
</body>
</html>
```

---

## Real Page Data Samples

### Sample 1: Manager, Software Engineering at LinkedIn (Job ID: 4361391458)

| Field | Value |
|---|---|
| Title | Manager, Software Engineering |
| Company | LinkedIn |
| Location | Mountain View, CA |
| Salary | $152,000.00/yr - $248,000.00/yr |
| Posted | 1 week ago |
| Applicants | Over 200 applicants |
| Seniority Level | Mid-Senior level |
| Employment Type | Full-time |
| Job Function | Sales |
| Industries | Technology, Information and Internet |
| Workplace Type | Hybrid |
| Experience | 5+ years of industry experience in software design |
| Education | BA/BS Degree in Computer Science or related technical discipline |

### Sample 2: Full Stack Engineer II - .Net/Azure at McDonald's (Job ID: 4371789856)

| Field | Value |
|---|---|
| Title | Full Stack Engineer II - .Net/Azure |
| Company | McDonald's |
| Location | Chicago, IL |
| Salary | $104,482.00/yr - $130,602.00/yr |
| Posted | 10 hours ago |
| Applicants | 83 applicants |
| Seniority Level | Mid-Senior level |
| Employment Type | Full-time |
| Job Function | Information Technology |
| Industries | Restaurants |
| Workplace Type | Hybrid |
| Bonus Eligible | Yes |
| Long-Term Incentive | No |
| Benefits Eligible | Yes |
| Experience | 5+ years full stack development |
| Education | Bachelor's degree in Computer Science, Engineering, or related field |

### Sample 3: Software Engineer (C#) at Path Robotics (Job ID: 4368816227)

| Field | Value |
|---|---|
| Title | Software Engineer (C#) |
| Company | Path Robotics |
| Location | Columbus, OH |
| Salary | *(not provided)* |
| Posted | 1 month ago |
| Applicants | Be among the first 25 applicants |
| Seniority Level | Entry level |
| Employment Type | Full-time |
| Job Function | Engineering and Information Technology |
| Industries | Automation Machinery Manufacturing |
| Workplace Type | *(not specified)* |
| Experience | 1-2 years contributing to production applications |
| Education | Bachelor's degree in Computer Science or related field |

---

## Current Code Architecture

### Parsing Flow

```
HTML Response
    |
    v
parseJobDetails(html, jobUrl, config)
    |
    +-- extractJsonLd($, config)
    |       |
    |       +-- Finds all <script type="application/ld+json">
    |       +-- Parses JSON, validates with JsonLdJobPostingSchema
    |       +-- Returns JsonLdJobPosting or undefined
    |       |
    |       v
    +-- parseJsonLdToJobDetailsData($, config) --> ParsedJobDetailsData
    |
    +-- scrapeJobDetailsDataFromDom($) --> ParsedJobDetailsData
    |
    v
Merge: JSON-LD fields take priority, DOM fields are fallback
    |
    v
JobDetails (final output)
```

### Priority Resolution

For each field, the code uses JSON-LD as the primary source and DOM scraping as the fallback:

```typescript
// Example from parseJobDetails:
return {
  summary: {
    position: jsonLdDetails.title ?? scrapedDetails.title,
    location: jsonLdDetails.location ?? scrapedDetails.location,
    company: {
      name: jsonLdDetails.company ?? scrapedDetails.company,
      slug: jsonLdDetails.companySlug ?? scrapedDetails.companySlug,
      pageUrl: jsonLdDetails.companyPage ?? scrapedDetails.companyPage,
      logoUrl: jsonLdDetails.companyLogo ?? scrapedDetails.companyLogo,  // JSON-LD logo now extracted
    },
  },
  details: {
    // ... other fields ...
    applyUrl: jsonLdDetails.applyUrl ?? scrapedDetails.applyUrl,
    applyText: jsonLdDetails.applyText ?? scrapedDetails.applyText,
    shortDescription: jsonLdDetails.shortDescription ?? scrapedDetails.shortDescription,
    sharingImageUrl: jsonLdDetails.sharingImageUrl ?? scrapedDetails.sharingImageUrl,
  },
  // ... etc
};
```

### Fields Only Available from One Source

| Field | Only From | Why |
|---|---|---|
| Seniority Level | DOM | Not present in LinkedIn's JSON-LD |
| Job Function | DOM | Not present in LinkedIn's JSON-LD |
| Expiration Date | JSON-LD | `validThrough` not in DOM |
| Experience Required | JSON-LD | `experienceRequirements.monthsOfExperience` not in DOM |
| Education Required | JSON-LD | `educationRequirements.credentialCategory` not in DOM |
| Posted Time Ago | DOM | Relative text not in JSON-LD |
| Applicant Count | DOM | Not in JSON-LD |
| Apply Button URL/Text | DOM | Not in JSON-LD |
| Short Description | DOM (meta) | `og:description` meta tag, not in JSON-LD |
| Sharing Image URL | DOM (meta) | `og:image` meta tag, not in JSON-LD |
| Benefits Info | DOM | Not in JSON-LD |
| Incentive Info | DOM | Not in JSON-LD |
| JSON-LD Identifier | JSON-LD | `identifier.value` not in DOM |

---

## Historic Updates

| Date | Section | Change |
|---|---|---|
| 2026-02-13 | *(all)* | Initial analysis performed. All JSON-LD fields, DOM selectors, meta tags, and extraction gaps documented. |
| 2026-02-13 | JSON-LD, DOM, Meta, Gaps | Closed extraction gaps: added `identifier` and `hiringOrganization.logo` to Zod schema; added `og:description` (as `shortDescription`), `og:image` (as `sharingImageUrl`), apply button URL/text, and company slug extraction. Updated all tables and code examples. |
| 2026-02-13 | DOM, Gaps | Added `benefitsInfo` and `incentiveInfo` fields for extracting benefits/perks and bonus/incentive information from job listing pages. Resolved remaining medium-value extraction gaps. |
