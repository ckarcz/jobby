import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { useSearchState, useSelectionState, useJobDetailsState, useLayoutState } from '../state/context.js';
import { useDetailsKeyboard } from '../hooks/useDetailsKeyboard.js';
import { icons } from '../theme.js';

const md = new Marked(markedTerminal());

/** Render a markdown string to ANSI-styled terminal text. */
function renderMarkdown(source: string): string {
  // The client's htmlToMarkdown uses <br> tags instead of \n for line breaks.
  // Normalize back to \n so marked can parse headings, lists, etc. correctly.
  const normalized = source.replace(/<br>/gi, '\n');
  const result = md.parse(normalized, { async: false });
  return result.trim();
}

/** Panel displaying job details for the currently selected search result. */
export function JobDetailsPanel(): React.ReactElement {
  const { totalResults } = useSearchState();
  const { selectedJobIndex } = useSelectionState();
  const { jobDetails, jobDetailsStatus, jobDetailsError } = useJobDetailsState();
  const { terminalWidth, terminalHeight } = useLayoutState();
  const scrollRef = useRef<ScrollViewRef>(null);

  const selectedJob = totalResults[selectedJobIndex] ?? null;

  useDetailsKeyboard(scrollRef);

  // Reset scroll when selected job changes
  useEffect(() => {
    scrollRef.current?.scrollToTop();
  }, [selectedJob?.id]);

  // Remeasure on terminal resize
  useEffect(() => {
    scrollRef.current?.remeasure();
  }, [terminalWidth, terminalHeight]);

  // Pre-render markdown description to ANSI text, then split into lines for ScrollView children
  const descriptionLines = useMemo(() => {
    if (jobDetailsStatus !== 'loaded' || !jobDetails?.details.description) {
      return [];
    }
    const rendered = renderMarkdown(jobDetails.details.description);
    return rendered.split('\n');
  }, [jobDetailsStatus, jobDetails]);

  // No job selected
  if (!selectedJob) {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No job selected</Text>
      </Box>
    );
  }

  // Loading or idle (no details yet)
  if (jobDetailsStatus === 'loading' || jobDetailsStatus === 'idle') {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Spinner label="Loading details..." />
      </Box>
    );
  }

  // Error
  if (jobDetailsStatus === 'error') {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Text color="red">{jobDetailsError ?? 'Failed to load details'}</Text>
      </Box>
    );
  }

  // Loaded — jobDetails is guaranteed non-null after loading/idle/error guards above
  if (!jobDetails) {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No details available</Text>
      </Box>
    );
  }

  const { details: d, summary, url, posted } = jobDetails;
  const company = summary.company.name ?? 'Unknown company';

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden">
      {/* Fixed metadata zone */}
      <Box flexDirection="column" flexShrink={0}>
        <Text bold>{summary.position ?? 'Unknown position'}</Text>
        <Text>{icons.company} {company}</Text>
        {d.location && <Text>{icons.location} {d.location}</Text>}
        {url && <Text dimColor>{icons.link} {url}</Text>}
        <Text dimColor>{'─'.repeat(40)}</Text>
        {d.employmentType && <Text>{icons.briefcase} {d.employmentType}</Text>}
        {d.workplaceType && <Text>{icons.location} {d.workplaceType}</Text>}
        {d.seniorityLevel && <Text>{icons.star} {d.seniorityLevel}</Text>}
        {d.applicants && <Text>{icons.person} {d.applicants}</Text>}
        {d.industry && <Text>{icons.company} {d.industry}</Text>}
        {d.jobFunction && <Text>{icons.wrench} {d.jobFunction}</Text>}
        {d.experienceRequired && <Text>{icons.person} Experience: {d.experienceRequired}</Text>}
        {d.educationRequired && <Text>{icons.page} Education: {d.educationRequired}</Text>}
        {d.salary && <Text color="green">{icons.money} {d.salary}</Text>}
        {d.benefitsInfo && <Text>{icons.star} {d.benefitsInfo}</Text>}
        {posted.ago && <Text dimColor>{icons.clock} {posted.ago}</Text>}
        {descriptionLines.length > 0 && <Text dimColor>{'─'.repeat(40)}</Text>}
      </Box>

      {/* Scrollable description zone */}
      {descriptionLines.length > 0 && (
        <ScrollView ref={scrollRef} flexGrow={1} overflow="hidden">
          {descriptionLines.map((line, i) => (
            <Text key={`desc-${String(i)}`}>{line || ' '}</Text>
          ))}
        </ScrollView>
      )}
    </Box>
  );
}
