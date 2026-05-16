import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATARS } from '../../data/avatars.js';
import { useParallax } from '../../hooks/useParallax.js';
import { useKeyboardSwap } from '../../hooks/useKeyboardSwap.js';
import { useGame } from '../../App.jsx';
import SceneBackground from './SceneBackground.jsx';
import CharacterZone from './CharacterZone.jsx';
import '../../styles/neon.css';

const S = {
  scene: (bg) => ({
    position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 1,
    background: bg, transition: 'background 600ms ease',
  }),
  header: {
    position: 'absolute', top: 32, left: 0, right: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 56px',
  },
  wordmark: {
    position: 'absolute', inset: 0, zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
  },
  hero: {
    position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)',
    width: '46%', maxWidth: 620, zIndex: 10,
  },
  eyebrow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  modeRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  bottomMeta: {
    position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 56px',
  },
  dot: { display: 'flex', alignItems: 'center', gap: 8 },
};

function ModeBox({ num, label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative',
      background: selected ? 'rgba(255,30,60,0.15)' : 'rgba(0,0,0,0.45)',
      border: `1.5px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.18)'}`,
      padding: '20px 26px', minWidth: 155,
      backdropFilter: 'blur(4px)',
      boxShadow: selected ? '0 0 32px var(--glow), inset 0 0 28px rgba(0,0,0,0.5)' : '0 0 8px rgba(0,0,0,0.4)',
      cursor: 'pointer', outline: 'none',
      transform: selected ? 'translateY(-4px)' : 'none',
      transition: 'all 250ms ease',
    }}>
      {['tl','tr','bl','br'].map(p => (
        <span key={p} style={{
          position: 'absolute', width: 10, height: 10,
          top: p[0]==='t' ? -1 : 'auto', bottom: p[0]==='b' ? -1 : 'auto',
          left: p[1]==='l' ? -1 : 'auto', right: p[1]==='r' ? -1 : 'auto',
          borderTop:    p[0]==='t' ? `2px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.25)'}` : 'none',
          borderBottom: p[0]==='b' ? `2px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.25)'}` : 'none',
          borderLeft:   p[1]==='l' ? `2px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.25)'}` : 'none',
          borderRight:  p[1]==='r' ? `2px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.25)'}` : 'none',
        }} />
      ))}
      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, fontSize: 11, letterSpacing: '0.3em', color: selected ? 'var(--accent)' : 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{num}</div>
      <div style={{ fontFamily: 'Audiowide,cursive', color: 'white', fontSize: 17 }}>{label}</div>
    </button>
  );
}

export default function LandingPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [swapping, setSwapping]   = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const { containerRef, parallax } = useParallax();
  const { setGameState } = useGame();
  const navigate = useNavigate();
  const avatar = AVATARS[activeIdx];
  const palette = avatar.palette;

  const cssVars = {
    '--accent':      palette.accent,
    '--accent-soft': palette.accentSoft,
    '--glow':        palette.glow,
    '--glow-soft':   palette.glowSoft,
    '--wordmark':    palette.wordmark,
    '--text':        palette.text,
  };

  const handleSwap = useCallback((dir) => {
    if (swapping) return;
    setSwapping(true);
    setTimeout(() => {
      setActiveIdx(i => (i + dir + AVATARS.length) % AVATARS.length);
      setTimeout(() => setSwapping(false), 50);
    }, 220);
  }, [swapping]);

  useKeyboardSwap(handleSwap);

  function handleStart() {
    setGameState(s => ({ ...s, palette, gameMode: selectedMode }));
    navigate(selectedMode === 'solo' ? '/solo-setup' : '/lobby');
  }

  const sw = swapping ? 'is-swapping' : 'is-entering';

  return (
    <div ref={containerRef} style={{ ...S.scene(palette.base), ...cssVars }}>

      <SceneBackground parallax={parallax} palette={palette} />


      {/* Header */}
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 12, height: 12, background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)', display: 'inline-block', transform: 'rotate(45deg)' }} />
          <span style={{ fontFamily: 'Audiowide,cursive', color: 'white', fontSize: 24, letterSpacing: '0.2em', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>DANCE·MATCH</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', display: 'inline-block', animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, letterSpacing: '0.3em', color: palette.text, opacity: 0.7 }}>SESSION · LIVE</span>
        </div>
      </header>

      {/* Hero text */}
      <div style={S.hero}>
        <div className={sw} style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, fontSize: 16, letterSpacing: '0.28em', opacity: 0.7, color: palette.text, marginBottom: 8 }}>{avatar.style}</div>
        <h1 className={`glow-text ${sw}`} style={{ fontFamily: 'Audiowide,cursive', fontSize: 'clamp(48px,8vw,100px)', lineHeight: 0.9, color: palette.text, margin: '0 0 16px' }}>{avatar.name}</h1>
        <p className={sw} style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 300, fontStyle: 'italic', fontSize: 18, maxWidth: 440, opacity: 0.78, color: palette.text, marginBottom: 4 }}>
          " {avatar.quote} "
        </p>
        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8, marginBottom: 28 }}>{avatar.tag}</p>

        <div style={S.modeRow}>
          <ModeBox num="01" label="SOLO"        selected={selectedMode === 'solo'}        onClick={() => setSelectedMode('solo')} />
          <ModeBox num="02" label="MULTIPLAYER" selected={selectedMode === 'multiplayer'} onClick={() => setSelectedMode('multiplayer')} />
        </div>

        <div style={{ minHeight: 64, display: 'flex', alignItems: 'center' }}>
          {selectedMode && (
            <button className="is-entering" onClick={handleStart} style={{
              fontFamily: 'Audiowide,cursive', color: 'black', fontSize: 13,
              letterSpacing: '0.22em', background: 'var(--accent)', padding: '18px 32px', border: 'none',
              clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
              boxShadow: '0 0 30px var(--glow), 0 0 80px var(--glow-soft)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'transform 200ms, box-shadow 200ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px var(--glow), 0 0 120px var(--glow-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = '';e.currentTarget.style.boxShadow = '0 0 30px var(--glow), 0 0 80px var(--glow-soft)'; }}
            >
              <span>START DANCING</span>
              <svg width={20} height={14} viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M0 7h14M13 1l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <CharacterZone avatar={avatar} parallax={parallax} swapping={swapping} onSwap={handleSwap} />

      {/* Bottom meta */}
      <div style={S.bottomMeta}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Audiowide,cursive', fontSize: 18, color: 'var(--accent)' }}>{String(activeIdx + 1).padStart(2,'0')}</span>
          <span style={{ fontFamily: 'Audiowide,cursive', fontSize: 12, color: palette.text, opacity: 0.35 }}>———</span>
          <span style={{ fontFamily: 'Audiowide,cursive', fontSize: 14, color: 'white', opacity: 0.55 }}>{String(AVATARS.length).padStart(2,'0')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {AVATARS.map((_, i) => (
            <span key={i} onClick={() => setActiveIdx(i)} style={{
              width: 10, height: 10, borderRadius: '50%', display: 'inline-block', cursor: 'pointer',
              border: '1.5px solid var(--accent)',
              background:   i === activeIdx ? 'var(--accent)' : 'transparent',
              boxShadow:    i === activeIdx ? '0 0 10px var(--accent)' : 'none',
              transform:    i === activeIdx ? 'scale(1.2)' : 'scale(1)',
              transition: 'all 300ms',
            }} />
          ))}
        </div>
        <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 12, letterSpacing: '0.3em', color: palette.text, opacity: 0.7 }}>© 2026 — DANCE MATCH LIMITED</span>
      </div>
    </div>
  );
}
