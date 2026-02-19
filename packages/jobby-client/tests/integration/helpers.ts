import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

/** Reads a fixture file from the fixtures directory. */
export function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

interface FixtureServer {
  /** Base URL without protocol, e.g. "127.0.0.1:3456" — used for client.baseUrl */
  baseUrl: string;
  /** Full HTTP base URL, e.g. "http://127.0.0.1:3456" — used for direct URL tests */
  httpBaseUrl: string;
  /** Port number the server is listening on */
  port: number;
  server: Server;
  close: () => Promise<void>;
}

/**
 * Creates a local HTTP server that serves fixture HTML files.
 * Routes:
 *   GET /jobs-guest/jobs/api/seeMoreJobPostings/search?...  → job-search.html
 *   GET /jobs/view/:id                                      → job-details.html
 *   Everything else                                         → 404
 */
export async function createFixtureServer(): Promise<FixtureServer> {
  const searchHtml = readFixture('job-search.html');
  const detailsHtml = readFixture('job-details.html');

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);

    if (url.pathname.startsWith('/jobs-guest/jobs/api/seeMoreJobPostings/search')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(searchHtml);
    } else if (url.pathname.startsWith('/jobs/view/')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(detailsHtml);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
      const baseUrl = `127.0.0.1:${port}`;
      resolve({
        baseUrl,
        httpBaseUrl: `http://${baseUrl}`,
        port,
        server,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}
