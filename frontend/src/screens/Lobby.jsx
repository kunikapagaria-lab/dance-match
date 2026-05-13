import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../App.jsx';
import socket from '../socket.js';
import '../styles/neon.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const LEVEL_INFO = [
  { id: 1, name: 'Groove Starter', bpm: 85,  diff: 'Beginner' },
  { id: 2, name: 'Street Heat',    bpm: 100, diff: 'Easy'     },
  { id: 3, name: 'Neon Pulse',     bpm: 118, diff: 'Medium'   },
  { id: 4, name: 'Rhythm Riot',    bpm: 128, diff: 'Hard'     },
  { id: 5, name: 'Pro Breakdown',  bpm: 140, diff: 'Expert'   },
];

function NeonInput({ value, onChange, placeholder, maxLength, style = {} }) {
  return (
    <input
      className="font-body"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: '100%', background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'white', padding: '12px 16px', fontSize: 15, outline: 'none',
        transition: 'border-color 200ms', ...style,
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
    />
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(0,1,6,0.78)', border: '1px solid var(--accent)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 0 80px var(--glow-soft), inset 0 0 40px rgba(0,0,0,0.5)',
      padding: '40px 44px', position: 'relative', ...style,
    }}>
      {['tl','tr','bl','br'].map(p => (
        <span key={p} style={{
          position: 'absolute', width: 14, height: 14,
          top:    p.includes('t') ? -2 : 'auto', bottom: p.includes('b') ? -2 : 'auto',
          left:   p.includes('l') ? -2 : 'auto', right:  p.includes('r') ? -2 : 'auto',
          borderTop:    p.includes('t') ? '2px solid var(--accent)' : 'none',
          borderBottom: p.includes('b') ? '2px solid var(--accent)' : 'none',
          borderLeft:   p.includes('l') ? '2px solid var(--accent)' : 'none',
          borderRight:  p.includes('r') ? '2px solid var(--accent)' : 'none',
          boxShadow: '0 0 6px var(--glow)',
        }} />
      ))}
      {children}
    </div>
  );
}

function AccentBtn({ children, onClick, disabled, outline, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? 'transparent' : (disabled ? 'rgba(255,255,255,0.06)' : 'var(--accent)'),
      border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.1)' : 'var(--accent)'}`,
      color: outline ? 'var(--accent)' : (disabled ? 'rgba(255,255,255,0.3)' : 'black'),
      padding: '14px 28px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.2em',
      boxShadow: !disabled && !outline ? '0 0 20px var(--glow-soft)' : 'none',
      clipPath: !disabled && !outline ? 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' : 'none',
      transition: 'all 200ms', ...style,
    }}>
      {children}
    </button>
  );
}

export default function Lobby() {
  const { gameState, setGameState } = useGame();
  const navigate = useNavigate();
  const { players, roomCode, playerId, isHost, level } = gameState;

  const [phase, setPhase] = useState('enter'); // 'enter' | 'room'
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  // Custom video upload state
  const [uploadFile, setUploadFile]     = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError]   = useState('');
  const [customLevelId, setCustomLevelId] = useState(null);
  const fileRef  = useRef(null);
  const pollRef2 = useRef(null);

  function startUploadPoll(jobId) {
    pollRef2.current = setInterval(async () => {
      try {
        const res  = await fetch(`${SERVER_URL}/job-status/${jobId}`);
        const data = await res.json();
        setUploadProgress(data.progress || 0);
        setUploadStatus(data.message || '');
        if (data.status === 'done') {
          clearInterval(pollRef2.current);
          setUploading(false);
          setCustomLevelId(data.levelId);
          handleSetLevel(data.levelId);
        } else if (data.status === 'error') {
          clearInterval(pollRef2.current);
          setUploading(false);
          setUploadError(data.message || 'Processing failed');
        }
      } catch { clearInterval(pollRef2.current); setUploading(false); setUploadError('Lost connection'); }
    }, 2000);
  }

  async function handleVideoUpload() {
    if (!uploadFile || !isHost) return;
    setUploadError(''); setUploadProgress(0); setUploadStatus('Uploading…'); setUploading(true);
    try {
      const form = new FormData();
      form.append('video', uploadFile);
      const res  = await fetch(`${SERVER_URL}/upload-video`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) { setUploadError(data.error); setUploading(false); return; }
      startUploadPoll(data.jobId);
    } catch { setUploadError('Upload failed'); setUploading(false); }
  }

  function handleCreate() {
    if (!nameInput.trim()) return;
    setGameState(s => ({ ...s, isHost: true }));
    socket.emit('create_room', { name: nameInput.trim(), avatar: 'default' });
    setPhase('room');
  }

  function handleJoin() {
    if (!nameInput.trim() || codeInput.length !== 4) return;
    setGameState(s => ({ ...s, isHost: false }));
    socket.emit('join_room', { code: codeInput.toUpperCase(), name: nameInput.trim(), avatar: 'default' });
    setPhase('room');
  }

  function handleSetLevel(id) {
    if (!isHost) return;
    socket.emit('set_level', { level: id });
  }

  const me = players.find(p => p.id === playerId);
  const allReady = players.length >= 1 && players.every(p => p.ready);

  // ── Enter phase ─────────────────────────────────────────────────────────
  if (phase === 'enter') {
    return (
      <div style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: 32, left: 32, zIndex: 100,
            background: 'transparent', border: 'none', color: 'var(--accent)',
            fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.2em',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', opacity: 0.8, transition: 'opacity 200ms'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
        >
          <span>←</span>
          <span>BACK</span>
        </button>
        <Card style={{ width: '100%', maxWidth: 440 }}>
          <div className="font-body font-semibold mb-1" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>MULTIPLAYER</div>
          <h2 className="font-display mb-8" style={{ fontSize: 28, color: 'white', margin: '0 0 32px' }}>Join the Battle</h2>

          <div className="mb-4">
            <label className="font-body font-semibold block mb-2" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)' }}>YOUR NAME</label>
            <NeonInput value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Enter your name" maxLength={20} />
          </div>

          <AccentBtn onClick={handleCreate} disabled={!nameInput.trim()} style={{ width: '100%', marginBottom: 20 }}>
            CREATE ROOM
          </AccentBtn>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>OR JOIN</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <NeonInput
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={4}
              style={{ fontFamily: 'Audiowide, cursive', letterSpacing: '0.4em', textAlign: 'center', fontSize: 18 }}
            />
            <AccentBtn onClick={handleJoin} disabled={!nameInput.trim() || codeInput.length !== 4}>
              JOIN
            </AccentBtn>
          </div>
        </Card>
      </div>
    );
  }

  // ── Room phase ───────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: 32, left: 32, zIndex: 100,
          background: 'transparent', border: 'none', color: 'var(--accent)',
          fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.2em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', opacity: 0.8, transition: 'opacity 200ms'
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
      >
        <span>←</span>
        <span>BACK</span>
      </button>
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        {/* Left: Room code + Players */}
        <Card style={{ flex: '0 0 300px', minWidth: 260 }}>
          {/* Room code */}
          <div className="font-body font-semibold mb-1" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>ROOM CODE</div>
          <div className="font-display" style={{ fontSize: 40, color: 'var(--accent)', letterSpacing: '0.4em', textShadow: '0 0 20px var(--glow)', marginBottom: 4 }}>
            {roomCode}
          </div>
          <p className="font-body mb-6" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>Share this code to invite players</p>

          {/* Players */}
          <div className="font-body font-semibold mb-3" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)' }}>
            PLAYERS ({players.length}/4)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {players.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: p.id === playerId ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)',
                border: p.id === playerId ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                padding: '10px 14px',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.ready ? 'var(--accent)' : 'rgba(255,255,255,0.2)', boxShadow: p.ready ? '0 0 8px var(--accent)' : 'none', flexShrink: 0 }} />
                <span className="font-body font-semibold" style={{ flex: 1, fontSize: 14, color: 'white' }}>{p.name}</span>
                <span className="font-body" style={{ fontSize: 11, letterSpacing: '0.15em', color: p.ready ? 'var(--accent)' : 'rgba(255,255,255,0.3)' }}>
                  {p.ready ? 'READY' : 'WAITING'}
                </span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1px dashed rgba(255,255,255,0.08)', padding: '10px 14px', opacity: 0.35,
              }}>
                <span style={{ width: 8, height: 8, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%' }} />
                <span className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Waiting for player…</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {!me?.ready && (
            <AccentBtn onClick={() => socket.emit('player_ready')} style={{ width: '100%', marginBottom: 8 }}>
              I'M READY
            </AccentBtn>
          )}
          {me?.ready && (
            <div className="font-body font-semibold" style={{
              textAlign: 'center', padding: '14px', marginBottom: 8,
              color: 'var(--accent)', background: 'rgba(var(--accent-rgb,255,31,61),0.1)',
              border: '1px solid var(--accent)', fontSize: 13, letterSpacing: '0.2em',
            }}>
              ✓ YOU ARE READY
            </div>
          )}
          {isHost && allReady && (
            <AccentBtn onClick={() => socket.emit('go_to_countdown')} style={{ width: '100%' }}>
              START GAME
            </AccentBtn>
          )}
          {!allReady && (
            <p className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', letterSpacing: '0.1em' }}>
              {players.length < 2 ? 'Share the code to add players' : 'Waiting for all players to ready up…'}
            </p>
          )}
        </Card>

        {/* Right: Level selector */}
        <Card style={{ flex: 1, minWidth: 260 }}>
          <div className="font-body font-semibold mb-1" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>
            SELECT LEVEL {!isHost && <span style={{ opacity: 0.5 }}>(host picks)</span>}
          </div>
          <h3 className="font-display mb-6" style={{ fontSize: 20, color: 'white', margin: '0 0 20px' }}>Battle Arena</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {LEVEL_INFO.map(l => (
              <button key={l.id} onClick={() => handleSetLevel(l.id)} disabled={!isHost}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: level === l.id ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.35)',
                  border: `1.5px solid ${level === l.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                  color: 'white', padding: '14px 18px',
                  cursor: isHost ? 'pointer' : 'default',
                  transition: 'all 200ms',
                  boxShadow: level === l.id ? '0 0 20px var(--glow-soft)' : 'none',
                }}>
                <span className="font-display" style={{ fontSize: 22, color: level === l.id ? 'var(--accent)' : 'rgba(255,255,255,0.25)', minWidth: 28 }}>{l.id}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  <span className="font-display block" style={{ fontSize: 14 }}>{l.name}</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em' }}>{l.bpm} BPM · {l.diff}</span>
                </span>
                {level === l.id && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />}
              </button>
            ))}
          </div>

          {/* Custom video upload */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <div className="font-body" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--accent)', opacity: 0.7, marginBottom: 10 }}>CUSTOM VIDEO</div>

            {isHost && !uploading && !customLevelId && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={e => { setUploadFile(e.target.files?.[0] || null); setUploadError(''); }} />
                <button onClick={() => fileRef.current?.click()} style={{
                  flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(255,255,255,0.18)',
                  color: uploadFile ? 'white' : 'rgba(255,255,255,0.35)', padding: '10px 12px',
                  cursor: 'pointer', fontSize: 12, textAlign: 'left',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'border-color 200ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}>
                  {uploadFile ? `📁 ${uploadFile.name}` : 'Choose video…'}
                </button>
                <button onClick={handleVideoUpload} disabled={!uploadFile || !isHost} style={{
                  background: !uploadFile ? 'rgba(255,255,255,0.06)' : 'var(--accent)',
                  color: !uploadFile ? 'rgba(255,255,255,0.3)' : 'black', border: 'none',
                  padding: '10px 14px', cursor: !uploadFile ? 'not-allowed' : 'pointer',
                  fontFamily: 'Audiowide,cursive', fontSize: 10, letterSpacing: '0.1em',
                  transition: 'all 200ms',
                }}>EXTRACT</button>
              </div>
            )}

            {uploading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{uploadStatus || 'Processing…'}</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--accent)' }}>{uploadProgress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', width: `${uploadProgress}%`, transition: 'width 0.4s ease', borderRadius: 2 }} />
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Don't close this tab.</p>
              </div>
            )}

            {uploadError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>⚠ {uploadError}</p>}

            {customLevelId && !uploading && (
              <button onClick={() => handleSetLevel(customLevelId)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: level === customLevelId ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.35)',
                border: `1.5px solid ${level === customLevelId ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                color: 'white', padding: '12px 14px', cursor: isHost ? 'pointer' : 'default',
                boxShadow: level === customLevelId ? '0 0 20px var(--glow-soft)' : 'none',
                transition: 'all 200ms',
              }}>
                <span style={{ fontSize: 16 }}>📁</span>
                <span className="font-body" style={{ flex: 1, fontSize: 13 }}>Custom Video</span>
                {level === customLevelId && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />}
              </button>
            )}

            {!isHost && typeof level === 'string' && level.startsWith('upload_') && (
              <p className="font-body" style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.7 }}>Host selected a custom video track.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
