import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { ScrollList, type ScrollListRef } from 'ink-scroll-list';
import {
  JOB_TYPE_CHOICES,
  EXPERIENCE_LEVEL_CHOICES,
  WORKPLACE_TYPE_CHOICES,
  MINIMUM_SALARY_CHOICES,
  LISTING_AGE_CHOICES,
} from 'jobby-client';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { useFilterDraft } from '../hooks/useFilterDraft.js';
import { useFilterKeyboard } from '../hooks/useFilterKeyboard.js';
import { useAppState } from '../state/context.js';
import { getSelected, getTextValue } from '../state/filterHelpers.js';
import { SECTION_ORDER } from '../state/filterTypes.js';
import { FilterSection } from './FilterSection.js';
import { FilterCheckboxInput } from './FilterCheckboxInput.js';
import { FilterRadioInput } from './FilterRadioInput.js';
import { FilterTextInput } from './FilterTextInput.js';
import { icons } from '../theme.js';
import type { FilterDrawerAction } from '../state/filterReducer.js';

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

  // Stable text change callbacks — each closes over its filter key and dispatches SET_FILTERS
  const draftDispatchRef = useRef<React.Dispatch<FilterDrawerAction>>(draftDispatch);
  draftDispatchRef.current = draftDispatch;

  const handleLocationChange = useCallback((value: string) => {
    draftDispatchRef.current({ type: 'SET_FILTERS', filters: { location: value } });
  }, []);

  const handleGeoIdChange = useCallback((value: string) => {
    draftDispatchRef.current({ type: 'SET_FILTERS', filters: { geoId: value } });
  }, []);

  const handleCompanyIdChange = useCallback((value: string) => {
    draftDispatchRef.current({ type: 'SET_FILTERS', filters: { companyId: value } });
  }, []);

  const { activeSection, cursors, selections } = draft;
  const selectedIndex = SECTION_ORDER.indexOf(activeSection);

  const sectionElements = useMemo(() => [
    <Box key="jobType" flexDirection="column" marginBottom={1}>
      <FilterSection title="Job Type" focused={focused && activeSection === 'jobType'}>
        <FilterCheckboxInput
          options={JOB_TYPE_CHOICES as string[]}
          selected={getSelected(selections, 'jobType')}
          focused={focused && activeSection === 'jobType'}
          cursorIndex={cursors.jobType}
        />
      </FilterSection>
    </Box>,
    <Box key="experienceLevel" flexDirection="column" marginBottom={1}>
      <FilterSection title="Experience Level" focused={focused && activeSection === 'experienceLevel'}>
        <FilterCheckboxInput
          options={EXPERIENCE_LEVEL_CHOICES as string[]}
          selected={getSelected(selections, 'experienceLevel')}
          focused={focused && activeSection === 'experienceLevel'}
          cursorIndex={cursors.experienceLevel}
        />
      </FilterSection>
    </Box>,
    <Box key="workplaceType" flexDirection="column" marginBottom={1}>
      <FilterSection title="Workplace Type" focused={focused && activeSection === 'workplaceType'}>
        <FilterCheckboxInput
          options={WORKPLACE_TYPE_CHOICES as string[]}
          selected={getSelected(selections, 'workplaceType')}
          focused={focused && activeSection === 'workplaceType'}
          cursorIndex={cursors.workplaceType}
        />
      </FilterSection>
    </Box>,
    <Box key="minimumSalary" flexDirection="column" marginBottom={1}>
      <FilterSection title="Minimum Salary" focused={focused && activeSection === 'minimumSalary'}>
        <FilterRadioInput
          options={MINIMUM_SALARY_CHOICES as string[]}
          selected={getSelected(selections, 'minimumSalary')}
          focused={focused && activeSection === 'minimumSalary'}
          cursorIndex={cursors.minimumSalary}
        />
      </FilterSection>
    </Box>,
    <Box key="listingAge" flexDirection="column" marginBottom={1}>
      <FilterSection title="Listing Age" focused={focused && activeSection === 'listingAge'}>
        <FilterRadioInput
          options={LISTING_AGE_CHOICES as string[]}
          selected={getSelected(selections, 'listingAge')}
          focused={focused && activeSection === 'listingAge'}
          cursorIndex={cursors.listingAge}
        />
      </FilterSection>
    </Box>,
    <Box key="location" flexDirection="column" marginBottom={1}>
      <FilterSection title="Location" focused={focused && activeSection === 'location'}>
        <FilterTextInput
          value={getTextValue(selections, 'location')}
          focused={focused && activeSection === 'location'}
          onChange={handleLocationChange}
        />
      </FilterSection>
    </Box>,
    <Box key="geoId" flexDirection="column" marginBottom={1}>
      <FilterSection title="Geo ID" focused={focused && activeSection === 'geoId'}>
        <FilterTextInput
          value={getTextValue(selections, 'geoId')}
          focused={focused && activeSection === 'geoId'}
          onChange={handleGeoIdChange}
        />
      </FilterSection>
    </Box>,
    <Box key="companyId" flexDirection="column">
      <FilterSection title="Company ID" focused={focused && activeSection === 'companyId'}>
        <FilterTextInput
          value={getTextValue(selections, 'companyId')}
          focused={focused && activeSection === 'companyId'}
          onChange={handleCompanyIdChange}
        />
      </FilterSection>
    </Box>,
  ], [activeSection, cursors, selections, focused, handleLocationChange, handleGeoIdChange, handleCompanyIdChange]);

  return (
    <>
      <Box marginBottom={1}>
        <Text bold>{icons.cog} Filters</Text>
      </Box>
      <ScrollList ref={scrollRef} selectedIndex={selectedIndex} flexGrow={1} paddingBottom={1} overflow="hidden">
        {sectionElements}
      </ScrollList>
    </>
  );
}
