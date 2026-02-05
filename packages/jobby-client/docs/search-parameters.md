# Search Parameters

## `JobSearchParams`

All search parameters are optional.

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyword` | `string` | Job title, skill, or company name |
| `location` | `string` | City, state, or country |
| `jobType` | `JobType` | Type of employment |
| `experienceLevel` | `ExperienceLevel` | Required experience level |
| `minimumSalary` | `MinimumSalary` | Minimum salary filter |
| `workplaceType` | `WorkplaceType` | Workplace arrangement |
| `listingAge` | `ListingAge` | How recently posted |
| `geoId` | `string` | LinkedIn geo ID (e.g. `103644278` for US) |
| `companyId` | `string` | LinkedIn company ID (e.g. `1441` for Google) |

## Filter Values

### `JobType`

| Value | Description |
|-------|-------------|
| `'full-time'` | Full-time positions |
| `'part-time'` | Part-time positions |
| `'contract'` | Contract positions |
| `'temporary'` | Temporary positions |
| `'volunteer'` | Volunteer positions |
| `'internship'` | Internship positions |
| `'other'` | Other employment types |

### `ExperienceLevel`

| Value | Description |
|-------|-------------|
| `'internship'` | Internship level |
| `'entry-level'` | Entry level |
| `'associate'` | Associate level |
| `'senior'` | Senior / Mid-Senior level |
| `'director'` | Director level |
| `'executive'` | Executive level |

### `MinimumSalary`

| Value |
|-------|
| `'40,000'` |
| `'60,000'` |
| `'80,000'` |
| `'100,000'` |
| `'120,000'` |
| `'140,000'` |
| `'160,000'` |
| `'180,000'` |
| `'200,000'` |

### `WorkplaceType`

| Value | Description |
|-------|-------------|
| `'on-site'` | In-office only |
| `'remote'` | Fully remote |
| `'hybrid'` | Hybrid arrangement |

### `ListingAge`

| Value | Description |
|-------|-------------|
| `'past-24-hours'` | Posted in the last 24 hours |
| `'past-week'` | Posted in the last 7 days |
| `'past-month'` | Posted in the last 30 days |

## `PaginationParams`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | `number` | `0` | Starting offset for the query |
| `skip` | `number` | `undefined` | Number of results to skip from response |
| `take` | `number` | `undefined` | Maximum results to return (after skip) |

## Usage Examples

### Basic Search

```typescript
const response = await client.jobs.queryForJobs({
  keyword: 'software engineer',
  location: 'Austin, TX',
});
```

### Filtered Search

```typescript
const response = await client.jobs.queryForJobs({
  keyword: 'React developer',
  location: 'Remote',
  jobType: 'full-time',
  experienceLevel: 'senior',
  minimumSalary: '120,000',
  workplaceType: 'remote',
  listingAge: 'past-week',
});
```

### Paginated Search

```typescript
// Get the first 10 results
const page1 = await client.jobs.queryForJobs(
  { keyword: 'Python' },
  { start: 0, take: 10 },
);

// Get the next 10 results
const page2 = await client.jobs.queryForJobs(
  { keyword: 'Python' },
  { start: 25, take: 10 },
);
```

### Choice Constants

The library exports arrays of valid values for each filter, useful for building UIs or validation:

```typescript
import {
  JOB_TYPE_CHOICES,
  EXPERIENCE_LEVEL_CHOICES,
  MINIMUM_SALARY_CHOICES,
  WORKPLACE_TYPE_CHOICES,
  LISTING_AGE_CHOICES,
} from 'jobby-client';

console.log(JOB_TYPE_CHOICES);
// ['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship', 'other']
```
