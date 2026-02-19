import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  const mockServer = {
    connect: vi.fn(),
    registerTool: vi.fn(),
  };
  return {
    McpServer: vi.fn(() => mockServer),
  };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.spyOn(console, 'error').mockImplementation(() => {});

const mockSearch = vi.fn();
const mockGetDetailsByUrl = vi.fn();
const mockGetDetailsById = vi.fn();

vi.mock('jobby-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jobby-client')>();
  return {
    ...actual,
    JobbyClient: vi.fn(() => ({
      jobs: {
        queryForJobs: mockSearch,
        queryForJobDetailsByUrl: mockGetDetailsByUrl,
        queryForJobDetailsById: mockGetDetailsById,
      },
    })),
    JobbyError: class JobbyError extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  };
});

/**
 * Tests for the MCP server that exposes Jobby job search and detail
 * retrieval as callable tools, verifying tool registration, parameter passing,
 * and error handling for the Model Context Protocol integration.
 */

describe('Jobby MCP Server - tool registration and call handling', () => {
  let searchJobsHandler: (args: any, extra: any) => Promise<any>;
  let getJobDetailsHandler: (args: any, extra: any) => Promise<any>;
  let registerToolCalls: any[];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSearch.mockReset();
    mockGetDetailsByUrl.mockReset();
    mockGetDetailsById.mockReset();

    vi.resetModules();

    const { createServer } = await import('./server.js');
    createServer();

    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const serverInstance = (McpServer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    registerToolCalls = serverInstance.registerTool.mock.calls;

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

    it('should create server with name "jobby-mcp"', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
      const constructorCall = (McpServer as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(constructorCall[0].name).toBe('jobby-mcp');
    });

    it('should create server with version from package.json', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
      const constructorCall = (McpServer as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(constructorCall[0].version).toBe('1.0.0');
    });

    it('should register search_jobs tool with correct config', () => {
      const searchCall = registerToolCalls.find((c: any) => c[0] === 'search_jobs');

      expect(searchCall).toBeDefined();
      expect(searchCall[1].description).toContain('Search for jobs');
      expect(searchCall[1].inputSchema).toBeDefined();
      expect(searchCall[1].inputSchema.keyword).toBeDefined();
      expect(searchCall[1].inputSchema.location).toBeDefined();
      expect(searchCall[1].inputSchema.jobType).toBeDefined();
    });

    it('should register get_job_details tool with correct config', () => {
      const detailsCall = registerToolCalls.find((c: any) => c[0] === 'get_job_details');

      expect(detailsCall).toBeDefined();
      expect(detailsCall[1].description).toContain('Get detailed information');
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

    it('should throw ZodError when neither jobUrl nor jobId provided (refine rejects at schema level)', async () => {
      await expect(async () => {
        await getJobDetailsHandler({}, {});
      }).rejects.toThrow();
    });
  });

  describe('search_jobs error handling', () => {
    it('should handle JobbyError', async () => {
      const { JobbyError } = await import('jobby-client');
      const error = new JobbyError('Rate limited', 'E_RATE_LIMIT');
      mockSearch.mockRejectedValueOnce(error);

      const result = await searchJobsHandler({
        keyword: 'Test',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('E_RATE_LIMIT');
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
      const { JobbyError } = await import('jobby-client');
      const error = new JobbyError('Rate limited', 'E_RATE_LIMIT');
      mockGetDetailsByUrl.mockRejectedValueOnce(error);

      const result = await getJobDetailsHandler({
        jobUrl: 'https://linkedin.com/jobs/view/123',
      }, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('E_RATE_LIMIT');
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
      await expect(async () => {
        await searchJobsHandler({ jobType: 'invalid-type' }, {});
      }).rejects.toThrow();
    });

    it('should reject non-string keyword', async () => {
      await expect(async () => {
        await searchJobsHandler({ keyword: 123 }, {});
      }).rejects.toThrow();
    });

    it('should reject non-string location', async () => {
      await expect(async () => {
        await searchJobsHandler({ location: 456 }, {});
      }).rejects.toThrow();
    });

    it('should reject non-number start', async () => {
      await expect(async () => {
        await searchJobsHandler({ start: 'abc' }, {});
      }).rejects.toThrow();
    });
  });

  describe('get_job_details schema validation via server handler', () => {
    it('should reject non-string jobUrl', async () => {
      await expect(async () => {
        await getJobDetailsHandler({ jobUrl: 123 }, {});
      }).rejects.toThrow();
    });

    it('should reject non-string jobId', async () => {
      await expect(async () => {
        await getJobDetailsHandler({ jobId: true }, {});
      }).rejects.toThrow();
    });

    it('should reject empty string jobId (min length 1)', async () => {
      await expect(async () => {
        await getJobDetailsHandler({ jobId: '' }, {});
      }).rejects.toThrow();
    });
  });
});

describe('main - MCP server startup', () => {
  it('should create server, connect transport, and log startup message', async () => {
    vi.resetModules();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { main } = await import('./server.js');
    await main();

    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');

    expect(McpServer).toHaveBeenCalled();
    expect(StdioServerTransport).toHaveBeenCalled();

    const serverInstance = (McpServer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(serverInstance.connect).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Jobby MCP server started.');

    errorSpy.mockRestore();
  });
});
