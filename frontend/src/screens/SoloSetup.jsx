import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import { useGame } from '../App.jsx';
import { AVATARS } from '../data/avatars.js';
import { useParallax } from '../hooks/useParallax.js';
import CharacterZone from './landing/CharacterZone.jsx';
import '../styles/neon.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export default function SoloSetup() {
  const { gameState, setGameState } = useGame();
  const navigate = useNavigate();
  const { palette } = gameState;
  
  const [playerName, setPlayerName] = useState(gameState.playerName || '');
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
  const { containerRef, parallax } = useParallax();

  // Find the avatar to show (default to first one or one that matches palette)
  const currentAvatar = useMemo(() => {
    return AVATARS.find(a => a.palette.accent === palette?.accent) || AVATARS[0];
  }, [palette]);

  useEffect(() => {
    fetch(`${SERVER_URL}/custom-levels`)
      .then(r => r.json())
      .then(data => setSavedLevels(Array.isArray(data) ? data.filter(l => l.videoFile) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onAllReady = () => { socket.emit('go_to_countdown'); };
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
      } catch { clearInterval(pollRef.current); setProcessing(false); setError('Lost connection'); }
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
    setGameState(s => ({ ...s, playerName: name }));
    socket.emit('create_room', { name, avatar: 'default' });
    const onRoomCreated = ({ code }) => {
      socket.off('room_created', onRoomCreated);
      setGameState(s => ({ ...s, isHost: true }));
      socket.emit('set_level', { level: selectedLevel });
      socket.emit('player_ready');
    };
    socket.on('room_created', onRoomCreated);
  }

  const selectedTrackName = useMemo(() => {
    if (!selectedLevel) return 'NO TRACK SELECTED';
    const level = savedLevels.find(l => l.id === selectedLevel);
    return level?.videoFile?.replace('upload_', '').split('.')[0]?.toUpperCase() || 'CUSTOM PERFORMANCE';
  }, [selectedLevel, savedLevels]);

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100vw', height: '100vh', background: '#000',
      color: 'white', overflow: 'hidden', display: 'flex', zIndex: 1,
      '--accent': palette?.accent || '#ff1f3d',
      '--glow': palette?.glow || 'rgba(255,31,61,0.5)',
      '--glow-soft': palette?.glowSoft || 'rgba(255,31,61,0.2)'
    }}>
      {/* Dynamic Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 70% 50%, ${palette?.glowSoft || 'rgba(0,100,255,0.2)'} 0%, transparent 70%)`,
        opacity: 0.6
      }} />
      <div className="bg-scanlines" style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }} />
      
      {/* Large Decorative Text */}
      <div style={{
        position: 'absolute', left: '2%', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
        fontFamily: 'Audiowide', fontSize: '10vh', color: 'rgba(255,255,255,0.03)',
        whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '0.5em'
      }}>
        SETUP_SEQUENCE_001
      </div>

      {/* Main Content Layout */}
      <main style={{ position: 'relative', flex: 1, display: 'flex', padding: '60px 80px', gap: '60px', zIndex: 10, height: '100vh', boxSizing: 'border-box' }}>

        
        {/* Left: Player Identity & Big Status */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <button onClick={() => navigate('/')} style={{
              background: 'none', border: 'none', color: 'var(--accent)', fontFamily: 'Audiowide',
              fontSize: 14, letterSpacing: '0.3em', cursor: 'pointer', marginBottom: 40,
              display: 'flex', alignItems: 'center', gap: 12, padding: 0
            }}>
              <span style={{ fontSize: 20 }}>←</span> RETURN TO CORE
            </button>

            <h1 style={{ fontFamily: 'Audiowide', fontSize: 'clamp(48px, 6vw, 120px)', lineHeight: 0.9, marginBottom: 20, color: 'white' }}>
              SOLO<br/><span style={{ color: 'var(--accent)' }}>SETUP</span>
            </h1>
            
            <div style={{ maxWidth: 400 }}>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>IDENTIFICATION</div>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="UNIDENTIFIED_USER"
                style={{
                  width: '100%', background: 'none', border: 'none', borderBottom: '2px solid rgba(255,255,255,0.1)',
                  color: 'white', fontFamily: 'Audiowide', fontSize: 32, padding: '12px 0', outline: 'none',
                  transition: 'border-color 0.4s'
                }}
                onFocus={e => e.target.style.borderBottomColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {/* Current Selection Summary */}
          <div style={{ borderLeft: '1px solid var(--accent)', paddingLeft: 24, marginBottom: 40 }}>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>SELECTED_MODULE</div>
            <div style={{ fontFamily: 'Audiowide', fontSize: 24, color: 'white', marginBottom: 4 }}>{selectedTrackName}</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 14, color: 'var(--accent)', letterSpacing: '0.1em' }}>STATUS: {selectedLevel ? 'READY_FOR_LINK' : 'AWAITING_INPUT'}</div>
          </div>
        </div>

        {/* Center: Character Immersive Area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', width: '120%', height: '100%',
            background: `radial-gradient(circle at center, ${palette?.glowSoft || 'rgba(255,31,61,0.1)'} 0%, transparent 70%)`,
            opacity: 0.4, pointerEvents: 'none'
          }} />
          <CharacterZone 
            avatar={currentAvatar} 
            parallax={parallax} 
            swapping={false} 
            onSwap={() => {}} // Swapping disabled in setup for now
            style={{ position: 'relative', width: '100%', height: '100%', right: 'auto', top: 'auto', bottom: 'auto' }}
          />
        </div>

        {/* Right: Floating Control Panels */}
        <div style={{ width: 420, display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflow: 'hidden' }}>

          
          {/* Track List Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)', padding: 32, borderRadius: 24, flex: 1,
            display: 'flex', flexDirection: 'column', minHeight: 0 // CRITICAL for flex-scroll
          }}>

            <div style={{ fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>MEMORY_BANKS</div>
            <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>
              {savedLevels.length === 0 ? (
                <div style={{ opacity: 0.2, textAlign: 'center', marginTop: 40, fontFamily: 'Audiowide', fontSize: 10 }}>NO_DATA_FOUND</div>
              ) : (
                savedLevels.map(sv => (
                  <div key={sv.id} onClick={() => setSelectedLevel(sv.id)} style={{
                    padding: '16px 20px', marginBottom: 12, borderRadius: 12, cursor: 'pointer',
                    background: selectedLevel === sv.id ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease',
                    color: selectedLevel === sv.id ? 'black' : 'white'
                  }}>
                    <div style={{ fontFamily: 'Audiowide', fontSize: 13, marginBottom: 4 }}>{sv.videoFile?.replace('upload_', '').split('.')[0] || 'VOID_TRACK'}</div>
                    <div style={{ fontFamily: 'Rajdhani', fontSize: 10, opacity: 0.6 }}>ID: {sv.id}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upload Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)', padding: 24, borderRadius: 24
          }}>
            <div style={{ fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>EXTERNAL_INGEST</div>
            <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => { setUploadFile(e.target.files?.[0] || null); setError(''); }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', padding: 12, borderRadius: 8, fontFamily: 'Rajdhani', fontSize: 12, cursor: 'pointer'
              }}>
                {uploadFile ? 'FILE_READY' : 'SELECT_SRC'}
              </button>
              <button onClick={handleUpload} disabled={!uploadFile || processing} style={{
                background: 'var(--accent)', border: 'none', color: 'black',
                padding: '0 20px', borderRadius: 8, fontFamily: 'Audiowide', fontSize: 10, cursor: 'pointer',
                opacity: !uploadFile || processing ? 0.4 : 1
              }}>
                SYNC
              </button>
            </div>
            {processing && (
              <div style={{ marginTop: 16 }}>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'Rajdhani', fontSize: 9, color: 'var(--accent)' }}>
                  <span>{statusMsg.toUpperCase()}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Final Action */}
          <button
            onClick={handleReady}
            disabled={!selectedLevel || isStarting}
            style={{
              background: selectedLevel && !isStarting ? 'white' : 'rgba(255,255,255,0.05)',
              color: 'black', border: 'none', padding: 24, borderRadius: 24,
              fontFamily: 'Audiowide', fontSize: 18, letterSpacing: '0.4em',
              cursor: selectedLevel && !isStarting ? 'pointer' : 'not-allowed',
              transition: 'all 0.4s ease',
              boxShadow: selectedLevel && !isStarting ? '0 0 50px rgba(255,255,255,0.2)' : 'none'
            }}
            onMouseEnter={e => { if(selectedLevel) { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 50px var(--glow)'; } }}
            onMouseLeave={e => { if(selectedLevel) { e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 0 50px rgba(255,255,255,0.2)'; } }}
          >
            {isStarting ? 'LINKING...' : 'INITIATE'}
          </button>
        </div>

      </main>

      <style>{`
        @keyframes morph {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          34% { border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%; }
          67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; }
        }
        .bg-scanlines {
          background: linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.02) 50%);
          background-size: 100% 4px;
        }
        .custom-scroll::-webkit-scrollbar { width: 2px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}


