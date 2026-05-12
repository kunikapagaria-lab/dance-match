import type { ParallaxState } from '../hooks/useParallax';

interface Props { parallax: ParallaxState; }

export default function CharacterFrame({ parallax }: Props) {
  const tx = parallax.x * -14;
  const ty = parallax.y * -6;
  const ry = parallax.x * 4;
  const rx = parallax.y * -3;

  return (
    <div
      className="absolute inset-0"
      style={{
        zIndex: 3,
        border: '1.5px solid var(--accent)',
        boxShadow: `
          0 0 0 1px var(--glow-soft),
          0 0 40px var(--glow-soft),
          inset 0 50px 60px -30px rgba(0,0,0,0.85)
        `,
        transform: `translate3d(${tx}px, ${ty}px, 0) rotateY(${ry}deg) rotateX(${rx}deg)`,
        transition: 'transform 60ms linear',
      }}
    >
      {/* Corner accent brackets */}
      {(['tl','tr','bl','br'] as const).map(pos => (
        <span key={pos} className="absolute pointer-events-none" style={{
          width: 20, height: 20,
          top:    pos.includes('t') ? -2  : 'auto',
          bottom: pos.includes('b') ? -2  : 'auto',
          left:   pos.includes('l') ? -2  : 'auto',
          right:  pos.includes('r') ? -2  : 'auto',
          borderTop:    pos.includes('t') ? '2px solid var(--accent)' : 'none',
          borderBottom: pos.includes('b') ? '2px solid var(--accent)' : 'none',
          borderLeft:   pos.includes('l') ? '2px solid var(--accent)' : 'none',
          borderRight:  pos.includes('r') ? '2px solid var(--accent)' : 'none',
          boxShadow: '0 0 10px var(--glow)',
        }} />
      ))}
    </div>
  );
}
