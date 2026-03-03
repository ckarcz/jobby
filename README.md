# Jobby

A TypeScript monorepo for programmatically searching LinkedIn job listings. Whether you're building your own application, searching from the terminal, or using an AI agent — this project provides a clean interface to LinkedIn's undocumented guest job search API.

- **Client library** — integrate LinkedIn job search into your own TypeScript/Node.js applications
- **CLI tool** — search for jobs from your terminal with structured output (JSON, CSV, YAML, XML) or an interactive TUI
- **MCP server** — expose job search as tools for AI assistants like Claude

## Packages

| Package | Description |
|---------|-------------|
| [`jobby-client`](./packages/jobby-client) | Core client library for querying LinkedIn jobs |
| [`jobby-cli`](./packages/jobby-cli) | Command-line interface for searching jobs |
| [`jobby-mcp`](./packages/jobby-mcp) | Model Context Protocol server for AI assistants |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- npm

### Installation

```bash
git clone <repo-url>
cd jobby
npm install
npm run build
```

### Usage

#### Client Library

```typescript
import { JobbyClient } from 'jobby-client';

const client = new JobbyClient();

// Search for jobs
const response = await client.jobs.queryForJobs({
  keyword: 'TypeScript developer',
  location: 'New York',
  jobType: 'full-time',
});

for (const job of response.results) {
  console.log(`${job.summary.position} at ${job.summary.company.name} - ${job.summary.location}`);
}

// Get job details
const details = await client.jobs.queryForJobDetailsById('4195018826');
console.log(details.details.description);
console.log(details.summary.salary); // "$150,000 - $200,000/yr"
```

See the [client library documentation](./packages/jobby-client/README.md) for the full API, fluent builder, and configuration options.

#### CLI

```
$ jobby --help

Usage: jobby [options] [command]

search for jobs on LinkedIn from the command line

Options:
  --version                      show version number
  --no-color                     disable colored output
  -h, --help                     display help for command

Commands:
  search [options] [keyword]     search for jobs with filters
  details [options] [id-or-url]  get detailed information for a specific job
                                 posting
  ui                             launch interactive terminal UI for searching
                                 jobs
  help [command]                 display help for command

Examples:
  $ jobby search "software engineer" --location "New York"
  $ jobby search "React" --workplace-type remote --experience-level senior
  $ jobby details "https://linkedin.com/jobs/view/123456"

Run 'jobby <command> --help' for more information on a command.
```

```
$ jobby search --help

Usage: jobby search [keyword] [options]

search for jobs with filters

Arguments:
  keyword                     job title, skill, or company name

Options:
  --keyword <string>          job title, skill, or company name
  --location <string>         city, state, or country
  --job-type <type>           type of job choices: ["full-time", "part-time",
                              "contract", "temporary", "volunteer",
                              "internship", "other"]
  --experience-level <level>  required experience level choices: ["internship",
                              "entry-level", "associate", "senior", "director",
                              "executive"]
  --minimum-salary <salary>   minimum salary threshold choices: ["40,000",
                              "60,000", "80,000", "100,000", "120,000",
                              "140,000", "160,000", "180,000", "200,000"]
  --workplace-type <type>     work location type choices: ["on-site", "remote",
                              "hybrid"]
  --listing-age <age>         how recently the job was posted choices:
                              ["past-24-hours", "past-week", "past-month"]
  --geo-id <id>               LinkedIn geo ID (e.g. 103644278 for US)
  --company-id <id>           LinkedIn company ID (e.g. 1441 for Google)
  --start <number>            starting offset for pagination
  --skip <number>             number of results to skip from response
  --take <number>             maximum number of results to return
  --detailed                  fetch full details for each job result
  --format <type>             output format choices: ["json", "xml", "yaml",
                              "csv", "rawHtml"] default: "json"
  --file <path>               write output to file instead of stdout
  --pretty                    pretty print output (where applicable)
  --debug                     enable debug logging and show stack traces on
                              error
  --no-color                  disable colored output
  --log-level <level>         set logging verbosity choices: ["silent", "error",
                              "warn", "info", "verbose", "debug"] default:
                              "silent"
  -h, --help                  display help for command

Examples:
  $ jobby search "TypeScript" --location "San Francisco" --job-type full-time
  $ jobby search "React" --workplace-type remote --minimum-salary 120,000
  $ jobby search "Python" --experience-level senior --geo-id 103644278 --take 5
  $ echo "TypeScript" | jobby search
```

```
$ jobby details --help

Usage: jobby details [options] [id-or-url]

get detailed information for a specific job posting

Arguments:
  id-or-url            LinkedIn job ID or posting URL

Options:
  --url <url>          LinkedIn job posting URL
  --id <id>            LinkedIn job ID
  --format <type>      output format choices: ["json", "xml", "yaml", "csv",
                       "rawHtml"] default: "json"
  --file <path>        write output to file instead of stdout
  --pretty             pretty print output (where applicable)
  --debug              enable debug logging and show stack traces on error
  --no-color           disable colored output
  --log-level <level>  set logging verbosity choices: ["silent", "error",
                       "warn", "info", "verbose", "debug"] default: "silent"
  -h, --help           display help for command

Examples:
  $ jobby details "https://www.linkedin.com/jobs/view/123456"
  $ jobby details 123456
  $ jobby details --id 123456
  $ jobby details --url "https://www.linkedin.com/jobs/view/123456"
  $ echo "123456" | jobby details
```

**Search example:**

```bash
jobby search "TypeScript developer" --location "New York" --format json --pretty
```

```json
{
  "results": [
    {
      "id": "4195018826",
      "url": "https://www.linkedin.com/jobs/view/4195018826",
      "summary": {
        "position": "Senior TypeScript Developer",
        "location": "New York, NY",
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
    "responseCount": 25,
    "resultsCount": 25
  }
}
```

**Details example:**

```bash
jobby details 4195018826 --format json --pretty
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
    "ago": "2 days ago",
    "expirationDate": "2025-03-15"
  },
  "details": {
    "description": "We are looking for a Senior TypeScript Developer...",
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

**Interactive TUI:**

```bash
jobby ui
```

Launches a full-screen terminal UI with interactive search, filters, and keyboard navigation.

#### MCP Server

Configure your MCP client to launch `jobby-mcp` as a subprocess:

```json
{
  "mcpServers": {
    "jobby": {
      "command": "npx",
      "args": ["jobby-mcp"]
    }
  }
}
```

Once configured, your AI assistant has access to two tools:

- **`search_jobs`** — search for LinkedIn job postings with filters (keyword, location, job type, experience level, workplace type, salary, listing age, etc.)
- **`get_job_details`** — get detailed information about a specific job by ID or URL

Example prompts:

> "Search for remote TypeScript developer jobs in San Francisco"

> "Get details for LinkedIn job 4195018826"

See the [MCP server documentation](./packages/jobby-mcp/README.md) for full setup instructions and tool reference.

## Development

| Script | Command | Description |
|--------|---------|-------------|
| `clean` | `npm run clean --workspaces` | Remove build artifacts from all packages |
| `build` | `npm run build --workspaces` | Build (compile TypeScript) all packages |
| `lint` | `npm run lint --workspaces` | Lint all packages |
| `lint:fix` | `npm run lint:fix --workspaces` | Lint all packages with auto-fix |
| `test` | `npm run test:unit` | Alias for `test:unit` |
| `test:unit` | `vitest run --project unit` | Run all unit tests |
| `test:integration` | `vitest run --project integration` | Run all integration tests |
| `test:coverage` | `vitest run --project unit --coverage` | Run unit tests with coverage |
| `test:coverage:ui` | `vitest --ui --project unit --coverage.enabled` | Open vitest UI with coverage in the browser |
| `start:cli` | delegates to `jobby-cli` | Start the CLI (shows help) |
| `start:cli:ui` | delegates to `jobby-cli` | Start the interactive TUI |
| `start:cli:search` | delegates to `jobby-cli` | Run a sample search (`"C#" --pretty`) |
| `start:cli:details` | delegates to `jobby-cli` | Fetch sample job details (`4368607271 --pretty`) |
| `watch:cli` | delegates to `jobby-cli` | File-watch mode for CLI |
| `watch:cli:ui` | delegates to `jobby-cli` | File-watch mode for TUI |
| `watch:cli:search` | delegates to `jobby-cli` | File-watch mode for sample search |
| `watch:cli:details` | delegates to `jobby-cli` | File-watch mode for sample details |

## Documentation

- [Architecture](./docs/architecture.md) - Monorepo structure and package relationships
- [Development Guide](./docs/development.md) - Building, testing, and contributing
- [LinkedIn Job Search API Analysis](./docs/linkedin-jobs-query-analysis.md) - Comprehensive analysis of LinkedIn's guest job search API
- [LinkedIn Job Details Page Analysis](./docs/linkedin-job-details-analysis.md) - Extractable data fields from LinkedIn job listing detail pages

### Package Documentation

- [Client Library (`jobby-client`)](./packages/jobby-client/README.md) - Configuration, search parameters, response types, error handling, builder API
- [CLI (`jobby-cli`)](./packages/jobby-cli/README.md) - Commands, output formats, usage examples
- [MCP Server (`jobby-mcp`)](./packages/jobby-mcp/README.md) - Tools reference, setup guide

## Analysis & Maintenance

This project relies on LinkedIn's **undocumented guest job search API**, which can change without notice. To track and adapt to these changes, we maintain a detailed [job search API analysis](./docs/linkedin-jobs-query-analysis.md) that catalogs every supported query parameter, filter, response field, and their verified working status against the guest API.

Job detail pages are scraped using a **dual extraction strategy**: structured JSON-LD data (schema.org `JobPosting`) is parsed first, with DOM scraping as a fallback for fields not present in the structured data. We maintain a separate [job details page analysis](./docs/linkedin-job-details-analysis.md) that documents every extractable field, CSS selector, fallback chain, and the Zod validation schema used for JSON-LD parsing.

Both analyses are designed to be re-run periodically by an AI agent (using each document as a prompt input) to systematically re-test all parameters, selectors, and response parsing, detect any changes, and update the documents with new findings. See the client library's [analysis process](./packages/jobby-client/docs/analysis.md) for the full procedure and how changes flow into code updates across all three packages.

## License

[MIT](LICENSE)
