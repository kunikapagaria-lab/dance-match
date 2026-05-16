import { useMemo } from 'react';

const R   = 80;                        // hex radius
const W   = R * Math.sqrt(3);          // ~138.6  column step
const ROW_H = R * 1.5;                 // 120     row step (pointy-top offset)
const SVG_W = 1440;
const SVG_H = 960;
const COLS  = Math.ceil(SVG_W / W) + 2;
const ROWS  = Math.ceil(SVG_H / ROW_H) + 2;

// Glow sources matching the reference image
const SOURCES = [
  { x: SVG_W * 0.68, y: SVG_H * 0.04, r:  50, g: 180, b: 255, range: 620 }, // top-right  — blue/cyan
  { x: SVG_W * 0.08, y: SVG_H * 0.82, r: 185, g:   0, b: 255, range: 580 }, // bottom-left — purple
];

function hexPath(cx, cy) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6; // pointy-top
    return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join('L')}Z`;
}

function computeGlow(cx, cy) {
  let totalR = 0, totalG = 0, totalB = 0, strength = 0;
  for (const s of SOURCES) {
    const d = Math.hypot(cx - s.x, cy - s.y);
    const t = Math.max(0, 1 - d / s.range);
    const w = t * t;
    totalR += s.r * w;
    totalG += s.g * w;
    totalB += s.b * w;
    strength += w;
  }
  const opacity = Math.min(0.95, strength * 1.6 + 0.04);
  const color   = `rgb(${Math.round(Math.min(255, totalR))},${Math.round(Math.min(255, totalG))},${Math.round(Math.min(255, totalB))})`;
  return { color, opacity, bright: strength > 0.35 };
}

export default function SceneBackground() {
  const { dim, bright } = useMemo(() => {
    const dim = [], bright = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = col * W + (row % 2 === 1 ? W / 2 : 0);
        const cy = row * ROW_H;
        const { color, opacity, bright: isBright } = computeGlow(cx, cy);
        const hex = { id: `${row}-${col}`, d: hexPath(cx, cy), color, opacity };
        (isBright ? bright : dim).push(hex);
      }
    }
    return { dim, bright };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', background: '#07070e' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Soft glow filter for bright hexagons */}
          <filter id="hglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dim hexagons — no filter for performance */}
        <g strokeWidth="1.2" fill="none">
          {dim.map(h => (
            <path key={h.id} d={h.d} stroke={h.color} strokeOpacity={h.opacity} />
          ))}
        </g>

        {/* Bright hexagons — with glow filter */}
        <g strokeWidth="1.5" fill="none" filter="url(#hglow)">
          {bright.map(h => (
            <path key={h.id} d={h.d} stroke={h.color} strokeOpacity={h.opacity} />
          ))}
        </g>
      </svg>
    </div>
  );
}
