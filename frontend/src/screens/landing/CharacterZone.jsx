import { FALLBACK_GLB } from '../../data/avatars.js';

function SwapArrow({ dir, onClick }) {
  const isLeft = dir === 'left';
  return (
    <button
      aria-label={isLeft ? 'Previous avatar' : 'Next avatar'}
      onClick={onClick}
      style={{
        position: 'absolute', top: '50%', zIndex: 20,
        transform: 'translateY(-50%)',
        [isLeft ? 'left' : 'right']: -24,
        width: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        border: '1.5px solid var(--accent)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer', outline: 'none',
        boxShadow: '0 0 12px var(--glow-soft)',
        transition: 'box-shadow 150ms, transform 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 24px var(--glow)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 12px var(--glow-soft)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
    >
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {isLeft ? <path d="M10 2L4 7l6 5" /> : <path d="M4 2l6 5-6 5" />}
      </svg>
    </button>
  );
}

function CharacterFrame({ parallax }) {
  const tx = parallax.x * -14, ty = parallax.y * -6;
  const ry = parallax.x * 4,   rx = parallax.y * -3;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 3,
      border: '1.5px solid var(--accent)',
      boxShadow: '0 0 0 1px var(--glow-soft), 0 0 40px var(--glow-soft), inset 0 50px 60px -30px rgba(0,0,0,0.85)',
      transform: `translate3d(${tx}px,${ty}px,0) rotateY(${ry}deg) rotateX(${rx}deg)`,
      transition: 'transform 60ms linear',
    }}>
      {['tl','tr','bl','br'].map(p => (
        <span key={p} style={{
          position: 'absolute', width: 20, height: 20,
          top:    p[0]==='t' ? -2 : 'auto', bottom: p[0]==='b' ? -2 : 'auto',
          left:   p[1]==='l' ? -2 : 'auto', right:  p[1]==='r' ? -2 : 'auto',
          borderTop:    p[0]==='t' ? '2px solid var(--accent)' : 'none',
          borderBottom: p[0]==='b' ? '2px solid var(--accent)' : 'none',
          borderLeft:   p[1]==='l' ? '2px solid var(--accent)' : 'none',
          borderRight:  p[1]==='r' ? '2px solid var(--accent)' : 'none',
          boxShadow: '0 0 10px var(--glow)',
        }} />
      ))}
    </div>
  );
}

export default function CharacterZone({ avatar, parallax, swapping, onSwap }) {
  const tx = parallax.x * 42, ty = parallax.y * 26;
  const ry = parallax.x * -4, rx = parallax.y * 3;
  const useFallback = avatar.glb.startsWith('/models/');

  return (
    <div style={{
      position: 'absolute', right: 56, top: '8%', bottom: '12%', width: '48%',
      perspective: '1400px', perspectiveOrigin: '50% 40%', zIndex: 10,
    }}>
      {/* Breakout glow above frame */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '-6%', height: '20%',
        background: 'radial-gradient(ellipse 60% 100% at 50% 100%, var(--glow), transparent 70%)',
        zIndex: 4, pointerEvents: 'none',
      }} />


      {/* Character — breaks above the frame */}
      <div className={swapping ? 'is-swapping' : ''} style={{
        position: 'absolute', inset: 0,
        height: '108%', marginTop: '-8%', zIndex: 5,
        transform: `translate3d(${tx}px,${ty}px,0) rotateY(${ry}deg) rotateX(${rx}deg)`,
        transition: 'transform 60ms linear',
      }}>
        <model-viewer
          src={useFallback ? FALLBACK_GLB : avatar.glb}
          alt={avatar.name}
          animation-name="Dance"
          autoplay=""
          auto-rotate=""
          camera-controls=""
          disable-zoom=""
          interaction-prompt="none"
          style={{
            width: '100%', height: '100%', background: 'transparent',
            filter: `hue-rotate(${avatar.hueShift}deg) drop-shadow(0 0 20px var(--glow)) drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(-4px 0 12px var(--glow-soft))`,
          }}
        />
      </div>

      <SwapArrow dir="left"  onClick={() => onSwap(-1)} />
      <SwapArrow dir="right" onClick={() => onSwap(1)} />
    </div>
  );
}
