import { Box, Text } from 'ink';
import type { ReactNode, ReactElement } from 'react';

interface ModalProps {
  title?: string;
  children: ReactNode;
  isOpen: boolean;
}

export const Modal = ({ title, children, isOpen }: ModalProps): ReactElement | null => {
  if (!isOpen) { return null; }

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        borderColor="magenta"
        backgroundColor="black"
        borderStyle="round"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        {title && (
          <Box marginBottom={1}>
            <Text bold color="cyan">{title}</Text>
          </Box>
        )}
        <Box>{children}</Box>
      </Box>
    </Box>
  );
};
