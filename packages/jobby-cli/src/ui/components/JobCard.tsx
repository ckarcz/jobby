import React from 'react';
import { Box, Text } from 'ink';
import type { Job } from 'jobby-client';
import { borderColor, icons } from '../theme.js';
import Link from 'ink-link';

interface JobCardProps {
  job: Job;
  focused: boolean;
}

export const JOBCARD_HEIGHT = 5; // top border, three content rows, bottom border

/** Compact bordered card displaying a single job listing. */
export const JobCard = React.memo(function JobCard({ job, focused }: JobCardProps): React.ReactElement {
  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={borderColor(focused)}
        paddingX={1}
        flexGrow={1}
      >
        {/* Row 1: Position */}
        <Box height={1} gap={2}>
          <Text bold color={'white'}>
            {job.summary.position ?? 'Unknown position'}
          </Text>
        </Box>

        {/* Row 2: Company, Location, Salary */}
        <Box height={1} gap={2}>
          <Text>
            {icons.company} {job.summary.company.name ?? '(Unknown company)'}
          </Text>
          <Text>
            {icons.location} {job.summary.location ?? '(Unknown location)'}
          </Text>
          {job.summary.salary ? (
            <Text color="green">
              {icons.money} {job.summary.salary}
            </Text>
          ) : null}
        </Box>

        {/* Row 3: Posted time, Job URL */}
        <Box height={1} gap={2}>
          {job.posted.ago ? (
            <Text dimColor>
              {icons.clock} {job.posted.ago}
            </Text>
          ) : null}
          {job.url ? (
            <Box gap={1}>
              <Text>{icons.link}</Text>
              <Link url={job.url}>Listing</Link>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
});
