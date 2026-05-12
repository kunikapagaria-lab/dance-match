import React from 'react';

export default function Leaderboard({ players, scores, round }) {
  const ranked = [...players]
    .map(p => ({ ...p, score: scores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="leaderboard">
      <div className="leaderboard-title">Round {round}/3</div>
      <div className="leaderboard-entries">
        {ranked.map((p, i) => (
          <div key={p.id} className={`lb-entry rank-${i + 1}`}>
            <span className="lb-rank">#{i + 1}</span>
            <span className="lb-name">{p.name}</span>
            <span className="lb-score">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
