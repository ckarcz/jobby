import React, { useRef, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ScrollList, type ScrollListRef } from 'ink-scroll-list';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { useFilterDraft } from '../hooks/useFilterDraft.js';
import { useFilterKeyboard } from '../hooks/useFilterKeyboard.js';
import { useAppState } from '../state/context.js';
import { getSelected, getTextValue } from '../state/filterHelpers.js';
import { FilterSection } from './FilterSection.js';
import { icons } from '../theme.js';

/** Filter drawer panel with scrollable content. */
export function FilterDrawer(): React.ReactElement {
  const focused = usePanelFocus('filters');
  const [draft, draftDispatch] = useFilterDraft();
  useFilterKeyboard(draft, draftDispatch);

  const { maxHeight } = useAppState();
  const scrollRef = useRef<ScrollListRef>(null);

  // Remeasure on terminal resize
  useEffect(() => {
    scrollRef.current?.remeasure();
  }, [maxHeight]);

  return (
    <>
      <Box marginBottom={1}>
        <Text bold>{icons.cog} Filters</Text>
      </Box>
      <ScrollList ref={scrollRef} selectedIndex={draft.activeSectionIndex} flexGrow={1} paddingBottom={1} overflow="hidden">
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
      </ScrollList>
    </>
  );
}
