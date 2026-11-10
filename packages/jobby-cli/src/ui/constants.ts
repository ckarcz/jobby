/** Width (in columns) of the filter drawer panel. */
export const FILTER_DRAWER_WIDTH = 22;

/**
 * Lines reserved for non-list content in the results panel.
 * Breakdown: 1 header + 2 border (top/bottom) + 1 footer + 1 padding = 5
 */
export const VIRTUAL_LIST_RESERVED_LINES = 5;

/** How long (ms) to show the "Fetched N jobs in Xs" duration banner. */
export const LOAD_DURATION_DISPLAY_MS = 2_000;

/** Debounce delay (ms) before fetching job details after selection changes. */
export const JOB_DETAILS_DEBOUNCE_MS = 300;

/** Width (in columns) of the company logo in the job details panel. Twice the height so it renders square. */
export const COMPANY_LOGO_WIDTH = 16;

/** Height (in rows) of the company logo in the job details panel. */
export const COMPANY_LOGO_HEIGHT = 8;
