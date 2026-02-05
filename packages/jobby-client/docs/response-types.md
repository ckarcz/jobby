# Response Types

## `SearchResponse<T>`

Returned by `queryForJobs`.

```typescript
interface SearchResponse<T> {
  results: T[];
  pagination: PaginationInfo;
  query: JobSearchParams;
  metadata: SearchMetadata;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `results` | `T[]` | Array of job results |
| `pagination` | `PaginationInfo` | Pagination information |
| `query` | `JobSearchParams` | The search parameters used |
| `metadata` | `SearchMetadata` | Timing and URL metadata |

## `Job`

A job listing from search results. Uses nested `summary` and `posted` objects.

```typescript
interface Job {
  id: string | undefined;
  url: string | undefined;
  summary: JobSummary;
  posted: JobPosted;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| undefined` | LinkedIn job ID |
| `url` | `string \| undefined` | Canonical URL to the job posting |
| `summary` | `JobSummary` | Summary information (position, company, location, etc.) |
| `posted` | `JobPosted` | Posting date information |

## `JobSummary`

Summary information for a job listing.

```typescript
interface JobSummary {
  position: string | undefined;
  location: string | undefined;
  company: JobCompany;
  salary: string | undefined;
  highlight: string | undefined;
  isNew: boolean | undefined;
  easyApply: boolean | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `position` | `string \| undefined` | Job title |
| `location` | `string \| undefined` | Job location |
| `company` | `JobCompany` | Company information |
| `salary` | `string \| undefined` | Salary range as a display string (if listed) |
| `highlight` | `string \| undefined` | Highlight badge text (e.g. "Actively Hiring +3 benefits") |
| `isNew` | `boolean \| undefined` | `true` if this is a new listing, `undefined` otherwise |
| `easyApply` | `boolean \| undefined` | `true` if Easy Apply badge is present, `undefined` otherwise |

## `JobCompany`

Company information associated with a job listing.

```typescript
interface JobCompany {
  name: string | undefined;
  slug: string | undefined;
  pageUrl: string | undefined;
  logoUrl: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string \| undefined` | Company name |
| `slug` | `string \| undefined` | Company URL slug (e.g. "intuit" from linkedin.com/company/intuit) |
| `pageUrl` | `string \| undefined` | URL to the company's LinkedIn page |
| `logoUrl` | `string \| undefined` | URL to the company logo image |

## `JobPosted`

Posting date information.

```typescript
interface JobPosted {
  date: string | undefined;
  ago: string | undefined;
  expirationDate?: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string \| undefined` | Posting date (ISO format) |
| `ago` | `string \| undefined` | Relative time (e.g. "2 days ago") |
| `expirationDate` | `string \| undefined` | Listing expiration date (only in details responses) |

## `JobDetails`

Detailed information about a single job posting. Extends `Job` with a `details` object.

```typescript
interface JobDetails extends Job {
  details: JobDetailsInfo;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| undefined` | LinkedIn job ID |
| `url` | `string \| undefined` | Canonical URL to the job posting |
| `summary` | `JobSummary` | Summary information (position, company, location, etc.) |
| `posted` | `JobPosted` | Posting date information (includes `expirationDate`) |
| `details` | `JobDetailsInfo` | Detailed job information |

## `JobDetailsInfo`

The detailed information nested within a `JobDetails` response.

```typescript
interface JobDetailsInfo {
  description: string | undefined;
  salary: {
    min: number | undefined;
    max: number | undefined;
    currency: string | undefined;
    period: string | undefined;
  } | undefined;
  location: string | undefined;
  workplaceType: string | undefined;
  employmentType: string | undefined;
  seniorityLevel: string | undefined;
  applicants: string | undefined;
  industry: string | undefined;
  jobFunction: string | undefined;
  experienceRequired: string | undefined;
  educationRequired: string | undefined;
  applyUrl: string | undefined;
  applyText: string | undefined;
  shortDescription: string | undefined;
  sharingImageUrl: string | undefined;
  benefitsInfo: string | undefined;
  incentiveInfo: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string \| undefined` | Job description in Markdown format |
| `salary` | `object \| undefined` | Structured salary information |
| `salary.min` | `number \| undefined` | Minimum salary value |
| `salary.max` | `number \| undefined` | Maximum salary value |
| `salary.currency` | `string \| undefined` | Salary currency (e.g. "USD") |
| `salary.period` | `string \| undefined` | Salary period (e.g. "YEAR", "MONTH") |
| `location` | `string \| undefined` | Job location |
| `workplaceType` | `string \| undefined` | On-site, Remote, or Hybrid |
| `employmentType` | `string \| undefined` | Full-time, Part-time, Contract, etc. |
| `seniorityLevel` | `string \| undefined` | Seniority level |
| `applicants` | `string \| undefined` | Number of applicants as a display string |
| `industry` | `string \| undefined` | Industry category |
| `jobFunction` | `string \| undefined` | Job function category |
| `experienceRequired` | `string \| undefined` | Required experience |
| `educationRequired` | `string \| undefined` | Required education |
| `applyUrl` | `string \| undefined` | Apply button URL |
| `applyText` | `string \| undefined` | Apply button text (e.g. "Apply", "Easy Apply") |
| `shortDescription` | `string \| undefined` | Short description from og:description meta tag |
| `sharingImageUrl` | `string \| undefined` | Sharing image URL from og:image meta tag |
| `benefitsInfo` | `string \| undefined` | Benefits and perks information |
| `incentiveInfo` | `string \| undefined` | Bonus and incentive compensation information |

## `PaginationInfo`

```typescript
interface PaginationInfo {
  start: number;
  skip: number | undefined;
  take: number | undefined;
  responseCount: number;
  resultsCount: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `start` | `number` | Starting offset used in the query |
| `skip` | `number \| undefined` | Number of results skipped |
| `take` | `number \| undefined` | Maximum results requested |
| `responseCount` | `number` | Number of jobs parsed from the LinkedIn response (before skip/take) |
| `resultsCount` | `number` | Number of results returned after applying skip and take (`<= responseCount`) |

## `SearchMetadata`

```typescript
interface SearchMetadata {
  timestamp: Date;
  durationMs: number;
  searchUrl: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `Date` | When the search was executed |
| `durationMs` | `number` | How long the search took |
| `searchUrl` | `string` | The URL that was queried |
