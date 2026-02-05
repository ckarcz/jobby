# API Analysis Process

This project depends on LinkedIn's **undocumented guest job search API**. Since LinkedIn can change this API at any time without notice, we maintain a structured analysis process to detect changes and keep the client library accurate.

## The Analysis Document

The [LinkedIn Job Search API Analysis](../../../docs/linkedin-jobs-query-analysis.md) is a comprehensive document that catalogs:

- Every filter available in LinkedIn's job search UI and its query parameter name/values
- Which filters are **confirmed working** vs. **non-functional** in the guest API
- The testing methodology used to verify each filter (baseline comparison across multiple pages)
- The full HTML response structure and all extractable fields with Cheerio selectors
- Fields that are NOT present in search results (only available on detail pages)
- Authentication behavior (the guest API is completely auth-unaware)

## The Job Details Analysis Document

The [LinkedIn Job Details Page Analysis](../../../docs/linkedin-job-details-analysis.md) is a comprehensive document that catalogs:

- Every extractable data field from LinkedIn job listing detail pages
- JSON-LD structured data fields (schema.org JobPosting) and the Zod validation schema
- DOM-scraped fields with CSS selectors and fallback chains
- Meta tags (Open Graph, Twitter Cards) used for data extraction
- The dual extraction strategy: JSON-LD priority with DOM fallback
- Fields only available from one source (JSON-LD or DOM)
- Remaining extraction gaps and their priority

### Re-running the Job Details Analysis

The analysis document is designed to be used as a **prompt input for an AI agent** to re-run the same systematic inspection process. The procedure is:

1. **Provide the analysis document** as context/prompt input to an AI agent with web access
2. The agent follows the documented methodology:
   - Fetches several job listing detail pages via their public URLs
   - Extracts and examines all JSON-LD blocks, meta tags, and DOM elements
   - Compares observed fields against the document
3. The agent **updates the analysis document** with:
   - New timestamp for when the analysis was performed
   - Any changes to JSON-LD fields or DOM selectors
   - Any new extractable fields discovered
   - Any changes to the page HTML structure
4. Review the updated document for changes that require code updates

## Re-running the Search Analysis

The analysis document is designed to be used as a **prompt input for an AI agent** to re-run the same systematic testing process. The procedure is:

1. **Provide the analysis document** as context/prompt input to an AI agent with web access
2. The agent follows the documented methodology:
   - Establishes baseline results (no filters) across multiple pages
   - Tests every filter parameter and value independently
   - Compares filtered results against the baseline to determine working status
   - Inspects the HTML response structure for any changes to selectors or fields
3. The agent **updates the analysis document** with:
   - New timestamp for when the analysis was performed
   - Any changes to filter working status
   - Any new filters or parameters discovered in the UI
   - Any changes to the HTML response structure or extractable fields
4. Review the updated document for changes that require code updates

## When to Re-run

- Periodically (e.g. monthly) to catch silent API changes
- When users report unexpected behavior (missing results, broken filters, parsing errors)
- When LinkedIn's job search UI visibly changes (new filters, redesigned layout)

## How Changes Flow Into Code

When the analysis reveals changes, updates may be needed across all three packages:

### Client Library (`jobby-client`)

The client is the most directly affected since it owns the API integration:

- **New/removed filters** — update the query parameter maps, Zod schemas, and search builder methods in `src/`
- **Changed parameter values** — update the enum maps (e.g. `jobTypeMap`, `experienceLevelMap`)
- **HTML structure changes** — update the Cheerio selectors in the search results parser and job details scraper
- **New/removed response fields** — update the response types, search parser, and job details extraction

### CLI (`jobby-cli`)

After client library updates:

- **New/removed filters** — add or remove corresponding CLI flags and options
- **New/removed response fields** — update output formatting for all formats (JSON, CSV, YAML, XML)

### MCP Server (`jobby-mcp`)

After client library updates:

- **New/removed filters** — add or remove corresponding MCP tool input parameters and their Zod schemas
- **New/removed response fields** — update tool response formatting
