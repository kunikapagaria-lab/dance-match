import { useMemo } from 'react';
import { useGame } from '../App.jsx';
import { AVATARS } from '../data/avatars.js';

export default function NeonBackground() {
  const { gameState } = useGame();
  const palette = gameState.palette || AVATARS[0].palette;

  const buildings = useMemo(() => [
    { x: 0,   w: 90,  h: 80  }, { x: 100, w: 60,  h: 120 }, { x: 170, w: 80,  h: 60  },
    { x: 260, w: 50,  h: 150 }, { x: 320, w: 130, h: 100 }, { x: 460, w: 70,  h: 80  },
    { x: 540, w: 100, h: 130 }, { x: 650, w: 60,  h: 90  }, { x: 720, w: 110, h: 110 },
    { x: 840, w: 80,  h: 70  }, { x: 930, w: 120, h: 140 }, { x:1060, w: 70,  h: 95  },
    { x:1140, w: 100, h: 120 }, { x:1250, w: 90,  h: 150 }, { x:1350, w: 90,  h: 85  },
  ], []);

  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      left:  `${(i * 5.13 + 3) % 100}%`,
      top:   `${(i * 4.77 + 7) % 75}%`,
      size:  1 + (i % 3),
      delay: `${(i * 0.5) % 5}s`,
      dur:   `${4 + (i % 3)}s`,
    })), []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Base gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 90% 70% at 60% 30%, ${palette.base2} 0%, ${palette.base} 100%)`,
        transition: 'background 600ms ease',
      }} />

      {/* City silhouette */}
      <svg viewBox="0 0 1440 180" style={{ position: 'absolute', bottom: 0, width: '100%', height: 180 }} preserveAspectRatio="none">
        {buildings.map((b, i) => (
          <rect key={i} x={b.x} y={180 - b.h} width={b.w} height={b.h} fill={palette.base2} opacity={0.9} />
        ))}
      </svg>

      {/* Floor grid */}
      <div style={{
        position: 'absolute', bottom: 0, left: '-20%', right: '-20%', height: '35%',
        backgroundImage: `linear-gradient(${palette.accent}22 1px, transparent 1px), linear-gradient(90deg, ${palette.accent}22 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        transform: 'perspective(700px) rotateX(70deg)',
        transformOrigin: 'bottom',
      }} />

      {/* Horizon glow */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '33%', height: 1,
        background: palette.accent, opacity: 0.5,
        boxShadow: `0 0 30px 6px ${palette.glow}`,
      }} />

      {/* Particles */}
      {particles.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', borderRadius: '50%',
          left: p.left, top: p.top, width: p.size, height: p.size,
          background: palette.accent, boxShadow: `0 0 6px ${palette.accent}`,
          animation: `particle-float ${p.dur} ${p.delay} ease-in-out infinite`,
          opacity: 0.5,
        }} />
      ))}

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.85) 100%)',
      }} />
    </div>
  );
}
