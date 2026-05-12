import React from 'react';

export default function Bracket({ bracket, players }) {
  if (!bracket || bracket.length === 0) {
    return <div className="bracket-empty">No rounds played yet</div>;
  }

  return (
    <div className="bracket">
      {bracket.map((round) => (
        <div key={round.round} className="bracket-round">
          <div className="bracket-round-label">Round {round.round}</div>
          <div className="bracket-rankings">
            {round.rankings.map((entry, i) => {
              const player = players.find(p => p.id === entry.id);
              const isWinner = entry.id === round.winner;
              return (
                <div
                  key={entry.id}
                  className={`bracket-entry ${isWinner ? 'winner' : ''} rank-${entry.rank}`}
                >
                  <span className="bracket-rank">#{entry.rank}</span>
                  <span className="bracket-name">{player?.name ?? entry.name}</span>
                  <span className="bracket-score">{entry.score}</span>
                  {isWinner && <span className="bracket-crown">&#128081;</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
