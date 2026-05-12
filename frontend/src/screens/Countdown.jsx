import { useEffect, useRef } from 'react';
import { useGame } from '../App.jsx';
import socket from '../socket.js';
import '../styles/neon.css';

export default function Countdown() {
  const { gameState } = useGame();
  const { countdownValue, level, isHost } = gameState;
  const numRef   = useRef(null);
  const videoRef = useRef(null);

  function handleStartCountdown() {
    socket.emit('start_game');
  }

  // Animate number pop on each tick
  useEffect(() => {
    if (!numRef.current) return;
    numRef.current.style.transition = 'none';
    numRef.current.style.transform  = 'scale(1.5)';
    numRef.current.style.opacity    = '0.3';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!numRef.current) return;
      numRef.current.style.transition = 'transform 800ms ease, opacity 700ms ease';
      numRef.current.style.transform  = 'scale(1)';
      numRef.current.style.opacity    = '1';
    }));
  }, [countdownValue]);

  // Start camera preview so user can frame themselves
  useEffect(() => {
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {}); // silently skip if camera denied
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const levelNames = ['', 'Groove Starter', 'Street Heat', 'Neon Pulse', 'Rhythm Riot', 'Pro Breakdown'];
  const levelLabel = typeof level === 'number'
    ? `LEVEL ${level} · ${levelNames[level] || ''}`
    : 'CUSTOM TRACK';

  return (
    <div style={{
      position: 'relative', zIndex: 1, width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20,
    }}>
      {/* Level label */}
      <div style={{ fontFamily: 'Audiowide,cursive', fontSize: 11, letterSpacing: '0.4em', color: 'var(--accent, #ff1f3d)', opacity: 0.85 }}>
        {levelLabel}
      </div>

      {/* Countdown ring */}
      <div style={{ position: 'relative', width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {countdownValue !== undefined && countdownValue !== null ? (
          <>
            <svg width={170} height={170} style={{ position: 'absolute', inset: 0, animation: 'spin 2s linear infinite' }}>
              <circle cx={85} cy={85} r={78} fill="none" stroke="var(--accent, #ff1f3d)" strokeWidth={2} strokeDasharray="55 440" opacity={0.6} />
            </svg>
            <div style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              border: '1.5px solid var(--accent, #ff1f3d)',
              boxShadow: '0 0 30px var(--glow, rgba(255,30,60,0.5)), inset 0 0 30px rgba(0,0,0,0.6)',
            }} />
            <span ref={numRef} style={{
              fontFamily: 'Audiowide,cursive', fontSize: 72, color: 'white', lineHeight: 1,
              textShadow: '0 0 40px var(--glow, rgba(255,30,60,0.7)), 0 0 80px var(--glow-soft, rgba(255,30,60,0.3))',
              position: 'relative', zIndex: 1,
            }}>
              {countdownValue}
            </span>
          </>
        ) : (
          isHost ? (
            <button onClick={handleStartCountdown} style={{
              width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
              color: 'var(--accent, #ff1f3d)', fontFamily: 'Audiowide,cursive', fontSize: 24, cursor: 'pointer',
              border: '2px solid var(--accent, #ff1f3d)', boxShadow: '0 0 30px var(--glow, rgba(255,30,60,0.5))',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'var(--accent, #ff1f3d)'; e.currentTarget.style.color = 'black'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--accent, #ff1f3d)'; }}>
              START
            </button>
          ) : (
            <div style={{ fontFamily: 'Audiowide,cursive', fontSize: 16, color: 'white', textAlign: 'center', opacity: 0.6 }}>
              WAITING<br/>FOR HOST
            </div>
          )
        )}
      </div>

      {/* Instruction */}
      <div style={{ fontFamily: 'Audiowide,cursive', fontSize: 12, letterSpacing: '0.45em', color: 'white', opacity: 0.65 }}>
        GET READY TO DANCE
      </div>

      {/* Live camera preview — user frames themselves */}
      <div style={{ position: 'relative', marginTop: 8 }}>
        <div style={{
          border: '1.5px solid var(--accent, #ff1f3d)',
          boxShadow: '0 0 20px var(--glow-soft, rgba(255,30,60,0.25))',
          overflow: 'hidden',
          width: 260, height: 195,
          position: 'relative',
        }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
            playsInline
            muted
          />
          {/* Scanning Animation overlay */}
          {countdownValue !== null && countdownValue !== undefined && (
            <div className="scanner-line" />
          )}
          {/* Corner brackets */}
          {['tl','tr','bl','br'].map(p => (
            <span key={p} style={{
              position: 'absolute', width: 14, height: 14,
              top: p[0]==='t' ? -1 : 'auto', bottom: p[0]==='b' ? -1 : 'auto',
              left: p[1]==='l' ? -1 : 'auto', right: p[1]==='r' ? -1 : 'auto',
              borderTop:    p[0]==='t' ? '2px solid var(--accent, #ff1f3d)' : 'none',
              borderBottom: p[0]==='b' ? '2px solid var(--accent, #ff1f3d)' : 'none',
              borderLeft:   p[1]==='l' ? '2px solid var(--accent, #ff1f3d)' : 'none',
              borderRight:  p[1]==='r' ? '2px solid var(--accent, #ff1f3d)' : 'none',
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          fontFamily: 'Audiowide,cursive', fontSize: 9, letterSpacing: '0.2em',
          color: 'var(--accent, #ff1f3d)', background: 'rgba(0,0,0,0.7)',
          padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
        }}>
          POSITION YOURSELF
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
