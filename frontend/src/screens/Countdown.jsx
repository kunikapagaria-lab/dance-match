import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../App.jsx';
import socket from '../socket.js';
import '../styles/neon.css';

export default function Countdown() {
  const { gameState } = useGame();
  const navigate = useNavigate();
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
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: 32, left: 32, zIndex: 100,
          background: 'transparent', border: 'none', color: 'var(--accent)',
          fontFamily: 'Audiowide,cursive', fontSize: 12, letterSpacing: '0.2em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', opacity: 0.8, transition: 'opacity 200ms'
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
      >
        <span>←</span>
        <span>BACK</span>
      </button>
      {/* Countdown number or START button */}
      {countdownValue !== undefined && countdownValue !== null ? (
        <span ref={numRef} style={{
          fontFamily: 'Audiowide,cursive', fontSize: 110, color: 'white', lineHeight: 1,
          textShadow: '0 0 40px var(--glow, rgba(255,30,60,0.7)), 0 0 80px var(--glow-soft, rgba(255,30,60,0.3))',
        }}>
          {countdownValue}
        </span>
      ) : (
        isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              {/* Pulsing ring behind the button */}
              <div style={{
                position: 'absolute', inset: -12,
                border: '2px solid var(--accent)',
                borderRadius: 6, opacity: 0.4,
                animation: 'ringPulse 1.6s ease-out infinite',
                pointerEvents: 'none',
              }} />
              <button onClick={handleStartCountdown} style={{
                background: 'var(--accent)',
                border: '2px solid var(--accent)',
                outline: 'none', cursor: 'pointer',
                padding: '22px 64px',
                fontFamily: 'Audiowide,cursive', fontSize: 34,
                color: '#000',
                letterSpacing: '0.35em',
                fontWeight: 700,
                boxShadow: '0 0 40px var(--glow), 0 0 80px var(--glow-soft)',
                borderRadius: 4,
                transition: 'all 0.15s ease',
                position: 'relative', zIndex: 1,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow = '0 0 70px var(--glow), 0 0 140px var(--glow-soft)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 40px var(--glow), 0 0 80px var(--glow-soft)';
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1.06)'}>
                ▶ &nbsp;START
              </button>
            </div>
            <span style={{
              fontFamily: 'Rajdhani,sans-serif', fontSize: 12,
              letterSpacing: '0.3em', color: 'var(--accent)', opacity: 0.6,
              animation: 'tapBlink 1.6s ease-in-out infinite',
            }}>TAP TO BEGIN</span>
          </div>
        ) : (
          <div style={{ fontFamily: 'Audiowide,cursive', fontSize: 16, color: 'white', textAlign: 'center', opacity: 0.6 }}>
            WAITING<br/>FOR HOST
          </div>
        )
      )}

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
            <>
              <div className="scanner-line" />
              <div className="scanner-grid" />
            </>
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

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ringPulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes tapBlink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}
