import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../App.jsx';
import socket from '../socket.js';
import '../styles/neon.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results() {
  const { gameState, setGameState } = useGame();
  const { rankings, bracket, champion, players, playerId, isHost, gameMode } = gameState;
  const navigate = useNavigate();
  const isFinal = !!champion;
  const [showFinalResults, setShowFinalResults] = useState(false);

  function handleNextRound() { 
    if (gameMode === 'multiplayer') {
      socket.emit('host_next_round');
    } else {
      navigate('/solo-setup'); 
    }
  }

  function handleBackToLobby() {
    if (gameMode === 'multiplayer') {
      socket.emit('reset_tournament');
    } else {
      setGameState(s => ({ ...s, rankings: [], bracket: [], champion: null, round: 0, levelData: null }));
      navigate('/');
    }
  }

  if (showFinalResults) {
    return (
      <div style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px', background: 'var(--neon-base)' }}>
        <h1 className="font-display glow-text" style={{ color: 'white', fontSize: 36, marginBottom: 40 }}>TOURNAMENT HISTORY</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: 700 }}>
          {bracket.map((roundData, i) => (
            <div key={i} style={{ background: 'rgba(0,1,6,0.78)', border: '1px solid var(--accent)', padding: '24px 32px', boxShadow: '0 0 30px var(--glow-soft)', borderRadius: 12 }}>
              <h2 className="font-display" style={{ fontSize: 18, color: 'var(--accent)', marginBottom: 16, letterSpacing: '0.2em' }}>ROUND {roundData.round}</h2>
              {roundData.rankings.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: p.rank === 1 ? 1 : 0.6 }}>
                  <span className="font-body font-semibold" style={{ fontSize: 18, color: p.rank === 1 ? 'var(--accent)' : 'white' }}>
                    {p.rank === 1 && <span style={{ marginRight: 8 }}>👑</span>}
                    {p.name}
                  </span>
                  <span className="font-display" style={{ fontSize: 18, color: 'white' }}>{p.score}</span>
                </div>
              ))}
            </div>
          ))}
          {isFinal && (
            <div style={{ background: 'rgba(255,31,61,0.1)', border: '2px solid var(--accent)', padding: '24px 32px', textAlign: 'center', marginTop: 16, boxShadow: '0 0 40px var(--glow)', borderRadius: 12 }}>
              <div className="font-display" style={{ fontSize: 14, color: 'var(--accent)', letterSpacing: '0.3em', marginBottom: 8 }}>OVERALL CHAMPION</div>
              <div className="font-display glow-text" style={{ fontSize: 32, color: 'white' }}>{champion.name}</div>
            </div>
          )}
        </div>
        <button onClick={() => setShowFinalResults(false)} style={{ marginTop: 40, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '14px 28px', cursor: 'pointer', fontFamily: 'Audiowide, cursive', fontSize: 14, borderRadius: 8 }}>
          BACK TO RESULTS
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', zIndex: 1, width: '100vw', height: '100vh',
      overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
    }}>
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
        <span>HOME</span>
      </button>
      <div style={{ width: '100%', maxWidth: 700 }}>

        {/* Banner */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {isFinal ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>👑</div>
              <div className="font-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--accent)', marginBottom: 8 }}>CHAMPION</div>
              <div className="font-display glow-text" style={{ fontSize: 52, color: 'white', lineHeight: 1 }}>{champion.name}</div>
              {champion.id === playerId && <div className="font-body" style={{ fontSize: 14, color: 'var(--accent)', marginTop: 8, letterSpacing: '0.2em' }}>That's you!</div>}
            </>
          ) : (
            <>
              <div className="font-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--accent)', marginBottom: 8 }}>
                ROUND {bracket[bracket.length - 1]?.round || bracket.length} COMPLETE
              </div>
              <div className="font-display" style={{ fontSize: 36, color: 'white' }}>Round Results</div>
            </>
          )}
        </div>

        {/* Rankings / Round History */}
        <div style={{
          background: 'rgba(0,1,6,0.78)', border: '1px solid var(--accent)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 60px var(--glow-soft), inset 0 0 30px rgba(0,0,0,0.4)',
          padding: '32px 36px', marginBottom: 20,
        }}>
          {gameMode !== 'solo' && (
            <div className="font-body font-semibold mb-4" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>RANKINGS</div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gameMode === 'solo' ? (
              /* Solo Mode: Show all rounds history */
              bracket.length > 0 ? (
                bracket.map((roundData, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '14px 20px',
                  }}>
                    <span className="font-display" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', width: 80 }}>ROUND {roundData.round}</span>
                    <span className="font-body font-semibold" style={{ flex: 1, fontSize: 16, color: 'white' }}>{roundData.rankings[0]?.name || 'Player'}</span>
                    <span className="font-display" style={{ fontSize: 20, color: 'var(--accent)', textShadow: '0 0 10px var(--glow)' }}>{roundData.rankings[0]?.score || 0}</span>
                    <span className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>/ 100 PTS</span>
                  </div>
                ))
              ) : (
                /* Fallback if bracket is empty but we have rankings */
                rankings.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--accent)',
                    padding: '14px 20px',
                  }}>
                    <span className="font-body font-semibold" style={{ flex: 1, fontSize: 16, color: 'white' }}>{p.name}</span>
                    <span className="font-display" style={{ fontSize: 20, color: 'var(--accent)', textShadow: '0 0 10px var(--glow)' }}>{p.score}</span>
                    <span className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>/ 100 PTS</span>
                  </div>
                ))
              )
            ) : (
              /* Multiplayer Mode: Show rankings with medals */
              rankings.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: p.id === playerId ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)',
                  border: p.id === playerId ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.07)',
                  padding: '14px 20px',
                }}>
                  <span style={{ fontSize: 24, width: 32 }}>{MEDALS[i] || `#${i + 1}`}</span>
                  <span className="font-body font-semibold" style={{ flex: 1, fontSize: 16, color: 'white' }}>{p.name}</span>
                  <span className="font-display" style={{ fontSize: 20, color: 'var(--accent)', textShadow: '0 0 10px var(--glow)' }}>{p.score}</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>/ 100 PTS</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isFinal ? (
            isHost ? (
              <>
                <button onClick={handleBackToLobby} style={{
                  background: 'var(--accent)', color: 'black', border: 'none',
                  padding: '16px 36px', cursor: 'pointer',
                  fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.22em',
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                  boxShadow: '0 0 30px var(--glow)',
                }}>
                  {gameMode === 'solo' ? 'BACK TO HOME' : 'BACK TO LOBBY'}
                </button>
                {gameMode === 'multiplayer' && bracket.length > 0 && (
                  <button onClick={() => setShowFinalResults(true)} style={{
                    background: 'transparent', color: 'white',
                    border: '1.5px solid rgba(255,255,255,0.4)', padding: '16px 28px', cursor: 'pointer',
                    fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.15em',
                  }}>
                    FINAL RESULTS
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="font-body" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', width: '100%', textAlign: 'center', marginBottom: 16 }}>Waiting for host…</p>
                {gameMode === 'multiplayer' && bracket.length > 0 && (
                  <button onClick={() => setShowFinalResults(true)} style={{
                    background: 'transparent', color: 'white',
                    border: '1.5px solid rgba(255,255,255,0.4)', padding: '16px 28px', cursor: 'pointer',
                    fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.15em',
                  }}>
                    FINAL RESULTS
                  </button>
                )}
              </>
            )
          ) : (
            isHost ? (
              <>
                <button onClick={handleNextRound} style={{
                  background: 'var(--accent)', color: 'black', border: 'none',
                  padding: '16px 36px', cursor: 'pointer',
                  fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.22em',
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                  boxShadow: '0 0 30px var(--glow)',
                }}>
                  NEXT ROUND
                </button>
                <button onClick={handleBackToLobby} style={{
                  background: 'transparent', color: 'var(--accent)',
                  border: '1.5px solid var(--accent)', padding: '16px 28px', cursor: 'pointer',
                  fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.15em',
                }}>
                  {gameMode === 'solo' ? 'BACK TO HOME' : 'BACK TO LOBBY'}
                </button>
                {gameMode === 'multiplayer' && bracket.length > 0 && (
                  <button onClick={() => setShowFinalResults(true)} style={{
                    background: 'transparent', color: 'white',
                    border: '1.5px solid rgba(255,255,255,0.4)', padding: '16px 28px', cursor: 'pointer',
                    fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.15em',
                  }}>
                    FINAL RESULTS
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="font-body" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', width: '100%', textAlign: 'center', marginBottom: 16 }}>Waiting for host to start next round…</p>
                {gameMode === 'multiplayer' && bracket.length > 0 && (
                  <button onClick={() => setShowFinalResults(true)} style={{
                    background: 'transparent', color: 'white',
                    border: '1.5px solid rgba(255,255,255,0.4)', padding: '16px 28px', cursor: 'pointer',
                    fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.15em',
                  }}>
                    FINAL RESULTS
                  </button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
