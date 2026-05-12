import { useEffect } from 'react';

export function useKeyboardSwap(onSwap) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  onSwap(-1);
      if (e.key === 'ArrowRight') onSwap(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSwap]);
}
