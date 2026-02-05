# jobby-cli

Command-line interface for searching LinkedIn job postings. Supports multiple output formats and piped input.

## Installation

```bash
npm install -g jobby-cli
```

Or run directly from the monorepo:

```bash
npm run build
npx jobby
```

Requires Node.js >= 22.0.0.

## Quick Start

### Search for Jobs

```bash
jobby search "TypeScript developer" --location "San Francisco" --pretty --take 1
```

```json
{
  "results": [
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
    "take": 1,
    "responseCount": 10,
    "resultsCount": 1
  }
}
```

### Interactive UI

```bash
jobby ui "React" --location "New York" --workplace-type remote
```

Launches a full-screen terminal UI with search, pagination, detail browsing, and a filter editor.

### Get Job Details

```bash
jobby details 4195018826 --pretty
```

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
    "ago": "2 days ago"
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
    "applyUrl": "https://www.linkedin.com/jobs/view/4195018826/apply",
    "applyText": "Easy Apply",
    "shortDescription": "Acme Corp is hiring a Senior TypeScript Developer...",
    "benefitsInfo": "Benefits Eligible: Yes",
    "incentiveInfo": "Bonus Eligible: Yes"
  }
}
```

## Documentation

- [Commands](./docs/commands.md) - Full command reference with all options
- [Output Formats](./docs/output-formats.md) - JSON, XML, YAML, CSV, and raw HTML
- [Usage Examples](./docs/examples.md) - Common usage patterns and piping

## Keeping Up with API Changes

The CLI's available filters and output fields depend on the underlying client library, which interfaces with LinkedIn's undocumented guest API. When the API changes, the client library is updated first, then CLI flags and output formatting are updated to match. See the [API analysis process](../jobby-client/docs/analysis.md) for how changes are detected and propagated.

## License

[MIT](../../LICENSE)
