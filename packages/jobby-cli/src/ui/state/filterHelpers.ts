import type { SearchFilters, CheckboxFilterKey, RadioFilterKey } from './filterTypes.js';

/** Get the selected values for a section from the draft selections. */
export function getSelected(selections: SearchFilters, key: keyof SearchFilters): string[] {
  const value = selections[key];
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value ? [value] : [];
  }
  return [];
}

/** Get text value for text-type sections. */
export function getTextValue(selections: SearchFilters, key: keyof SearchFilters): string {
  const value = selections[key];
  return typeof value === 'string' ? value : '';
}

/**
 * Toggle a checkbox option (add/remove from multi-select array).
 * Safe: option values come from CHOICES constants that define the valid values.
 */
export function toggleCheckboxOption(selections: SearchFilters, key: CheckboxFilterKey, option: string): SearchFilters {
  const current = getSelected(selections, key);
  const updated = current.includes(option)
    ? current.filter(v => v !== option)
    : [...current, option];
  return { ...selections, [key]: updated } as SearchFilters;
}

/**
 * Toggle a radio option (select or deselect a single-choice value).
 * Safe: option values come from CHOICES constants that define the valid values.
 */
export function toggleRadioOption(selections: SearchFilters, key: RadioFilterKey, option: string): SearchFilters {
  const current = selections[key];
  return { ...selections, [key]: current === option ? undefined : option } as SearchFilters;
}