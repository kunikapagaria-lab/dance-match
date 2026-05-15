import { useState, useRef, useEffect } from 'react';
import { useGame } from '../App.jsx';
import socket from '../socket.js';
import VideoExtractor from '../components/VideoExtractor.jsx';
import '../styles/neon.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

function mins(s) {
  const m = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${m}:${secs.toString().padStart(2, '0')}`;
}

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
  const { players, roomCode, playerId, isHost, level } = gameState;

  const [phase, setPhase] = useState(roomCode ? 'room' : 'enter'); // 'enter' | 'room'
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  const [uploadFile, setUploadFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [customLevelId, setCustomLevelId] = useState(null);
  const [savedLevels, setSavedLevels] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/custom-levels`)
      .then(r => r.json())
      .then(data => setSavedLevels(Array.isArray(data) ? data.filter(l => l.cloudinaryUrl) : []))
      .catch(() => {});
  }, []);

  function handleExtractComplete({ levelId, cloudinaryUrl, duration, originalFilename }) {
    setExtracting(false);
    setUploadFile(null);
    setCustomLevelId(levelId);
    setSavedLevels(prev => {
      if (prev.find(l => l.id === levelId)) return prev;
      return [...prev, { id: levelId, type: 'upload', cloudinaryUrl, duration, originalFilename }];
    });
    handleSetLevel(levelId);
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

  async function handleDeleteVideo(e, id) {
    e.stopPropagation();
    if (!isHost) return;
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      const res = await fetch(`${SERVER_URL}/level/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedLevels(prev => prev.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete video', err);
    }
  }

  const me = players.find(p => p.id === playerId);
  const allReady = players.length >= 1 && players.every(p => p.ready);

  // ── Enter phase ─────────────────────────────────────────────────────────
  if (phase === 'enter') {
    return (
      <div style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{ width: '100%', maxWidth: 500 }}>
          <div className="font-body font-semibold mb-2" style={{ fontSize: 14, letterSpacing: '0.4em', color: 'var(--accent)', opacity: 0.8, textAlign: 'center' }}>MULTIPLAYER</div>
          <h2 className="font-display mb-10" style={{ fontSize: 48, color: 'white', margin: '0 0 48px', textAlign: 'center', textShadow: '0 0 30px var(--glow-soft)' }}>Join the Battle</h2>

          <div className="mb-6">
            <label className="font-body font-semibold block mb-3" style={{ fontSize: 13, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.6)' }}>YOUR NAME</label>
            <NeonInput 
              value={nameInput} 
              onChange={e => setNameInput(e.target.value)} 
              placeholder="Enter your name" 
              maxLength={20} 
              style={{ fontSize: 18, padding: '16px 20px', backgroundColor: 'rgba(0,0,0,0.6)' }}
            />
          </div>

          <AccentBtn onClick={handleCreate} disabled={!nameInput.trim()} style={{ width: '100%', marginBottom: 32, fontSize: 15, padding: '18px' }}>
            CREATE ROOM
          </AccentBtn>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span className="font-body" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3em' }}>OR JOIN</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <NeonInput
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={4}
              style={{ flex: 1, fontFamily: 'Audiowide, cursive', letterSpacing: '0.5em', textAlign: 'center', fontSize: 24, padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}
            />
            <AccentBtn onClick={handleJoin} disabled={!nameInput.trim() || codeInput.length !== 4} style={{ padding: '16px 40px', fontSize: 15 }}>
              JOIN
            </AccentBtn>
          </div>
        </div>
      </div>
    );
  }

  // ── Room phase ───────────────────────────────────────────────────────────
  return (
    <div className="no-scrollbar" style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px' }}>
      <div style={{ width: '100%', maxWidth: 1200, display: 'flex', gap: 60, flexShrink: 0, paddingBottom: 40, flexWrap: 'wrap' }}>

        {/* Left: Room code + Players */}
        <div style={{ flex: '0 0 350px', minWidth: 300, display: 'flex', flexDirection: 'column', marginTop: '2vh' }}>
          {/* Room code */}
          <div className="font-body font-semibold mb-1" style={{ fontSize: 12, letterSpacing: '0.4em', color: 'var(--accent)', opacity: 0.8 }}>ROOM CODE</div>
          <div className="font-display" style={{ fontSize: 48, color: 'var(--accent)', letterSpacing: '0.4em', textShadow: '0 0 30px var(--glow)', marginBottom: 4 }}>
            {roomCode}
          </div>
          <p className="font-body mb-6" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>Share this code to invite players</p>

          {/* Players */}
          <div className="font-body font-semibold mb-4" style={{ fontSize: 13, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)' }}>
            PLAYERS ({players.length}/4)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
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
            <AccentBtn onClick={() => socket.emit('player_ready')} style={{ width: '100%', marginBottom: 8, padding: '18px', fontSize: 16 }}>
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
            <AccentBtn onClick={() => socket.emit('go_to_countdown')} style={{ width: '100%', padding: '18px', fontSize: 16 }}>
              START GAME
            </AccentBtn>
          )}
          {!allReady && (
            <p className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', letterSpacing: '0.1em' }}>
              {players.length < 2 ? 'Share the code to add players' : 'Waiting for all players to ready up…'}
            </p>
          )}
        </div>

        {/* Right: Level selector */}
        <div style={{ flex: 1, minWidth: 350, display: 'flex', flexDirection: 'column', marginTop: '2vh' }}>
          <div className="font-body font-semibold mb-1" style={{ fontSize: 13, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>
            SELECT LEVEL {!isHost && <span style={{ opacity: 0.5 }}>(host picks)</span>}
          </div>
          <h3 className="font-display mb-4" style={{ fontSize: 20, color: 'white', margin: '0 0 16px' }}>Battle Arena</h3>

          <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14, maxHeight: '40vh', overflowY: 'auto', paddingRight: 4, paddingBottom: 4, marginBottom: 20, width: '100%' }}>
            {savedLevels.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No saved videos. Upload one below!</p>
            )}
            {savedLevels.map(sv => (
              <button key={sv.id} onClick={() => handleSetLevel(sv.id)} disabled={!isHost}
                style={{
                  display: 'flex', flexDirection: 'column',
                  background: level === sv.id ? 'rgba(var(--accent-rgb,255,31,61),0.15)' : 'rgba(0,0,0,0.4)',
                  border: `2px solid ${level === sv.id ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '12px',
                  color: 'white', padding: 0, cursor: isHost ? 'pointer' : 'default',
                  transition: 'all 200ms', overflow: 'hidden',
                  boxShadow: level === sv.id ? '0 0 20px var(--glow-soft)' : 'none'
                }}>
                
                <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                  {isHost && (
                    <button 
                      onClick={(e) => handleDeleteVideo(e, sv.id)}
                      style={{
                        position: 'absolute', top: 4, right: 4, zIndex: 10,
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%', width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', cursor: 'pointer', transition: 'all 200ms',
                        backdropFilter: 'blur(4px)', fontSize: 12
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,31,61,0.8)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                      title="Delete Video"
                    >✕</button>
                  )}
                  {sv.type === 'youtube' && sv.videoId ? (
                    <img src={`https://img.youtube.com/vi/${sv.videoId}/mqdefault.jpg`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail" />
                  ) : (
                    <video src={`${sv.cloudinaryUrl}#t=0.5`} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                  )}
                  {sv.duration > 0 && (
                    <span className="font-display" style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.85)', padding: '2px 4px', borderRadius: '4px', fontSize: 10, color: 'var(--accent)' }}>
                      {mins(sv.duration)}
                    </span>
                  )}
                </div>
                
                <div style={{ padding: '8px 10px', width: '100%', textAlign: 'left' }}>
                  <span className="font-body" style={{ display: 'block', fontSize: 12, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sv.originalFilename || sv.id}>
                    {sv.originalFilename || sv.id}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Custom video upload */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, width: '100%' }}>
            <div className="font-body" style={{ fontSize: 13, letterSpacing: '0.3em', color: 'var(--accent)', opacity: 0.7, marginBottom: 10 }}>CUSTOM VIDEO</div>

            {isHost && !extracting && (
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
                <button onClick={() => { setUploadError(''); setExtracting(true); }} disabled={!uploadFile} style={{
                  background: !uploadFile ? 'rgba(255,255,255,0.06)' : 'var(--accent)',
                  color: !uploadFile ? 'rgba(255,255,255,0.3)' : 'black', border: 'none',
                  padding: '12px 18px', cursor: !uploadFile ? 'not-allowed' : 'pointer',
                  fontFamily: 'Audiowide,cursive', fontSize: 11, letterSpacing: '0.1em',
                  transition: 'all 200ms',
                }}>EXTRACT</button>
              </div>
            )}

            {extracting && uploadFile && (
              <VideoExtractor
                file={uploadFile}
                onComplete={handleExtractComplete}
                onError={(msg) => { setExtracting(false); setUploadError(msg); }}
                onCancel={() => { setExtracting(false); setUploadFile(null); }}
              />
            )}

            {uploadError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>⚠ {uploadError}</p>}

            {!isHost && typeof level === 'string' && level.startsWith('upload_') && (
              <p className="font-body" style={{ fontSize: 11, color: 'var(--accent)', opacity: 0.7 }}>Host selected a custom video track.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
