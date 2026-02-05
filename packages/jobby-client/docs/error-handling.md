# Error Handling

## Error Hierarchy

All errors thrown by the client extend `JobbyError`:

```
JobbyError
├── RateLimitError      (HTTP 429)
├── NetworkError        (Other HTTP errors)
├── ParsingError        (HTML/data parsing failures)
└── ValidationError     (Invalid parameters)
```

## Error Codes

```typescript
import { ErrorCode } from 'jobby-client';

ErrorCode.RATE_LIMIT   // 'RATE_LIMIT'
ErrorCode.NETWORK      // 'NETWORK'
ErrorCode.PARSE        // 'PARSE'
ErrorCode.VALIDATION   // 'VALIDATION'
```

## Error Properties

All `JobbyError` instances have:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `ErrorCode` | Error category |
| `message` | `string` | Human-readable error message |
| `isOperational` | `boolean` | `true` if the error is expected/recoverable |
| `retryable` | `boolean` | `true` if retrying might succeed |
| `originalError` | `Error` | The underlying error, if any |

## Error Types

### `RateLimitError`

Thrown when LinkedIn returns HTTP 429.

| Property | Type | Description |
|----------|------|-------------|
| `retryAfter` | `number` | Suggested wait time in seconds |

```typescript
try {
  await client.jobs.queryForJobs({ keyword: 'React' });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  }
}
```

### `NetworkError`

Thrown for HTTP errors other than 429 (e.g., 403, 500, timeouts).

```typescript
try {
  await client.jobs.queryForJobs({ keyword: 'React' });
} catch (error) {
  if (error instanceof NetworkError) {
    console.log(`Network error: ${error.message}`);
  }
}
```

### `ParsingError`

Thrown when the HTML response cannot be parsed into the expected structure.

### `ValidationError`

Thrown when search parameters fail Zod validation.

```typescript
try {
  await client.jobs.queryForJobs({ jobType: 'invalid' as any });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Invalid params: ${error.message}`);
  }
}
```

## Retryable Errors

The client does not automatically retry failed requests, but each error indicates whether retrying might succeed via the `retryable` property:

- `RateLimitError` — `retryable: true` (includes `retryAfter` with suggested wait time)
- `NetworkError` — `retryable: true`
- `ValidationError` — `retryable: false`
- `ParsingError` — `retryable: false`

You can implement your own retry logic by checking `error.retryable`:

```typescript
try {
  await client.jobs.queryForJobs({ keyword: 'React' });
} catch (error) {
  if (error instanceof JobbyError && error.retryable) {
    // Wait and retry
  }
}
```

## Catching All Errors

```typescript
import {
  JobbyError,
  RateLimitError,
  NetworkError,
  ParsingError,
  ValidationError,
} from 'jobby-client';

try {
  const response = await client.jobs.queryForJobs({ keyword: 'React' });
} catch (error) {
  if (error instanceof RateLimitError) {
    // Handle rate limiting
  } else if (error instanceof NetworkError) {
    // Handle network issues
  } else if (error instanceof ValidationError) {
    // Handle bad parameters
  } else if (error instanceof ParsingError) {
    // Handle parsing issues
  } else if (error instanceof JobbyError) {
    // Handle any other client error
  } else {
    // Unexpected error
    throw error;
  }
}
```
