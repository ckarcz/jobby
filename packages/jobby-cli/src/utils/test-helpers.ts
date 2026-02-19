import { vi } from 'vitest';

export async function createJobbyMock(): Promise<Record<string, unknown>> {
  const actual = await vi.importActual<Record<string, unknown>>('jobby-client');

  const mockSearch = vi.fn();
  const mockGetDetails = vi.fn();
  const mockSearchRaw = vi.fn();
  const mockGetDetailsRaw = vi.fn();
  const mockGetDetailsById = vi.fn();
  const mockGetDetailsRawById = vi.fn();

  return {
    ...actual,
    JobbyClient: vi.fn().mockImplementation(() => ({
      jobs: {
        queryForJobs: mockSearch,
        queryForJobDetailsByUrl: mockGetDetails,
        queryForJobDetailsById: mockGetDetailsById,
        queryForJobsRawHtml: mockSearchRaw,
        queryForJobDetailsRawHtmlByUrl: mockGetDetailsRaw,
        queryForJobDetailsRawHtmlById: mockGetDetailsRawById,
      },
    })),
  };
}
