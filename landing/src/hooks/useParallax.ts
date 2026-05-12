import { useRef, useState, useEffect, useCallback } from 'react';

export interface ParallaxState { x: number; y: number; }

export function useParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState<ParallaxState>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const handleMove = useCallback((e: MouseEvent) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = ((e.clientX - left) / width)  * 2 - 1;
      const y = ((e.clientY - top)  / height) * 2 - 1;
      setParallax({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMove]);

  return { containerRef, parallax };
}
