# Output Formats

The CLI supports five output formats via the `--format` option.

## JSON (default)

```bash
jobby search "React" --format json --pretty
```

```json
{
  "results": [
    {
      "jobId": "4195018826",
      "position": "React Developer",
      "company": "Acme Corp"
    }
  ]
}
```

Without `--pretty`, output is a single line of compact JSON.

## XML

```bash
jobby search "React" --format xml --pretty
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <results>
    <item>
      <jobId>4195018826</jobId>
      <position>React Developer</position>
      <company>Acme Corp</company>
    </item>
  </results>
</root>
```

Arrays are wrapped with `<item>` elements.

## YAML

```bash
jobby search "React" --format yaml
```

```yaml
results:
  - jobId: "4195018826"
    position: React Developer
    company: Acme Corp
```

## CSV

```bash
jobby search "React" --format csv
```

```csv
jobId,jobUrl,company,position,location,date,agoTime
4195018826,https://www.linkedin.com/jobs/view/4195018826,Acme Corp,React Developer,"New York, NY",2025-01-15,2 days ago
```

CSV output automatically flattens nested objects and auto-detects columns from the data.

## Raw HTML

```bash
jobby search "React" --format rawHtml
```

Returns the raw HTML response from LinkedIn without any parsing. Useful for debugging or custom parsing.

## Writing to a File

Any format can be written to a file instead of stdout:

```bash
jobby search "React" --format csv --file results.csv
jobby search "React" --format json --pretty --file results.json
```

## Syntax Highlighting

When writing to stdout (not a file), JSON and XML output is syntax-highlighted in terminals that support color. Use `--no-color` to disable this.
