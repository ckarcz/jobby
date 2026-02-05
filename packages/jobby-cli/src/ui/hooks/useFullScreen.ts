import { useEffect } from 'react';
import { useAppDispatch } from '../state/context.js';

/** Tracks terminal resize events and updates state dimensions. */
export function useFullScreen(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onResize = (): void => {
      dispatch({
        type: 'SET_TERMINAL_SIZE',
        width: process.stdout.columns,
        height: process.stdout.rows,
      });
    };

    process.stdout.on('resize', onResize);

    return (): void => {
      process.stdout.removeListener('resize', onResize);
    };
  }, [dispatch]);
}
