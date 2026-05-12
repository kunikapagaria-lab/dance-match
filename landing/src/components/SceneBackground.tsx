import { useMemo } from 'react';
import type { ParallaxState } from '../hooks/useParallax';
import type { AvatarPalette } from '../data/avatars';

interface Props { parallax: ParallaxState; palette: AvatarPalette; }

function layer(x: number, y: number, px: ParallaxState) {
  return `translate3d(${px.x * x}px, ${px.y * y}px, 0)`;
}

/* ---------- SVG Skylines ---------- */
function FarSkyline({ accent }: { accent: string }) {
  const buildings = useMemo(() => [
    { x: 0,   w: 80,  h: 60  }, { x: 90,  w: 50,  h: 90  }, { x: 150, w: 70,  h: 45  },
    { x: 230, w: 40,  h: 110 }, { x: 280, w: 100, h: 70  }, { x: 390, w: 60,  h: 55  },
    { x: 460, w: 80,  h: 95  }, { x: 550, w: 50,  h: 75  }, { x: 610, w: 90,  h: 50  },
    { x: 710, w: 55,  h: 100 }, { x: 775, w: 70,  h: 65  }, { x: 855, w: 45,  h: 80  },
    { x: 910, w: 110, h: 55  }, { x:1030, w: 60,  h: 90  }, { x:1100, w: 80,  h: 70  },
    { x:1190, w: 50,  h: 100 }, { x:1250, w: 90,  h: 60  }, { x:1350, w: 80,  h: 85  },
  ], []);

  const windows = useMemo(() =>
    buildings.flatMap(b =>
      Array.from({ length: Math.floor(b.w * b.h / 1800) }, (_, i) => ({
        x: b.x + 6 + (i % 4) * (b.w / 4),
        y: 200 - b.h + 8 + Math.floor(i / 4) * 12,
        lit: Math.random() > 0.5,
      }))
    ), [buildings]);

  return (
    <svg viewBox="0 0 1440 200" className="absolute bottom-0 w-full" style={{ height: 200 }} preserveAspectRatio="none">
      {buildings.map((b, i) => (
        <rect key={i} x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="#0a0a0f" />
      ))}
      {windows.filter(w => w.lit).map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={3} height={3} fill={accent} opacity={0.6} />
      ))}
    </svg>
  );
}

function MidSkyline({ accent }: { accent: string }) {
  const buildings = useMemo(() => [
    { x: 0,   w: 120, h: 140 }, { x: 130, w: 70,  h: 180 }, { x: 210, w: 90,  h: 120 },
    { x: 310, w: 55,  h: 200 }, { x: 375, w: 140, h: 160 }, { x: 525, w: 80,  h: 140 },
    { x: 615, w: 100, h: 190 }, { x: 725, w: 65,  h: 150 }, { x: 800, w: 110, h: 170 },
    { x: 920, w: 75,  h: 130 }, { x:1005, w: 130, h: 175 }, { x:1145, w: 80,  h: 145 },
    { x:1235, w: 100, h: 160 }, { x:1345, w: 95,  h: 185 },
  ], []);

  const signs = useMemo(() =>
    buildings.filter((_, i) => i % 3 === 1).map(b => ({
      x: b.x + b.w * 0.1,
      y: 200 - b.h + 15,
      w: b.w * 0.8,
      h: 8,
    })), [buildings]);

  return (
    <svg viewBox="0 0 1440 200" className="absolute bottom-0 w-full" style={{ height: 200 }} preserveAspectRatio="none">
      {buildings.map((b, i) => (
        <rect key={i} x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="#06060a" />
      ))}
      {signs.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={accent} opacity={0.55} rx={1} />
      ))}
    </svg>
  );
}

/* ---------- Particles ---------- */
function Particles({ accent }: { accent: string }) {
  const pts = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => ({
      left: `${(i * 2.77 + 3) % 100}%`,
      top:  `${(i * 3.13 + 5) % 80}%`,
      size: 2 + (i % 3),
      delay: `${(i * 0.37) % 4}s`,
      dur:   `${3 + (i % 3)}s`,
    })), []);

  return (
    <>
      {pts.map((p, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none" style={{
          left: p.left, top: p.top,
          width: p.size, height: p.size,
          background: accent,
          boxShadow: `0 0 8px ${accent}`,
          animation: `particle-float ${p.dur} ${p.delay} ease-in-out infinite`,
          opacity: 0.7,
        }} />
      ))}
    </>
  );
}

/* ---------- Light streaks ---------- */
function Streaks({ accent }: { accent: string }) {
  const streaks = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      top: `${15 + i * 10}%`,
      height: 1 + (i % 2),
      delay: `${i * 1.3}s`,
      dur:   `${4 + i * 0.8}s`,
      width: `${120 + i * 40}px`,
    })), []);

  return (
    <>
      {streaks.map((s, i) => (
        <span key={i} className="streak-layer absolute pointer-events-none" style={{
          top: s.top, left: 0,
          width: s.width, height: s.height,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.55,
          animation: `streak ${s.dur} ${s.delay} linear infinite`,
        }} />
      ))}
    </>
  );
}

export default function SceneBackground({ parallax, palette }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>

      {/* Base wash */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 80% 60% at 70% 40%, ${palette.base2} 0%, ${palette.base} 100%)`,
        transition: 'background 600ms ease',
      }} />

      {/* Far skyline */}
      <div className="absolute inset-0" style={{ transform: layer(-8, -4, parallax) }}>
        <FarSkyline accent={palette.accent} />
      </div>

      {/* Mid skyline */}
      <div className="absolute inset-0" style={{ transform: layer(-18, -8, parallax) }}>
        <MidSkyline accent={palette.accent} />
      </div>

      {/* Horizon line */}
      <div className="absolute left-0 right-0" style={{
        bottom: '35%', height: 1,
        background: palette.accent,
        boxShadow: `0 0 40px 8px ${palette.glow}`,
        animation: 'horizon-glow 3s ease-in-out infinite',
        opacity: 0.6,
      }} />

      {/* Floor grid */}
      <div className="absolute" style={{
        bottom: 0, left: '-20%', right: '-20%', height: '40%',
        backgroundImage: `linear-gradient(${palette.accent}33 1px, transparent 1px), linear-gradient(90deg, ${palette.accent}33 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        transform: 'perspective(700px) rotateX(70deg)',
        transformOrigin: 'bottom',
      }} />

      {/* Light streaks */}
      <Streaks accent={palette.accent} />

      {/* Particles */}
      <div className="absolute inset-0" style={{ transform: layer(8, 6, parallax) }}>
        <Particles accent={palette.accent} />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)',
        zIndex: 2,
      }} />
    </div>
  );
}
