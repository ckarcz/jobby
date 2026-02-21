import React from 'react';
import { Box, Text } from 'ink';
import { glyphs, colors } from '../theme.js';

interface FilterCheckboxInputProps {
  options: string[];
  selected: string[];
  focused: boolean;
  cursorIndex: number;
}

/** Renders a checkbox option list for multi-select filter sections. */
export const FilterCheckboxInput = React.memo(function FilterCheckboxInput({ options, selected, focused, cursorIndex }: FilterCheckboxInputProps): React.ReactElement {
  return (
    <>
      {options.map((option, i) => {
        const isSelected = selected.includes(option);
        const isCursor = focused && i === cursorIndex;
        const marker = isSelected ? glyphs.checkboxOn : glyphs.checkboxOff;

        return (
          <Box key={option}>
            <Text {...(isCursor ? { color: colors.focus } : {})}>
              {isCursor ? glyphs.arrowRight : ' '}{marker} {option}
            </Text>
          </Box>
        );
      })}
    </>
  );
});
