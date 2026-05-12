import { useRef, useState, useEffect, useCallback } from 'react';

export function useParallax() {
  const containerRef = useRef(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const handleMove = useCallback((e) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((e.clientX - left) / width)  * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((e.clientY - top)  / height) * 2 - 1));
      setParallax({ x, y });
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
