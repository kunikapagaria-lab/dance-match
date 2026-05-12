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

  function handleNextRound() { socket.emit('start_game'); }

  function handleBackToLobby() {
    setGameState(s => ({ ...s, rankings: [], bracket: [], champion: null, round: 0, levelData: null }));
    navigate(gameMode === 'solo' ? '/' : '/lobby');
  }

  return (
    <div style={{
      position: 'relative', zIndex: 1, width: '100vw', height: '100vh',
      overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
    }}>
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
              <div className="font-display" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'var(--accent)', marginBottom: 8 }}>ROUND {bracket.length} COMPLETE</div>
              <div className="font-display" style={{ fontSize: 36, color: 'white' }}>Round Results</div>
            </>
          )}
        </div>

        {/* Rankings */}
        <div style={{
          background: 'rgba(0,1,6,0.78)', border: '1px solid var(--accent)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 60px var(--glow-soft), inset 0 0 30px rgba(0,0,0,0.4)',
          padding: '32px 36px', marginBottom: 20,
        }}>
          <div className="font-body font-semibold mb-4" style={{ fontSize: 11, letterSpacing: '0.35em', color: 'var(--accent)', opacity: 0.8 }}>RANKINGS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rankings.map((p, i) => (
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
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isFinal ? (
            isHost ? (
              <button onClick={handleBackToLobby} style={{
                background: 'var(--accent)', color: 'black', border: 'none',
                padding: '16px 36px', cursor: 'pointer',
                fontFamily: 'Audiowide, cursive', fontSize: 12, letterSpacing: '0.22em',
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                boxShadow: '0 0 30px var(--glow)',
              }}>
                {gameMode === 'solo' ? 'BACK TO HOME' : 'BACK TO LOBBY'}
              </button>
            ) : (
              <p className="font-body" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>Waiting for host…</p>
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
                  BACK TO LOBBY
                </button>
              </>
            ) : (
              <p className="font-body" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>Waiting for host to start next round…</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
