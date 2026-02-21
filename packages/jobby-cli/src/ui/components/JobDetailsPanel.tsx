import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Box, Text, type DOMElement } from 'ink';
import { Spinner } from '@inkjs/ui';
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type { Job, JobDetails } from 'jobby-client';
import { useSearchState, useSelectionState, useJobDetailsState } from '../state/context.js';
import { useContainerHeight } from '../hooks/useContainerHeight.js';
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

interface ContentLine {
  key: string;
  element: React.ReactElement;
}

function buildSummaryLines(job: Job): ContentLine[] {
  const lines: ContentLine[] = [];

  lines.push({ key: 'position', element: <Text bold wrap="truncate">{job.summary.position ?? 'Unknown position'}</Text> });
  lines.push({ key: 'company', element: <Text wrap="truncate">{icons.company} {job.summary.company.name ?? 'Unknown company'}</Text> });

  if (job.summary.location) {
    lines.push({ key: 'location', element: <Text wrap="truncate">{icons.location} {job.summary.location}</Text> });
  }

  if (job.summary.salary) {
    lines.push({ key: 'salary', element: <Text color="green" wrap="truncate">{icons.money} {job.summary.salary}</Text> });
  }

  if (job.posted.ago) {
    lines.push({ key: 'posted', element: <Text dimColor wrap="truncate">{icons.clock} {job.posted.ago}</Text> });
  }

  if (job.url) {
    lines.push({ key: 'url', element: <Text dimColor wrap="truncate">{icons.link} {job.url}</Text> });
  }

  return lines;
}

function buildDetailsMetadataLines(details: JobDetails): ContentLine[] {
  const lines: ContentLine[] = [];
  const d = details.details;

  lines.push({ key: 'detail-sep', element: <Text dimColor>{'─'.repeat(40)}</Text> });

  if (d.employmentType) {
    lines.push({ key: 'empType', element: <Text wrap="truncate">{icons.briefcase} {d.employmentType}</Text> });
  }

  if (d.workplaceType) {
    lines.push({ key: 'workplace', element: <Text wrap="truncate">{icons.location} {d.workplaceType}</Text> });
  }

  if (d.seniorityLevel) {
    lines.push({ key: 'seniority', element: <Text wrap="truncate">{icons.star} {d.seniorityLevel}</Text> });
  }

  if (d.applicants) {
    lines.push({ key: 'applicants', element: <Text wrap="truncate">{icons.person} {d.applicants}</Text> });
  }

  if (d.industry) {
    lines.push({ key: 'industry', element: <Text wrap="truncate">{icons.company} {d.industry}</Text> });
  }

  if (d.jobFunction) {
    lines.push({ key: 'function', element: <Text wrap="truncate">{icons.wrench} {d.jobFunction}</Text> });
  }

  if (d.experienceRequired) {
    lines.push({ key: 'experience', element: <Text wrap="truncate">{icons.person} Experience: {d.experienceRequired}</Text> });
  }

  if (d.educationRequired) {
    lines.push({ key: 'education', element: <Text wrap="truncate">{icons.page} Education: {d.educationRequired}</Text> });
  }

  if (d.salary) {
    const parts = [d.salary.currency, d.salary.min, '–', d.salary.max, d.salary.period ? `/ ${d.salary.period.toLowerCase()}` : ''].filter(Boolean);
    if (parts.length > 0) {
      lines.push({ key: 'detailSalary', element: <Text color="green" wrap="truncate">{icons.money} {parts.join(' ')}</Text> });
    }
  }

  if (d.benefitsInfo) {
    lines.push({ key: 'benefits', element: <Text wrap="truncate">{icons.star} {d.benefitsInfo}</Text> });
  }

  return lines;
}

/** Panel displaying job details for the currently selected search result. */
export function JobDetailsPanel(): React.ReactElement {
  const { totalResults } = useSearchState();
  const { selectedJobIndex } = useSelectionState();
  const { jobDetails, jobDetailsStatus, jobDetailsError } = useJobDetailsState();
  const containerRef = useRef<DOMElement>(null);
  const containerHeight = useContainerHeight(containerRef);
  const [scrollOffset, setScrollOffset] = useState(0);

  const selectedJob = totalResults[selectedJobIndex] ?? null;
  const description = jobDetailsStatus === 'loaded' && jobDetails ? jobDetails.details.description : null;

  // Pre-render markdown description to ANSI text, then split into lines for scrolling
  const descriptionLines = useMemo(() => {
    if (!description) {
      return [];
    }
    const rendered = renderMarkdown(description);
    return rendered.split('\n');
  }, [description]);

  // Memoize summary lines separately so they don't rebuild when details change
  const summaryLines = useMemo(() => {
    return selectedJob ? buildSummaryLines(selectedJob) : [];
  }, [selectedJob]);

  // Memoize metadata lines separately so they don't rebuild when summary changes
  const metadataLines = useMemo(() => {
    return jobDetailsStatus === 'loaded' && jobDetails ? buildDetailsMetadataLines(jobDetails) : [];
  }, [jobDetailsStatus, jobDetails]);

  // Build all content lines. Spinner/error rendered outside this array to avoid
  // the Spinner's ~80ms setInterval tick invalidating the entire memo.
  const allLines = useMemo(() => {
    const lines: ContentLine[] = [...summaryLines];

    if (jobDetailsStatus === 'error') {
      lines.push({ key: 'error-sep', element: <Text dimColor>{'─'.repeat(40)}</Text> });
      lines.push({ key: 'error', element: <Text color="red">{jobDetailsError ?? 'Failed to load details'}</Text> });
    }

    lines.push(...metadataLines);

    if (descriptionLines.length > 0) {
      lines.push({ key: 'desc-sep', element: <Text dimColor>{'─'.repeat(40)}</Text> });
      for (let i = 0; i < descriptionLines.length; i++) {
        const line = descriptionLines[i] ?? '';
        lines.push({ key: `desc-${String(i)}`, element: <Text>{line || ' '}</Text> });
      }
    }

    return lines;
  }, [summaryLines, metadataLines, jobDetailsStatus, jobDetailsError, descriptionLines]);
  const maxOffset = Math.max(0, allLines.length - Math.max(1, containerHeight));

  useDetailsKeyboard(scrollOffset, setScrollOffset, maxOffset);

  // Reset scroll when selected job changes
  useEffect(() => {
    setScrollOffset(0);
  }, [selectedJob?.id]);

  if (!selectedJob) {
    return (
      <Box ref={containerRef} flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No job selected</Text>
      </Box>
    );
  }

  // Reserve one line for the Spinner when loading so content lines don't shift
  const spinnerVisible = jobDetailsStatus === 'loading';
  const visibleCount = Math.max(1, spinnerVisible ? containerHeight - 1 : containerHeight);
  const visibleLines = allLines.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box ref={containerRef} flexDirection="column" flexGrow={1} overflow="hidden">
      {visibleLines.map((line) => (
        <Box key={line.key}>
          {line.element}
        </Box>
      ))}
      {spinnerVisible && <Spinner label="Loading details..." />}
    </Box>
  );
}
