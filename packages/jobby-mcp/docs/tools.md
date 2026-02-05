# Tools Reference

The MCP server registers two tools.

## `search_jobs`

Search for jobs on LinkedIn with various filters. Returns a list of job postings matching the criteria.

### Parameters

All parameters are optional.

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyword` | `string` | Job title, skill, or company name to search for |
| `location` | `string` | City, state, or country to search in |
| `jobType` | `string` | Employment type (see values below) |
| `experienceLevel` | `string` | Required experience level (see values below) |
| `minimumSalary` | `string` | Minimum salary filter (see values below) |
| `workplaceType` | `string` | Workplace arrangement (see values below) |
| `listingAge` | `string` | How recently posted (see values below) |
| `geoId` | `string` | LinkedIn geo ID (e.g. `103644278` for US) |
| `companyId` | `string` | LinkedIn company ID (e.g. `1441` for Google) |
| `start` | `number` | Starting offset for pagination |
| `skip` | `number` | Number of results to skip |
| `take` | `number` | Maximum results to return |

### Filter Values

**`jobType`**: `full-time`, `part-time`, `contract`, `temporary`, `volunteer`, `internship`, `other`

**`experienceLevel`**: `internship`, `entry-level`, `associate`, `senior`, `director`, `executive`

**`minimumSalary`**: `40,000`, `60,000`, `80,000`, `100,000`, `120,000`, `140,000`, `160,000`, `180,000`, `200,000`

**`workplaceType`**: `on-site`, `remote`, `hybrid`

**`listingAge`**: `past-24-hours`, `past-week`, `past-month`

### Example Request

```json
{
  "keyword": "TypeScript developer",
  "location": "San Francisco",
  "jobType": "full-time",
  "workplaceType": "remote",
  "take": 10
}
```

### Response

Returns JSON with search results, pagination info, query parameters, and metadata.

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
    "responseCount": 10,
    "resultsCount": 10
  }
}
```

---

## `get_job_details`

Get detailed information about a specific job posting by URL or job ID.

### Parameters

At least one of `jobUrl` or `jobId` is required.

| Parameter | Type | Description |
|-----------|------|-------------|
| `jobUrl` | `string` | The LinkedIn job posting URL |
| `jobId` | `string` | The LinkedIn job ID |

### Example Request

```json
{
  "jobId": "4195018826"
}
```

Or:

```json
{
  "jobUrl": "https://www.linkedin.com/jobs/view/4195018826"
}
```

### Response

Returns JSON with detailed job information.

```json
{
  "id": "4195018826",
  "url": "https://www.linkedin.com/jobs/view/4195018826",
  "summary": {
    "position": "Senior TypeScript Developer",
    "location": "San Francisco, CA",
    "company": {
      "name": "Acme Corp",
      "slug": "acme-corp",
      "pageUrl": "https://www.linkedin.com/company/acme-corp",
      "logoUrl": "https://media.licdn.com/dms/image/..."
    },
    "salary": "$150,000 - $200,000/yr"
  },
  "posted": {
    "date": "2025-01-15",
    "ago": "2 days ago",
    "expirationDate": "2025-03-15"
  },
  "details": {
    "description": "We are looking for a Senior TypeScript Developer...",
    "salary": {
      "min": 150000,
      "max": 200000,
      "currency": "USD",
      "period": "YEAR"
    },
    "location": "San Francisco, CA",
    "workplaceType": "Remote",
    "employmentType": "Full-time",
    "seniorityLevel": "Mid-Senior level",
    "applicants": "47 applicants",
    "industry": "Technology",
    "jobFunction": "Engineering",
    "experienceRequired": "5 years",
    "educationRequired": "bachelor degree",
    "applyUrl": "https://www.linkedin.com/jobs/view/4195018826/apply",
    "applyText": "Easy Apply",
    "shortDescription": "Acme Corp is hiring a Senior TypeScript Developer...",
    "sharingImageUrl": "https://media.licdn.com/sharing-image.jpg",
    "benefitsInfo": "Benefits Eligible: Yes",
    "incentiveInfo": "Bonus Eligible: Yes"
  }
}
```
