function aggregateScores(beatScores) {
  if (!beatScores || beatScores.length === 0) return 0;
  const sum = beatScores.reduce((acc, s) => acc + s, 0);
  return Math.round(sum / beatScores.length);
}

function rankPlayers(scoreMap) {
  return Object.entries(scoreMap)
    .map(([id, data]) => ({ id, score: data.avgScore || 0, beatScores: data.beatScores || [] }))
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

module.exports = { aggregateScores, rankPlayers };
