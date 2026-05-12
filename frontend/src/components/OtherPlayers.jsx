import React, { useRef } from 'react';
import PoseOverlay from './PoseOverlay.jsx';

function MiniPlayer({ player, pose, score }) {
  const canvasRef = useRef(null);
  const landmarks = pose?.landmarks ?? null;

  const scoreColor = score >= 80 ? '#4ade80' : score >= 50 ? '#facc15' : score > 0 ? '#f87171' : '#888';

  return (
    <div className="mini-player">
      <div className="mini-player-name">{player.name}</div>
      <div className="mini-canvas-wrap">
        <canvas ref={canvasRef} width={180} height={240} className="mini-canvas" />
        {landmarks && (
          <PoseOverlay canvasRef={canvasRef} landmarks={landmarks} color="#60a5fa" lineWidth={2} dotRadius={3} />
        )}
        {!landmarks && (
          <div className="mini-placeholder">&#128372;</div>
        )}
      </div>
      {score > 0 && (
        <div className="mini-score" style={{ color: scoreColor }}>{score} pts</div>
      )}
    </div>
  );
}

export default function OtherPlayers({ players, poses, scores }) {
  const slots = [...players];
  while (slots.length < 3) slots.push(null);

  return (
    <div className="other-players">
      {slots.slice(0, 3).map((player, i) =>
        player ? (
          <MiniPlayer
            key={player.id}
            player={player}
            pose={poses[player.id]}
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
