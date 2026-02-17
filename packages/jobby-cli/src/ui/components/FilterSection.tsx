import React from 'react';
import { Box, Text, useInput } from 'ink';
import { glyphs, colors } from '../theme.js';

interface BaseProps {
  title: string;
  focused: boolean;
}

interface CheckboxFilterSectionProps extends BaseProps {
  type: 'checkbox';
  options: string[];
  selected: string[];
  cursorIndex: number;
}

interface RadioFilterSectionProps extends BaseProps {
  type: 'radio';
  options: string[];
  selected: string[];
  cursorIndex: number;
}

interface TextFilterSectionProps extends BaseProps {
  type: 'text';
  textValue: string;
  onTextChange: (value: string) => void;
  maxLength?: number | undefined;
}

type FilterSectionProps = CheckboxFilterSectionProps | RadioFilterSectionProps | TextFilterSectionProps;

/** Renders a checkbox or radio option list. */
function OptionsList({ type, options, selected, focused, cursorIndex }: CheckboxFilterSectionProps | RadioFilterSectionProps): React.ReactElement {
  return (
    <>
      {options.map((option, i) => {
        const isSelected = selected.includes(option);
        const isCursor = focused && i === cursorIndex;

        let marker: string;
        if (type === 'checkbox') {
          marker = isSelected ? glyphs.checkboxOn : glyphs.checkboxOff;
        } else {
          marker = isSelected ? glyphs.radioOn : glyphs.radioOff;
        }

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
}

/** Renders a controlled text input field with optional maxLength. */
function TextFilterInput({ textValue, focused, onTextChange, maxLength }: TextFilterSectionProps): React.ReactElement {
  useInput((input, key) => {
    if (!focused) {
      return;
    }

    if (key.return) {
      return;
    }

    if (key.backspace || key.delete) {
      onTextChange(textValue.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      if (maxLength !== undefined && textValue.length >= maxLength) {
        return;
      }
      const next = textValue + input;
      onTextChange(maxLength !== undefined ? next.slice(0, maxLength) : next);
    }
  });

  return (
    <Box>
      {focused ? (
        <>
          {textValue ? (
            <>
              <Text color={colors.focus}>{glyphs.arrowRight}</Text>
              <Text>{textValue}</Text>
            </>
          ) : (
            <>
              <Text color={colors.focus}>{glyphs.arrowRight}</Text>
              <Text dimColor>{textValue || '(none)'}</Text>
            </>
          )}
        </>
      ) : (
        <Box paddingLeft={1}>
          <Text dimColor>{textValue || '(none)'}</Text>
        </Box>
      )}
    </Box>
  );
}

/** A single filter section: checkbox list, radio list, or text input. */
export function FilterSection(props: FilterSectionProps): React.ReactElement {
  const { title, focused, type } = props;

  return (
    <Box flexDirection="column">
      <Text bold {...(focused ? { color: colors.focus } : {})}>
        {title}
      </Text>
      {type === 'text'
        ? <TextFilterInput {...props} />
        : <OptionsList {...props} />
      }
    </Box>
  );
}
