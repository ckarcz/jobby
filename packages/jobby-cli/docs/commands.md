# Commands

## `jobby search`

Search for job postings on LinkedIn.

```
jobby search [keyword] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `keyword` | Job title, skill, or company name (optional, can also use `--keyword`) |

### Search Filters

| Option | Values | Description |
|--------|--------|-------------|
| `--keyword <string>` | Any string | Keyword filter (alternative to positional argument) |
| `--location <string>` | Any string | City, state, or country |
| `--job-type <type>` | `full-time`, `part-time`, `contract`, `temporary`, `volunteer`, `internship`, `other` | Employment type |
| `--experience-level <level>` | `internship`, `entry-level`, `associate`, `senior`, `director`, `executive` | Experience level |
| `--minimum-salary <salary>` | `40,000` through `200,000` | Minimum salary |
| `--workplace-type <type>` | `on-site`, `remote`, `hybrid` | Workplace arrangement |
| `--listing-age <age>` | `past-24-hours`, `past-week`, `past-month` | Posting recency |
| `--under-10-applicants` | Boolean flag | Only low-applicant jobs |
| `--easy-apply-only` | Boolean flag | Only Easy Apply listings |

### Pagination

| Option | Default | Description |
|--------|---------|-------------|
| `--start <number>` | `0` | Starting offset |
| `--skip <number>` | — | Results to skip from response |
| `--take <number>` | — | Maximum results to return |

### Output

| Option | Default | Description |
|--------|---------|-------------|
| `--format <type>` | `json` | Output format: `json`, `xml`, `yaml`, `csv`, `rawHtml` |
| `--file <path>` | — | Write output to a file instead of stdout |
| `--pretty` | `false` | Pretty-print the output |

### Debug

| Option | Default | Description |
|--------|---------|-------------|
| `--debug` | `false` | Enable debug logging and stack traces |
| `--no-color` | `false` | Disable colored output |
| `--log-level <level>` | `silent` | Logging verbosity: `silent`, `error`, `warn`, `info`, `verbose`, `debug` |

---

## `jobby details`

Get detailed information about a specific job posting.

```
jobby details [id-or-url] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `id-or-url` | LinkedIn job ID or posting URL (auto-detects format) |

### Identification

| Option | Description |
|--------|-------------|
| `--url <url>` | Explicitly specify a LinkedIn job posting URL |
| `--id <id>` | Explicitly specify a LinkedIn job ID |

You can provide the job identifier as a positional argument, named option, or via stdin. The CLI auto-detects whether the input is a URL or numeric ID.

### Output

| Option | Default | Description |
|--------|---------|-------------|
| `--format <type>` | `json` | Output format: `json`, `xml`, `yaml`, `csv`, `rawHtml` |
| `--file <path>` | — | Write output to a file instead of stdout |
| `--pretty` | `false` | Pretty-print the output |

### Debug

| Option | Default | Description |
|--------|---------|-------------|
| `--debug` | `false` | Enable debug logging and stack traces |
| `--no-color` | `false` | Disable colored output |
| `--log-level <level>` | `silent` | Logging verbosity: `silent`, `error`, `warn`, `info`, `verbose`, `debug` |

---

## `jobby ui`

Launch an interactive terminal UI for browsing jobs. The TUI provides search, pagination, detail browsing, a filter editor, and keyboard navigation.

```
jobby ui [keyword] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `keyword` | Initial search keyword (optional, can also use `--keyword`) |

### Initial Filters

All filter options set the starting filter values in the UI. They can be changed interactively once the UI is running.

| Option | Values | Description |
|--------|--------|-------------|
| `--keyword <string>` | Any string | Initial keyword filter |
| `--location <string>` | Any string | Initial location filter |
| `--job-type <type>` | `full-time`, `part-time`, `contract`, `temporary`, `volunteer`, `internship`, `other` | Initial job type filter |
| `--experience-level <level>` | `internship`, `entry-level`, `associate`, `senior`, `director`, `executive` | Initial experience level filter |
| `--minimum-salary <salary>` | `40,000` through `200,000` | Initial minimum salary filter |
| `--workplace-type <type>` | `on-site`, `remote`, `hybrid` | Initial workplace type filter |
| `--listing-age <age>` | `past-24-hours`, `past-week`, `past-month` | Initial listing age filter |
| `--easy-apply-only` | Boolean flag | Initial easy apply filter |
| `--under-10-applicants` | Boolean flag | Initial under 10 applicants filter |

### Keyboard Shortcuts

**List view:**

| Key | Action |
|-----|--------|
| `/` | Focus search input |
| `Enter` | View job details |
| `f` | Open filter editor |
| `s` | Open settings |
| Arrow up/down | Move selection |
| Arrow left/right | Previous/next page |
| `l` | Toggle log panel |
| `q` | Quit |

**Detail view:**

| Key | Action |
|-----|--------|
| `Esc` | Back to list |
| Arrow up/down | Scroll |
| Arrow left/right | Previous/next job |
| `l` | Toggle log panel |
| `q` | Quit |
