import { useEffect, useRef } from 'react';

function MiniPlayer({ player, stream, score }) {
  const videoRef = useRef(null);
  const scoreColor = score >= 80 ? '#4ade80' : score >= 50 ? '#facc15' : score > 0 ? '#f87171' : '#888';

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  return (
    <div className="mini-player">
      <div className="mini-player-name">{player.name}</div>
      <div className="mini-canvas-wrap" style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
        />
        {!stream && (
          <div className="mini-placeholder" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            &#128372;
          </div>
        )}
      </div>
      {score > 0 && (
        <div className="mini-score" style={{ color: scoreColor }}>{score} pts</div>
      )}
    </div>
  );
}

export default function OtherPlayers({ players, streams, scores }) {
  const slots = [...players];
  while (slots.length < 3) slots.push(null);

  return (
    <div className="other-players">
      {slots.slice(0, 3).map((player, i) =>
        player ? (
          <MiniPlayer
            key={player.id}
            player={player}
            stream={streams?.[player.id] || null}
            score={scores[player.id] ?? 0}
          />
        ) : (
          <div key={`empty-${i}`} className="mini-player empty">
            <div className="mini-player-name">—</div>
            <div className="mini-canvas-wrap mini-empty" />
          </div>
        )
      )}
    </div>
  );
}
