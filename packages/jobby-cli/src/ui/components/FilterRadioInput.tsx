import React from 'react';
import { Box, Text } from 'ink';
import { glyphs, colors } from '../theme.js';

interface FilterRadioInputProps {
  options: readonly string[];
  selected: string[];
  focused: boolean;
  cursorIndex: number;
}

/** Renders a radio option list for single-select filter sections. */
export const FilterRadioInput = React.memo(function FilterRadioInput({ options, selected, focused, cursorIndex }: FilterRadioInputProps): React.ReactElement {
  return (
    <>
      {options.map((option, i) => {
        const isSelected = selected.includes(option);
        const isCursor = focused && i === cursorIndex;
        const marker = isSelected ? glyphs.radioOn : glyphs.radioOff;

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
