import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { useTextInputRegistration } from '../state/context.js';
import { glyphs, colors } from '../theme.js';

interface FilterTextInputProps {
  value: string;
  focused: boolean;
  onChange: (value: string) => void;
}

/** Renders a text input field for free-form filter values. */
export const FilterTextInput = React.memo(function FilterTextInput({ value, focused, onChange }: FilterTextInputProps): React.ReactElement {
  // Register that a text input is active when this filter section is focused
  useTextInputRegistration(focused);

  if (focused) {
    return (
      <Box>
        <Text color={colors.focus}>{glyphs.arrowRight}</Text>
        <TextInput
          defaultValue={value}
          placeholder="(none)"
          onChange={onChange}
        />
      </Box>
    );
  }

  return (
    <Box paddingLeft={1}>
      <Text dimColor>{value || '(none)'}</Text>
    </Box>
  );
});
