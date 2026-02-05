# Usage Examples

## Basic Search

```bash
# Search by keyword
jobby search "software engineer"

# Search with location
jobby search "data scientist" --location "Austin, TX"

# Pretty-printed output
jobby search "DevOps" --pretty
```

## Filtered Search

```bash
# Remote full-time senior positions
jobby search "React" \
  --job-type full-time \
  --experience-level senior \
  --workplace-type remote \
  --pretty

# High-salary positions posted recently
jobby search "machine learning" \
  --minimum-salary 160,000 \
  --listing-age past-week \
  --pretty

# Easy Apply with few applicants
jobby search "product manager" \
  --easy-apply-only \
  --under-10-applicants \
  --pretty
```

## Pagination

```bash
# Get the first 5 results
jobby search "Python" --take 5

# Start from offset 25 (second page)
jobby search "Python" --start 25 --take 5
```

## Output Formats

```bash
# JSON (default)
jobby search "Go" --format json --pretty

# CSV for spreadsheet import
jobby search "Go" --format csv --file jobs.csv

# YAML
jobby search "Go" --format yaml

# XML
jobby search "Go" --format xml --pretty
```

## Job Details

```bash
# By job ID
jobby details 4195018826 --pretty

# By URL
jobby details "https://www.linkedin.com/jobs/view/4195018826" --pretty

# Using named options
jobby details --id 4195018826 --pretty
jobby details --url "https://www.linkedin.com/jobs/view/4195018826" --pretty
```

## Piped Input

```bash
# Pipe keyword to search
echo "TypeScript" | jobby search

# Pipe job ID to details
echo "4195018826" | jobby details

# Chain search and details
jobby search "React" --format json | jq -r '.results[0].jobId' | jobby details --pretty
```

## File Output

```bash
# Save results to a file
jobby search "Java" --file results.json --pretty

# Export to CSV
jobby search "Java" --format csv --file results.csv
```

## Interactive UI

```bash
# Launch with no filters
jobby ui
```

## Debug Mode

```bash
# Enable debug logging
jobby search "Rust" --debug

# Verbose logging
jobby search "Rust" --log-level verbose

# See the raw HTML response
jobby search "Rust" --format rawHtml
```
