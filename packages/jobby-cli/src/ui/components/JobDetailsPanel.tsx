import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Newline, Text } from 'ink';
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
  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="space-between">
      <Box flexDirection="column" flexShrink={0}>
        <Text bold>{jobDetails.summary.position ?? 'Unknown position'}</Text>
        <Text>{icons.company} {jobDetails.summary.company.name ?? 'Unknown company'}</Text>
        <Text>{icons.location} {jobDetails.summary.location}</Text>
        {jobDetails.details.employmentType && <Text>{icons.briefcase} {jobDetails.details.employmentType}</Text>}
        {jobDetails.details.workplaceType && <Text>{icons.location} {jobDetails.details.workplaceType}</Text>}
        {jobDetails.details.seniorityLevel && <Text>{icons.star} {jobDetails.details.seniorityLevel}</Text>}
        {jobDetails.details.applicants && <Text>{icons.person} {jobDetails.details.applicants}</Text>}
        {jobDetails.details.industry && <Text>{icons.company} {jobDetails.details.industry}</Text>}
        {jobDetails.details.jobFunction && <Text>{icons.wrench} {jobDetails.details.jobFunction}</Text>}
        {jobDetails.details.experienceRequired && <Text>{icons.person} Experience: {jobDetails.details.experienceRequired}</Text>}
        {jobDetails.details.educationRequired && <Text>{icons.page} Education: {jobDetails.details.educationRequired}</Text>}
        {jobDetails.details.salary && <Text color="green">{icons.money} {jobDetails.details.salary}</Text>}
        {jobDetails.details.benefitsInfo && <Text>{icons.star} {jobDetails.details.benefitsInfo}</Text>}
      </Box>
      <Newline />
      <Box flexDirection="column" flexGrow={1}>
        <ScrollView ref={scrollRef}>
          {descriptionLines.map((line, i) => (
            <Text key={`desc-${String(i)}`}>{line || ' '}</Text>
          ))}
        </ScrollView>
      </Box>
      <Newline />
      <Box flexDirection="column" flexShrink={0} alignItems="center">
        {jobDetails.posted.ago && <Text dimColor>{jobDetails.posted.ago}</Text>}
        <Text dimColor>{jobDetails.url}</Text>
      </Box>
    </Box>
  );
}
