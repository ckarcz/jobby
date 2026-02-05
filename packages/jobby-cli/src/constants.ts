/** Valid log level options for CLI output verbosity. */
export const logLevelChoices = ['silent', 'error', 'warn', 'info', 'verbose', 'debug'] as const;

/** Valid output format options for CLI commands. */
export const formatChoices = ['json', 'xml', 'yaml', 'csv', 'rawHtml'] as const;
