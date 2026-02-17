export const glyphs = {
  bullet: '•',
  arrow: '▶',
  arrowRight: '▸',
  check: '✔',
  cross: '✘',
  star: '★',
  dash: '─',
  verticalLine: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  tee: '├',
  ellipsis: '…',
  checkboxOff: '[ ]',
  checkboxOn: '[✓]',
  radioOff: '( )',
  radioOn: '(◉)',
  cursor: '▸',
};

export const colors = {
  focus: 'cyan',
  unfocused: 'gray',
} as const;

/** Returns the border color for a focused or unfocused panel. */
export function borderColor(focused: boolean): string {
  return focused ? colors.focus : colors.unfocused;
}

export const icons = {
  search: '🔍',
  briefcase: '💼',
  location: '📍',
  company: '🏢',
  money: '💰',
  clock: '🕒',
  person: '👤',
  rocket: '🚀',
  wrench: '🔧',
  cog: '⚙️',
  page: '📄',
  star: '⭐',
  lightning: '⚡',
  link: '🔗',
  crying: '😿',
};
