import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import socket from './socket.js';
import { AVATARS } from './data/avatars.js';
import NeonBackground from './components/NeonBackground.jsx';
import LandingPage from './screens/landing/LandingPage.jsx';
import SoloSetup from './screens/SoloSetup.jsx';
import Lobby from './screens/Lobby.jsx';
import Countdown from './screens/Countdown.jsx';
import Game from './screens/Game.jsx';
import Results from './screens/Results.jsx';

export const GameContext = createContext(null);
export function useGame() { return useContext(GameContext); }

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/' || location.pathname === '/game') return null;
  return (
    <button 
      onClick={() => navigate(-1)}
      style={{
        position: 'absolute', top: 20, left: 20, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', border: '1px solid var(--accent)',
        color: 'var(--accent)', padding: '8px 16px', borderRadius: '8px',
        fontFamily: 'Audiowide, cursive', cursor: 'pointer',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 200ms', boxShadow: '0 0 10px rgba(0,0,0,0.5)'
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 31, 61, 0.2)'; e.currentTarget.style.boxShadow = '0 0 20px var(--glow-soft)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)'; }}
    >
      <span style={{ fontSize: '1.2em', transform: 'translateY(-1px)' }}>←</span> BACK
    </button>
  );
}

export default function App() {
  const navigate = useNavigate();

  const [gameState, setGameState] = useState({
    playerId: null,
    roomCode: null,
    players: [],
    isHost: false,
    level: 1,
    round: 0,
    rankings: [],
    bracket: [],
    champion: null,
    audioUrl: '',
    isYoutube: false,
    videoId: null,
    // theme
    palette: AVATARS[0].palette,
    gameMode: null, // 'solo' | 'multiplayer'
  });

  useEffect(() => {
    socket.on('room_created', ({ code, playerId }) => {
      setGameState(s => ({ ...s, roomCode: code, playerId }));
    });
    socket.on('player_joined', ({ players }) => {
      setGameState(s => ({ ...s, players }));
    });
    socket.on('player_readied', ({ players }) => {
      setGameState(s => ({ ...s, players }));
    });
    socket.on('level_changed', ({ level }) => {
      setGameState(s => ({ ...s, level }));
    });
    socket.on('all_ready', ({ level, audioUrl, videoId, isYoutube }) => {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
      fetch(`${serverUrl}/level/${level}`)
        .then(r => r.json())
        .then(levelData => setGameState(s => ({ ...s, level, audioUrl: audioUrl || '', levelData, isYoutube: !!isYoutube, videoId: videoId || null })))
        .catch(() => setGameState(s => ({ ...s, level, audioUrl: audioUrl || '', isYoutube: !!isYoutube, videoId: videoId || null })));
    });
    socket.on('navigate_countdown', () => {
      setGameState(s => ({ ...s, countdownValue: null }));
      navigate('/countdown');
    });
    socket.on('countdown', ({ value }) => {
      setGameState(s => ({ ...s, countdownValue: value }));
    });
    socket.on('dance_start', ({ serverTimestamp }) => {
      setGameState(s => ({ ...s, danceStartTime: serverTimestamp }));
      navigate('/game');
    });
    socket.on('round_result', ({ rankings, bracket }) => {
      setGameState(s => ({ ...s, rankings, bracket, champion: null }));
      navigate('/results');
    });
    socket.on('game_over', ({ champion, finalBracket }) => {
      setGameState(s => ({ ...s, champion, bracket: finalBracket }));
    });
    socket.on('navigate_lobby', () => {
      navigate('/lobby');
    });
    socket.on('tournament_reset', () => {
      setGameState(s => ({ ...s, rankings: [], bracket: [], champion: null, round: 0, levelData: null }));
      navigate('/lobby');
    });
    socket.on('join_error', ({ message }) => alert(`Could not join room: ${message}`));

    return () => {
      ['room_created','player_joined','player_readied','level_changed','all_ready',
       'navigate_countdown','countdown','dance_start','round_result','game_over','join_error'].forEach(e => socket.off(e));
    };
  }, [navigate]);

  // Sync palette CSS vars to root element
  useEffect(() => {
    const p = gameState.palette;
    if (!p) return;
    const root = document.documentElement;
    root.style.setProperty('--accent',      p.accent);
    root.style.setProperty('--accent-soft', p.accentSoft);
    root.style.setProperty('--glow',        p.glow);
    root.style.setProperty('--glow-soft',   p.glowSoft);
    root.style.setProperty('--neon-base',   p.base);
    root.style.setProperty('--neon-base2',  p.base2);
    root.style.setProperty('--neon-text',   p.text);
    root.style.setProperty('--wordmark',    p.wordmark);
  }, [gameState.palette]);

  const ctx = { gameState, setGameState };

  return (
    <GameContext.Provider value={ctx}>
      <NeonBackground />
      <BackButton />
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/solo-setup" element={<SoloSetup />} />
        <Route path="/lobby"      element={<Lobby />} />
        <Route path="/countdown"  element={<Countdown />} />
        <Route path="/game"       element={<Game />} />
        <Route path="/results"    element={<Results />} />
      </Routes>
    </GameContext.Provider>
  );
}
