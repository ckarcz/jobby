import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

/** Shape returned by tool handlers, matching the MCP SDK's CallToolResult. */
interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

/** Signature of a registerTool callback captured from mock calls. */
type ToolHandler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<ToolResult>;

/** A single registerTool mock call: [name, config, handler]. */
type RegisterToolCall = [name: string, config: Record<string, unknown>, handler: ToolHandler];

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const mockServer = {
    connect: vi.fn(),
    registerTool: vi.fn(),
  };
  return {
    McpServer: vi.fn(function () { return mockServer; }),
  };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(function () { return {}; }),
}));

vi.spyOn(console, 'error').mockImplementation(() => {});

const { mockSearch, mockGetDetailsByUrl, mockGetDetailsById } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockGetDetailsByUrl: vi.fn(),
  mockGetDetailsById: vi.fn(),
}));

vi.mock('jobby-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jobby-client')>();
  return {
    ...actual,
    JobbyClient: vi.fn(function () {
      return {
        jobs: {
          queryForJobs: mockSearch,
          queryForJobDetailsByUrl: mockGetDetailsByUrl,
          queryForJobDetailsById: mockGetDetailsById,
        },
      };
    }),
    JobbyError: class JobbyError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
  };
});

import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { JobbyClient } from 'jobby-client';
import { JobbyError, ErrorType } from 'jobby-client';
import { createServer, main } from './server.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

/**
 * Tests for the MCP server that exposes Jobby job search and detail
 * retrieval as callable tools, verifying tool registration, parameter passing,
 * and error handling for the Model Context Protocol integration.
 */

describe('Jobby MCP Server - tool registration and call handling', () => {
  let searchJobsHandler: ToolHandler;
  let getJobDetailsHandler: ToolHandler;
  let registerToolCalls: RegisterToolCall[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockReset();
    mockGetDetailsByUrl.mockReset();
    mockGetDetailsById.mockReset();

    createServer();

    const serverInstance = (McpServer as unknown as Mock).mock.results[0]?.value as { registerTool: Mock };
    registerToolCalls = serverInstance.registerTool.mock.calls as RegisterToolCall[];

    for (const call of registerToolCalls) {
      if (call[0] === 'search_jobs') {
        searchJobsHandler = call[2];
      } else if (call[0] === 'get_job_details') {
        getJobDetailsHandler = call[2];
      }
    }
  });

  describe('Tool registration', () => {
    it('should register 2 tools', () => {
      expect(registerToolCalls.length).toBe(2);
    });

    it('should create server with name "jobby-mcp"', () => {
      const constructorCall = (McpServer as unknown as Mock).mock.calls[0] as [Record<string, unknown>];
      expect(constructorCall[0].name).toBe('jobby-mcp');
    });

    it('should create server with version from package.json', () => {
      const constructorCall = (McpServer as unknown as Mock).mock.calls[0] as [Record<string, unknown>];
      expect(constructorCall[0].version).toBe(packageJson.version);
    });

    it('should register search_jobs tool with correct config', () => {
      const searchCall = registerToolCalls.find((c) => c[0] === 'search_jobs');

      expect(searchCall).toBeDefined();
      expect(searchCall[1].description).toContain('Search for jobs');
      expect(searchCall[1].inputSchema).toBeDefined();
      expect(searchCall[1].inputSchema.keyword).toBeDefined();
      expect(searchCall[1].inputSchema.location).toBeDefined();
      expect(searchCall[1].inputSchema.jobType).toBeDefined();
    });

    it('should register get_job_details tool with correct config', () => {
      const detailsCall = registerToolCalls.find((c) => c[0] === 'get_job_details');

      expect(detailsCall).toBeDefined();
      expect(detailsCall[1].description).toContain('Requires at least one of jobUrl or jobId');
      expect(detailsCall[1].inputSchema).toBeDefined();
      expect(detailsCall[1].inputSchema.jobUrl).toBeDefined();
      expect(detailsCall[1].inputSchema.jobId).toBeDefined();
    });
  });

  describe('search_jobs handler', () => {
    it('should call search with provided parameters', async () => {
      const mockResponse = {
        results: [{ summary: { company: { name: 'Test' }, position: 'Developer' } }],
        pagination: { start: 0, resultsCount: 1 },
      };
      mockSearch.mockResolvedValueOnce(mockResponse);

      const result = await searchJobsHandler({
        keyword: 'TypeScript',
        location: 'Remote',
        jobType: 'full-time',
      }, {});

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'TypeScript',
          location: 'Remote',
          jobType: 'full-time',
        }),
        expect.any(Object)
      );
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test');
    });

    it('should include pagination parameters', async () => {
      mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

      await searchJobsHandler({
        keyword: 'Python',
        start: 25,
        skip: 5,
        take: 10,
      }, {});

      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          start: 25,
          skip: 5,
          take: 10,
        })
      );
    });

    it('should handle empty object args (no filters or pagination)', async () => {
      mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

      const result = await searchJobsHandler({}, {});

      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should pass undefined pagination values through when not provided', async () => {
      mockSearch.mockResolvedValueOnce({ results: [], pagination: {} });

      await searchJobsHandler({ keyword: 'Java' }, {});

      const paginationArg = mockSearch.mock.calls[0][1];
      expect(paginationArg.start).toBeUndefined();
      expect(paginationArg.skip).toBeUndefined();
      expect(paginationArg.take).toBeUndefined();
    });
  });

  describe('get_job_details handler', () => {
    it('should call queryForJobDetailsByUrl with jobUrl', async () => {
      const mockDetails = { summary: { position: 'Developer', company: { name: 'Test Corp' } }, details: {} };
      mockGetDetailsByUrl.mockResolvedValueOnce(mockDetails);

      const result = await getJobDetailsHandler({
        jobUrl: 'https://linkedin.com/jobs/view/123',
      }, {});

      expect(mockGetDetailsByUrl).toHaveBeenCalledWith('https://linkedin.com/jobs/view/123');
      expect(result.content[0].text).toContain('Developer');
      expect(result.content[0].text).toContain('Test Corp');
    });

    it('should call queryForJobDetailsById with jobId', async () => {
      const mockDetails = { summary: { position: 'Developer', company: { name: 'Test Corp' } }, details: {} };
      mockGetDetailsById.mockResolvedValueOnce(mockDetails);

      const result = await getJobDetailsHandler({
        jobId: '123',
      }, {});

      expect(mockGetDetailsById).toHaveBeenCalledWith('123');
      expect(result.content[0].text).toContain('Developer');
      expect(result.content[0].text).toContain('Test Corp');
    });

    it('should prefer jobUrl over jobId when both provided', async () => {
      const mockDetails = { summary: { position: 'Developer', company: { name: 'Test Corp' } }, details: {} };
      mockGetDetailsByUrl.mockResolvedValueOnce(mockDetails);

      await getJobDetailsHandler({
        jobUrl: 'https://linkedin.com/jobs/view/123',
        jobId: '123',
      }, {});

      expect(mockGetDetailsByUrl).toHaveBeenCalledWith('https://linkedin.com/jobs/view/123');
      expect(mockGetDetailsById).not.toHaveBeenCalled();
    });

    it('should include benefitsInfo and incentiveInfo in response', async () => {
      const mockDetails = {
        id: '123',
        summary: { position: 'Developer', company: { name: 'Test Corp' } },
        details: {
          description: 'desc',
          benefitsInfo: 'Benefits Eligible: Yes',
          incentiveInfo: 'Bonus Eligible: Yes',
        },
      };
      mockGetDetailsByUrl.mockResolvedValueOnce(mockDetails);

      const result = await getJobDetailsHandler({
        jobUrl: 'https://linkedin.com/jobs/view/123',
      }, {});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.details.benefitsInfo).toBe('Benefits Eligible: Yes');
      expect(parsed.details.incentiveInfo).toBe('Bonus Eligible: Yes');
    });

    it('should return isError when neither jobUrl nor jobId provided (safeParse rejects)', async () => {
      const result = await getJobDetailsHandler({}, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid input');
    });
  });

  describe('search_jobs error handling', () => {
    it('should handle JobbyError', async () => {
      const error = new JobbyError(ErrorType.RateLimit, 'Rate limited');
      mockSearch.mockRejectedValueOnce(error);

      const result = await searchJobsHandler({
        keyword: 'Test',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[RateLimit]');
      expect(result.content[0].text).toContain('Rate limited');
    });

    it('should handle generic Error', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchJobsHandler({
        keyword: 'Test',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });

    it('should handle non-Error throws', async () => {
      mockSearch.mockRejectedValueOnce('String error');

      const result = await searchJobsHandler({
        keyword: 'Test',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('String error');
    });
  });

  describe('get_job_details error handling', () => {
    it('should handle JobbyError in get_job_details', async () => {
      const error = new JobbyError(ErrorType.RateLimit, 'Rate limited');
      mockGetDetailsByUrl.mockRejectedValueOnce(error);

      const result = await getJobDetailsHandler({
        jobUrl: 'https://linkedin.com/jobs/view/123',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[RateLimit]');
      expect(result.content[0].text).toContain('Rate limited');
    });

    it('should handle generic Error in get_job_details', async () => {
      mockGetDetailsById.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await getJobDetailsHandler({
        jobId: '123',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Connection refused');
    });

    it('should handle non-Error throws in get_job_details', async () => {
      mockGetDetailsByUrl.mockRejectedValueOnce(42);

      const result = await getJobDetailsHandler({
        jobUrl: 'https://linkedin.com/jobs/view/123',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('42');
    });
  });

  describe('search_jobs schema validation via server handler', () => {
    it('should reject invalid jobType in search_jobs', async () => {
      const result = await searchJobsHandler({ jobType: 'invalid-type' }, {});
      expect(result.isError).toBe(true);
    });

    it('should reject non-string keyword', async () => {
      const result = await searchJobsHandler({ keyword: 123 }, {});
      expect(result.isError).toBe(true);
    });

    it('should reject non-string location', async () => {
      const result = await searchJobsHandler({ location: 456 }, {});
      expect(result.isError).toBe(true);
    });

    it('should reject non-number start', async () => {
      const result = await searchJobsHandler({ start: 'abc' }, {});
      expect(result.isError).toBe(true);
    });
  });

  describe('get_job_details schema validation via server handler', () => {
    it('should reject non-string jobUrl', async () => {
      const result = await getJobDetailsHandler({ jobUrl: 123 }, {});
      expect(result.isError).toBe(true);
    });

    it('should reject non-string jobId', async () => {
      const result = await getJobDetailsHandler({ jobId: true }, {});
      expect(result.isError).toBe(true);
    });

    it('should reject empty string jobId (min length 1)', async () => {
      const result = await getJobDetailsHandler({ jobId: '' }, {});
      expect(result.isError).toBe(true);
    });
  });
});

describe('createServer - dependency injection', () => {
  it('should accept an injected client', () => {
    const customClient = { jobs: {} } as unknown as JobbyClient;
    const server = createServer(customClient);
    expect(server).toBeDefined();
  });
});

describe('main - MCP server startup', () => {
  it('should create server, connect transport, and log startup message', async () => {
    vi.clearAllMocks();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await main();

    expect(McpServer).toHaveBeenCalled();
    expect(StdioServerTransport).toHaveBeenCalled();

    const serverInstance = (McpServer as unknown as Mock).mock.results[0]?.value as { connect: Mock };
    expect(serverInstance.connect).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(`Jobby MCP server v${packageJson.version} started.`);

    errorSpy.mockRestore();
  });
});
