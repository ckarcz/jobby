import React from 'react';
import { Box, type BoxProps } from 'ink';
import type { PanelId } from '../state/types.js';
import { usePanelFocus } from '../hooks/usePanelFocus.js';
import { borderColor } from '../theme.js';

interface FocusableBoxProps extends BoxProps {
  panel: PanelId;
  children: React.ReactNode;
}

/** Box wrapper that highlights its border when the given panel is focused. */
export function FocusableBox({ panel, children, ...boxProps }: FocusableBoxProps): React.ReactElement {
  const focused = usePanelFocus(panel);

  return (
    <Box {...boxProps} borderColor={borderColor(focused)}>
      {children}
    </Box>
  );
}
