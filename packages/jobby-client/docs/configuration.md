# Configuration

## Client Options

Pass a `ClientConfig` object when creating the client:

```typescript
import { JobbyClient } from 'jobby-client';

const client = new JobbyClient({
  timeout: 15_000,
  logging: {
    level: 'info',
  },
});
```

## Options Reference

### `timeout`

HTTP request timeout in milliseconds.

- **Type:** `number`
- **Default:** `10000` (10 seconds)

### `baseUrl`

Override the LinkedIn base URL. Useful for testing.

- **Type:** `string`
- **Default:** `'www.linkedin.com'`

Can also be set via the `LINKEDIN_JOBS_BASE_URL` environment variable.

### `userAgent`

Custom User-Agent header. If not set, a random browser user-agent is used per request.

- **Type:** `string`
- **Default:** Random user-agent

### `logging`

Controls log output.

- **Type:** `LoggingConfig`
- **Default:** `{ level: 'error' }`

| Property | Type | Description |
|----------|------|-------------|
| `level` | `LogLevel` | Log level: `'silent'`, `'error'`, `'warn'`, `'info'`, `'verbose'`, `'debug'` |
| `file` | `LogFileConfig` | Optional file logging configuration |

#### File Logging

```typescript
const client = new JobbyClient({
  logging: {
    level: 'debug',
    file: {
      path: './jobby.log',
      level: 'debug',
    },
  },
});
```

### `signal`

An `AbortSignal` for cancelling requests.

- **Type:** `AbortSignal`
- **Default:** `undefined`

```typescript
const controller = new AbortController();

const client = new JobbyClient({
  signal: controller.signal,
});

// Cancel all pending requests
controller.abort();
```

## Environment Variables

| Variable | Overrides | Description |
|----------|-----------|-------------|
| `LINKEDIN_JOBS_BASE_URL` | `baseUrl` | LinkedIn base URL |
| `LINKEDIN_JOBS_TIMEOUT` | `timeout` | Request timeout in milliseconds |
