import { useEffect } from 'react';

export function useKeyboardSwap(onSwap: (dir: 1 | -1) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  onSwap(-1);
      if (e.key === 'ArrowRight') onSwap(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSwap]);
}
