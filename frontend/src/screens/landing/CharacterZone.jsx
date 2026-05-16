import { FALLBACK_GLB } from '../../data/avatars.js';

function SwapArrow({ dir, onClick }) {
  const isLeft = dir === 'left';
  return (
    <button
      aria-label={isLeft ? 'Previous avatar' : 'Next avatar'}
      onClick={onClick}
      style={{
        position: 'fixed', top: '50%', zIndex: 50,
        [isLeft ? 'left' : 'right']: 0,
        transform: 'translateY(-50%)',
        width: 48, height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer', outline: 'none',
        opacity: 0,
        transition: 'opacity 250ms ease, background 250ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.background = 'rgba(0,0,0,0.35)';
        e.currentTarget.style.boxShadow = isLeft
          ? '4px 0 24px var(--glow-soft)'
          : '-4px 0 24px var(--glow-soft)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = '0';
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <svg width={18} height={18} viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
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
            filter: `hue-rotate(${avatar.hueShift}deg) ${avatar.filterExtra || ''} drop-shadow(0 0 20px var(--glow)) drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(-4px 0 12px var(--glow-soft))`,
          }}
        />
      </div>

      <SwapArrow dir="left"  onClick={() => onSwap(-1)} />
      <SwapArrow dir="right" onClick={() => onSwap(1)} />
    </div>
  );
}
