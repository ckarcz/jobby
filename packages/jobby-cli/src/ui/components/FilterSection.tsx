import React from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
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
          <Box key={option} paddingLeft={1}>
            <Text {...(isCursor ? { color: colors.focus } : {})}>
              {isCursor ? glyphs.cursor : ' '} {marker} {option}
            </Text>
          </Box>
        );
      })}
    </>
  );
}

/** Renders a text input field. */
function TextFilterInput({ textValue, focused, onTextChange }: TextFilterSectionProps): React.ReactElement {
  return (
    <Box paddingLeft={1}>
      {focused ? (
        <TextInput defaultValue={textValue} onChange={onTextChange} />
      ) : (
        <Text dimColor>{textValue || '(none)'}</Text>
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
