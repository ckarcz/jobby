# Builder API

The `JobSearchBuilder` provides a fluent interface for building and executing job searches.

## Creating a Builder

```typescript
const builder = client.jobs.createSearch();
```

## Builder Methods

All methods return the builder instance for chaining.

### Search Filters

| Method | Parameter | Description |
|--------|-----------|-------------|
| `withKeyword(keyword)` | `string` | Job title, skill, or company name |
| `withLocation(location)` | `string` | City, state, or country |
| `withJobType(jobType)` | `JobType` | Employment type filter |
| `withExperience(level)` | `ExperienceLevel` | Experience level filter |
| `withMinSalary(salary)` | `MinimumSalary` | Minimum salary filter |
| `withWorkplaceType(type)` | `WorkplaceType` | Workplace arrangement filter |
| `withListingAge(age)` | `ListingAge` | How recently posted |
| `withUnder10Applications()` | — | Only jobs with under 10 applicants |

### Pagination

| Method | Parameter | Description |
|--------|-----------|-------------|
| `startResults(start)` | `number` | Starting offset |
| `skipResults(skip)` | `number` | Results to skip from response |
| `takeResults(take)` | `number` | Maximum results to return |
| `sortResults(sort)` | `string` | Sort order (deprecated) |

### Execution

| Method | Returns | Description |
|--------|---------|-------------|
| `execute()` | `Promise<SearchResponse<Job>>` | Execute the search |
| `getSearchParams()` | `JobSearchParams` | Get the built search params |
| `getPaginationParams()` | `PaginationParams` | Get the built pagination params |

## Examples

### Simple Search

```typescript
const response = await client.jobs
  .createSearch()
  .withKeyword('frontend developer')
  .execute();
```

### Fully Filtered Search

```typescript
const response = await client.jobs
  .createSearch()
  .withKeyword('React')
  .withLocation('New York')
  .withJobType('full-time')
  .withExperience('senior')
  .withMinSalary('140,000')
  .withWorkplaceType('remote')
  .withListingAge('past-week')
  .withUnder10Applications()
  .takeResults(20)
  .execute();
```

### Paginated Search

```typescript
const builder = client.jobs
  .createSearch()
  .withKeyword('Python')
  .takeResults(10);

// Page 1
const page1 = await builder.startResults(0).execute();

// Page 2
const page2 = await builder.startResults(25).execute();
```

### Inspect Parameters Without Executing

```typescript
const builder = client.jobs
  .createSearch()
  .withKeyword('Go')
  .withLocation('Austin');

console.log(builder.getSearchParams());
// { keyword: 'Go', location: 'Austin' }

console.log(builder.getPaginationParams());
// { start: 0 }
```
