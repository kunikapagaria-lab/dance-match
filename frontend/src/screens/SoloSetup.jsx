import { useState, useRef, useEffect } from 'react';
import socket from '../socket.js';
import { useGame } from '../App.jsx';
import '../styles/neon.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export default function SoloSetup() {
  const { gameState, setGameState } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [savedLevels, setSavedLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  // Load saved levels
  useEffect(() => {
    fetch(`${SERVER_URL}/custom-levels`)
      .then(r => r.json())
      .then(data => setSavedLevels(Array.isArray(data) ? data.filter(l => l.videoFile) : []))
      .catch(() => {});
  }, []);

  // Auto-navigate to countdown when solo room is ready
  useEffect(() => {
    const onAllReady = () => {
      socket.emit('go_to_countdown');
    };
    socket.on('all_ready', onAllReady);
    return () => socket.off('all_ready', onAllReady);
  }, []);

  function startPolling(jobId) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${SERVER_URL}/job-status/${jobId}`);
        const data = await res.json();
        setProgress(data.progress || 0);
        setStatusMsg(data.message || '');
        if (data.status === 'done') {
          clearInterval(pollRef.current);
          setProcessing(false);
          setSelectedLevel(data.levelId);
          setSavedLevels(prev => {
            if (prev.find(l => l.id === data.levelId)) return prev;
            return [...prev, { id: data.levelId, type: 'upload', videoFile: `${data.levelId}.mp4`, duration: 0 }];
          });
        } else if (data.status === 'error') {
          clearInterval(pollRef.current);
          setProcessing(false);
          setError(data.message || 'Processing failed');
        }
      } catch { clearInterval(pollRef.current); setProcessing(false); setError('Lost connection to server'); }
    }, 2000);
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setError(''); setProgress(0); setStatusMsg('Uploading…'); setProcessing(true);
    try {
      const form = new FormData();
      form.append('video', uploadFile);
      const res = await fetch(`${SERVER_URL}/upload-video`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) { setError(data.error); setProcessing(false); return; }
      startPolling(data.jobId);
    } catch { setError('Upload failed'); setProcessing(false); }
  }

  async function handleReady() {
    if (!selectedLevel || isStarting) return;
    setIsStarting(true);
    const name = playerName.trim() || 'Player 1';

    // Create room
    socket.emit('create_room', { name, avatar: 'default' });

    const onRoomCreated = ({ code }) => {
      socket.off('room_created', onRoomCreated);
      // Update game state with host + room info
      setGameState(s => ({ ...s, isHost: true }));
      // Set the level
      socket.emit('set_level', { level: selectedLevel });
      // Mark ready (server emits all_ready for 1 player → our useEffect emits start_game)
      socket.emit('player_ready');
    };
    socket.on('room_created', onRoomCreated);
  }

  const mins = (dur) => `${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2,'0')}`;

  return (
    <div style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
        background: 'rgba(0,1,6,0.78)', border: '1px solid var(--accent)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 80px var(--glow-soft), inset 0 0 40px rgba(0,0,0,0.5)',
        padding: '48px 64px', width: '100%', maxWidth: 720,
        position: 'relative', borderRadius: '16px'
      }}>
        {/* Corner brackets */}
        {['tl','tr','bl','br'].map(p => (
          <span key={p} style={{
            position: 'absolute', width: 24, height: 24,
            top:    p.includes('t') ? -2 : 'auto', bottom: p.includes('b') ? -2 : 'auto',
            left:   p.includes('l') ? -2 : 'auto', right:  p.includes('r') ? -2 : 'auto',
            borderTop:    p.includes('t') ? '2px solid var(--accent)' : 'none',
            borderBottom: p.includes('b') ? '2px solid var(--accent)' : 'none',
            borderLeft:   p.includes('l') ? '2px solid var(--accent)' : 'none',
            borderRight:  p.includes('r') ? '2px solid var(--accent)' : 'none',
            borderTopLeftRadius: p === 'tl' ? '16px' : 0,
            borderTopRightRadius: p === 'tr' ? '16px' : 0,
            borderBottomLeftRadius: p === 'bl' ? '16px' : 0,
            borderBottomRightRadius: p === 'br' ? '16px' : 0,
            boxShadow: '0 0 8px var(--glow)',
          }} />
        ))}

        <div className="font-body font-semibold mb-1" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>SOLO MODE</div>
        <h2 className="font-display mb-6" style={{ fontSize: 32, color: 'white', margin: '0 0 28px' }}>Choose Your Track</h2>

        {/* Player name */}
        <div className="mb-5">
          <label className="font-body font-semibold block mb-2" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--accent)', opacity: 0.8 }}>YOUR NAME</label>
          <input
            className="font-body"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Player 1"
            maxLength={20}
            style={{
              width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', padding: '12px 16px', fontSize: 16, outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />
        </div>

        {/* Saved levels */}
        {savedLevels.length > 0 && (
          <div className="mb-5">
            <label className="font-body font-semibold block mb-2" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--accent)', opacity: 0.8 }}>SAVED VIDEOS</label>
            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '35vh', overflowY: 'auto', paddingRight: 4 }}>
              {savedLevels.map(sv => (
                <button key={sv.id} onClick={() => setSelectedLevel(sv.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: selectedLevel === sv.id ? 'rgba(var(--accent-rgb,255,31,61),0.15)' : 'rgba(0,0,0,0.4)',
                    border: `1px solid ${selectedLevel === sv.id ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                    color: 'white', padding: '10px 14px', cursor: 'pointer',
                    transition: 'all 200ms', textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 14 }}>📁</span>
                  <span className="font-body" style={{ flex: 1, fontSize: 13, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sv.videoFile || sv.id}
                  </span>
                  {sv.duration > 0 && (
                    <span className="font-display" style={{ fontSize: 11, color: 'var(--accent)' }}>{mins(sv.duration)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload new */}
        <div className="mb-6">
          <label className="font-body font-semibold block mb-2" style={{ fontSize: 11, letterSpacing: '0.25em', color: 'var(--accent)', opacity: 0.8 }}>UPLOAD NEW VIDEO</label>
          <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => { setUploadFile(e.target.files?.[0] || null); setError(''); }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={processing}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(255,255,255,0.2)',
                color: uploadFile ? 'white' : 'rgba(255,255,255,0.4)', padding: '11px 14px',
                cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'border-color 200ms',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            >
              {uploadFile ? `📁 ${uploadFile.name}` : 'Choose video file…'}
            </button>
            <button onClick={handleUpload} disabled={!uploadFile || processing}
              style={{
                background: 'var(--accent)', color: 'black', border: 'none',
                padding: '11px 18px', cursor: !uploadFile || processing ? 'not-allowed' : 'pointer',
                opacity: !uploadFile || processing ? 0.5 : 1,
                fontFamily: 'Audiowide, cursive', fontSize: 11, letterSpacing: '0.1em',
                transition: 'opacity 200ms',
              }}>
              EXTRACT
            </button>
          </div>

          {processing && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{statusMsg || 'Processing…'}</span>
                <span className="font-body" style={{ fontSize: 12, color: 'var(--accent)' }}>{progress}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.4s ease', borderRadius: 2 }} />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>This may take a few minutes. Don't close this tab.</p>
            </div>
          )}

          {error && <p style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}>⚠ {error}</p>}
        </div>

        {/* I'm Ready */}
        <button
          onClick={handleReady}
          disabled={!selectedLevel || isStarting}
          style={{
            width: '100%', background: selectedLevel && !isStarting ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${selectedLevel ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
            color: selectedLevel && !isStarting ? 'black' : 'rgba(255,255,255,0.3)',
            padding: '18px', cursor: selectedLevel && !isStarting ? 'pointer' : 'not-allowed',
            fontFamily: 'Audiowide, cursive', fontSize: 14, letterSpacing: '0.22em',
            borderRadius: '12px',
            boxShadow: selectedLevel ? '0 0 30px var(--glow), 0 0 60px var(--glow-soft)' : 'none',
            transition: 'all 300ms',
          }}
        >
          {isStarting ? 'STARTING…' : "I'M READY — LET'S DANCE"}
        </button>
      </div>
    </div>
  );
}
