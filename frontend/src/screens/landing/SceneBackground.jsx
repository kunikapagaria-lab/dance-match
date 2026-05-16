import { useEffect, useRef, useState, useMemo } from 'react';

const STAR_COUNT = 180;

function makeStars() {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.2 + 0.4,
    depth: Math.random() * 0.75 + 0.15,   // 0.15 = far (moves little), 0.9 = close (moves a lot)
    opacity: Math.random() * 0.6 + 0.3,
    glow: Math.random() * 8 + 3,
    twinkleDuration: Math.random() * 3 + 2,
    twinkleDelay: Math.random() * 4,
  }));
}

export default function SceneBackground() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const stars = useMemo(makeStars, []);

  useEffect(() => {
    const onMove = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
      background: '#06010f',
    }}>
      {/* Deep space purple glow — right side */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 70% at 80% 35%, rgba(109,40,217,0.35) 0%, transparent 65%),
          radial-gradient(ellipse 40% 50% at 20% 70%, rgba(88,28,235,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 50% 100%, rgba(76,29,149,0.25) 0%, transparent 50%)
        `,
      }} />

      {/* Glowing parallax stars */}
      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: var(--op); transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: calc(var(--op) * 0.4); transform: translate(-50%, -50%) scale(0.7); }
        }
      `}</style>

      {stars.map(star => {
        const dx = mouse.x * star.depth * 28;
        const dy = mouse.y * star.depth * 28;
        return (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              left: `calc(${star.x}% + ${dx}px)`,
              top:  `calc(${star.y}% + ${dy}px)`,
              width:  star.size,
              height: star.size,
              borderRadius: '50%',
              background: '#d8b4fe',
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 ${star.glow}px ${star.glow * 0.6}px rgba(192,132,252,0.7), 0 0 ${star.glow * 2}px rgba(139,92,246,0.3)`,
              '--op': star.opacity,
              animation: `star-twinkle ${star.twinkleDuration}s ${star.twinkleDelay}s ease-in-out infinite`,
              transition: 'left 0.15s ease-out, top 0.15s ease-out',
              willChange: 'left, top',
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Subtle vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
      }} />
    </div>
  );
}
