# jobby-client

TypeScript client library for searching LinkedIn job postings. Provides a typed API for querying jobs and retrieving job details.

## Installation

```bash
npm install jobby-client
```

Requires Node.js >= 22.0.0.

## Quick Start

```typescript
import { JobbyClient } from 'jobby-client';

const client = new JobbyClient();

// Search for jobs
const response = await client.jobs.queryForJobs({
  keyword: 'TypeScript developer',
  location: 'San Francisco',
  jobType: 'full-time',
  workplaceType: 'remote',
});

console.log(`Found ${response.pagination.resultsCount} jobs`);

for (const job of response.results) {
  console.log(`${job.summary.position} at ${job.summary.company.name} - ${job.summary.location}`);
}
```

### Example Result

```json
{
  "results": [
    {
      "id": "4195018826",
      "url": "https://www.linkedin.com/jobs/view/4195018826",
      "summary": {
        "position": "Senior TypeScript Developer",
        "location": "San Francisco, CA (Remote)",
        "company": {
          "name": "Acme Corp",
          "slug": "acme-corp",
          "pageUrl": "https://www.linkedin.com/company/acme-corp",
          "logoUrl": "https://media.licdn.com/dms/image/..."
        },
        "salary": "$150,000 - $200,000/yr",
        "highlight": "Actively Hiring +3 benefits",
        "isNew": true,
        "easyApply": true
      },
      "posted": {
        "date": "2025-01-15",
        "ago": "2 days ago"
      }
    }
  ],
  "pagination": {
    "start": 0,
    "responseCount": 1,
    "resultsCount": 1
  },
  "query": {
    "keyword": "TypeScript developer",
    "location": "San Francisco",
    "jobType": "full-time",
    "workplaceType": "remote"
  },
  "metadata": {
    "timestamp": "2025-01-17T10:30:00.000Z",
    "durationMs": 1234,
    "searchUrl": "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?..."
  }
}
```

## Fluent Builder

```typescript
const response = await client.jobs
  .createSearch()
  .withKeyword('React')
  .withLocation('New York')
  .withWorkplaceType('remote')
  .withExperience('senior')
  .takeResults(10)
  .execute();
```

## Get Job Details

```typescript
const details = await client.jobs.queryForJobDetailsById('4195018826');

console.log(details.summary.position);
console.log(details.summary.company.name);
console.log(details.details.description);
console.log(details.summary.salary); // "$150,000 - $200,000/yr"
console.log(details.details.applyUrl); // Apply button URL, if available
```

## Documentation

- [Configuration](./docs/configuration.md) - Client options, timeouts, and logging
- [Search Parameters](./docs/search-parameters.md) - All available search filters
- [Response Types](./docs/response-types.md) - Job, JobDetails, and SearchResponse shapes
- [Error Handling](./docs/error-handling.md) - Error types and retry behavior
- [Builder API](./docs/builder-api.md) - Fluent search builder reference
- [API Analysis Process](./docs/analysis.md) - How the LinkedIn guest API is analyzed and how changes are tracked

## License

[MIT](../../LICENSE)
