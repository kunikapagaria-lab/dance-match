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

  // Reset game state on mount if no active room (fresh solo session)
  useEffect(() => {
    if (!gameState.roomCode) {
      setGameState(s => ({ ...s, rankings: [], bracket: [], champion: null, round: 0, levelData: null }));
    }
  }, []);

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

    if (gameState.roomCode) {
      socket.emit('set_level', { level: selectedLevel });
      socket.emit('player_ready');
    } else {
      socket.emit('create_room', { name, avatar: 'default' });

      const onRoomCreated = ({ code }) => {
        socket.off('room_created', onRoomCreated);
        setGameState(s => ({ ...s, isHost: true }));
        socket.emit('set_level', { level: selectedLevel });
        socket.emit('player_ready');
      };
      socket.on('room_created', onRoomCreated);
    }
  }

  async function handleDeleteVideo(e, id) {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/level/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedLevels(prev => prev.filter(l => l.id !== id));
        if (selectedLevel === id) setSelectedLevel(null);
      }
    } catch (err) {
      console.error('Failed to delete video', err);
    }
  }

  const mins = (dur) => `${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2,'0')}`;

  return (
    <div className="no-scrollbar" style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: '20px 20px' }}>
      <div style={{ width: '100%', maxWidth: 1000, display: 'flex', flexDirection: 'column', flexShrink: 0, paddingBottom: 40 }}>
        
        <div style={{ flexShrink: 0, marginTop: '2vh', textAlign: 'center' }}>
          <h2 className="font-display mb-6" style={{ fontSize: 40, color: 'white', margin: '0 0 24px', textShadow: '0 0 30px var(--glow-soft)' }}>Choose Your Track</h2>
        </div>

        {/* Player name */}
        <div className="mb-4">
          <label className="font-body font-semibold block mb-1" style={{ fontSize: 13, letterSpacing: '0.25em', color: 'var(--accent)', opacity: 0.8 }}>YOUR NAME</label>
          <input
            className="font-body"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Player 1"
            maxLength={20}
            style={{
              width: '100%', maxWidth: 450, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', padding: '16px 20px', fontSize: 20, outline: 'none',
              transition: 'border-color 200ms'
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />
        </div>

        {/* Saved levels */}
        {savedLevels.length > 0 && (
          <div className="mb-5">
            <label className="font-body font-semibold block mb-2" style={{ fontSize: 13, letterSpacing: '0.25em', color: 'var(--accent)', opacity: 0.8 }}>SAVED VIDEOS</label>
            <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, maxHeight: '40vh', overflowY: 'auto', paddingRight: 4, paddingBottom: 4 }}>
              {savedLevels.map(sv => (
                <button key={sv.id} onClick={() => setSelectedLevel(sv.id)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    background: selectedLevel === sv.id ? 'rgba(var(--accent-rgb,255,31,61),0.15)' : 'rgba(0,0,0,0.4)',
                    border: `2px solid ${selectedLevel === sv.id ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '12px',
                    color: 'white', padding: 0, cursor: 'pointer',
                    transition: 'all 200ms', overflow: 'hidden',
                    boxShadow: selectedLevel === sv.id ? '0 0 20px var(--glow-soft)' : 'none'
                  }}>
                  
                  {/* Thumbnail Container */}
                  <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => handleDeleteVideo(e, sv.id)}
                      style={{
                        position: 'absolute', top: 6, right: 6, zIndex: 10,
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%', width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', cursor: 'pointer', transition: 'all 200ms',
                        backdropFilter: 'blur(4px)', fontSize: 14
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,31,61,0.8)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                      title="Delete Video"
                    >
                      ✕
                    </button>
                    {sv.type === 'youtube' && sv.videoId ? (
                      <img 
                        src={`https://img.youtube.com/vi/${sv.videoId}/mqdefault.jpg`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt="Thumbnail"
                      />
                    ) : (
                      <video 
                        src={`${SERVER_URL}/video/${sv.id}#t=0.5`} 
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted playsInline
                      />
                    )}
                    
                    {/* Duration Badge */}
                    {sv.duration > 0 && (
                      <span className="font-display" style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.85)', padding: '3px 6px', borderRadius: '6px', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>
                        {mins(sv.duration)}
                      </span>
                    )}
                  </div>
                  
                  {/* Title Bar */}
                  <div style={{ padding: '10px 14px', width: '100%', textAlign: 'left' }}>
                    <span className="font-body" style={{ display: 'block', fontSize: 13, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sv.videoFile || sv.id}>
                      {sv.videoFile || sv.id}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload new */}
        <div className="mb-6">
          <label className="font-body font-semibold block mb-2" style={{ fontSize: 13, letterSpacing: '0.25em', color: 'var(--accent)', opacity: 0.8 }}>UPLOAD NEW VIDEO</label>
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
                padding: '12px 20px', cursor: !uploadFile || processing ? 'not-allowed' : 'pointer',
                opacity: !uploadFile || processing ? 0.5 : 1,
                fontFamily: 'Audiowide, cursive', fontSize: 13, letterSpacing: '0.1em',
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
            padding: '22px', cursor: selectedLevel && !isStarting ? 'pointer' : 'not-allowed',
            fontFamily: 'Audiowide, cursive', fontSize: 18, letterSpacing: '0.25em',
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
