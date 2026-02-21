import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme.js';

interface FilterSectionProps {
  title: string;
  focused: boolean;
  children: React.ReactNode;
}

/** Layout wrapper for a filter section: renders a title with focus styling and wraps content. */
export const FilterSection = React.memo(function FilterSection({ title, focused, children }: FilterSectionProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold {...(focused ? { color: colors.focus } : {})}>
        {title}
      </Text>
      {children}
    </Box>
  );
});
