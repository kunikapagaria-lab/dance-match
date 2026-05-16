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
      {/* Countdown number — above the video, only when counting */}
      {countdownValue !== undefined && countdownValue !== null && (
        <span ref={numRef} style={{
          fontFamily: 'Audiowide,cursive', fontSize: 110, color: 'white', lineHeight: 1,
          textShadow: '0 0 40px var(--glow, rgba(255,30,60,0.7)), 0 0 80px var(--glow-soft, rgba(255,30,60,0.3))',
        }}>
          {countdownValue}
        </span>
      )}

      {/* Instruction */}
      <div style={{ fontFamily: 'Audiowide,cursive', fontSize: 12, letterSpacing: '0.45em', color: 'white', opacity: 0.65 }}>
        GET READY TO DANCE
      </div>

      {/* Live camera preview — play button overlaid on video */}
      <div style={{ position: 'relative', marginTop: 8 }}>

        <div style={{
          border: '1.5px solid var(--accent, #ff1f3d)',
          overflow: 'hidden', width: 260, height: 195, position: 'relative',
          animation: (countdownValue === null || countdownValue === undefined) && isHost
            ? 'boxGlow 1.8s ease-in-out infinite' : 'none',
        }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
            playsInline muted
          />

          {/* Scanning overlay during countdown */}
          {countdownValue !== null && countdownValue !== undefined && (
            <><div className="scanner-line" /><div className="scanner-grid" /></>
          )}

          {/* Play button — overlaid on video, only when waiting */}
          {(countdownValue === null || countdownValue === undefined) && isHost && (
            <button onClick={handleStartCountdown} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.35)', border: 'none', outline: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: '2.5px solid var(--accent)',
                boxShadow: '0 0 24px var(--glow), 0 0 48px var(--glow-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="var(--accent)" style={{ marginLeft: 4 }}>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </button>
          )}

          {/* Waiting for host message */}
          {(countdownValue === null || countdownValue === undefined) && !isHost && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              fontFamily: 'Audiowide,cursive', fontSize: 13, color: 'white', textAlign: 'center', opacity: 0.75,
            }}>
              WAITING<br/>FOR HOST
            </div>
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
        @keyframes boxGlow { 0%, 100% { box-shadow: 0 0 20px var(--glow-soft); } 50% { box-shadow: 0 0 50px var(--glow), 0 0 90px var(--glow-soft); } }
        @keyframes tapBlink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}
