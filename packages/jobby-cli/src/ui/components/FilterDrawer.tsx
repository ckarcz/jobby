import React from 'react';
import { Box, Text } from 'ink';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { useFilterDraft } from '../hooks/useFilterDraft.js';
import { useFilterKeyboard } from '../hooks/useFilterKeyboard.js';
import { getSelected, getTextValue } from '../state/filterHelpers.js';
import { FilterSection } from './FilterSection.js';
import { FocusableBox } from './FocusableBox.js';
import { icons } from '../theme.js';

/** Animated filter drawer panel. */
export function FilterDrawer(): React.ReactElement {
  const focused = usePanelFocus('filters');
  const [draft, draftDispatch] = useFilterDraft();
  useFilterKeyboard(draft, draftDispatch);

  return (
    <FocusableBox
      panel="filters"
      flexDirection="column"
      borderStyle="single"
      paddingX={1}
      overflow="hidden"
    >
      <Box marginBottom={1}>
        <Text bold>{icons.cog} Filters</Text>
      </Box>
      <Box flexDirection="column" marginTop={-draft.scrollOffset}>
        {draft.sections.map((section, i) => {
          const isFocused = focused && i === draft.activeSectionIndex;
          const marginBottom = i < draft.sections.length - 1 ? 1 : 0;

          if (section.type === 'text') {
            return (
              <Box key={section.key} flexDirection="column" marginBottom={marginBottom}>
                <FilterSection
                  title={section.title}
                  type="text"
                  textValue={getTextValue(draft.selections, section.key)}
                  focused={isFocused}
                  onTextChange={(value) => { draftDispatch({ type: 'SET_TEXT', key: section.key, value }); }}
                  maxLength={section.maxLength}
                />
              </Box>
            );
          }

          return (
            <Box key={section.key} flexDirection="column" marginBottom={marginBottom}>
              <FilterSection
                title={section.title}
                type={section.type}
                options={section.options}
                selected={getSelected(draft.selections, section.key)}
                focused={isFocused}
                cursorIndex={draft.cursorIndexes[i] ?? 0}
              />
            </Box>
          );
        })}
      </Box>
    </FocusableBox>
  );
}
