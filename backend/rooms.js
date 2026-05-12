const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

function createRoom(hostId, hostName, hostAvatar) {
  const code = generateCode();
  rooms.set(code, {
    code,
    host: hostId,
    players: [{ id: hostId, name: hostName, avatar: hostAvatar, ready: false, wins: 0 }],
    level: 1,
    state: 'lobby',
    round: 0,
    bracket: [],
    scores: {},
  });
  return code;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function joinRoom(code, playerId, name, avatar) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'lobby') return { error: 'Game already started' };
  if (room.players.length >= 4) return { error: 'Room full' };
  if (room.players.find(p => p.id === playerId)) return { error: 'Already in room' };
  room.players.push({ id: playerId, name, avatar, ready: false, wins: 0 });
  return { room };
}

function setLevel(code, level) {
  const room = rooms.get(code);
  if (!room) return false;
  room.level = level;
  return true;
}

function setReady(code, playerId) {
  const room = rooms.get(code);
  if (!room) return { ready: false, allReady: false };
  const player = room.players.find(p => p.id === playerId);
  if (player) player.ready = true;
  const allReady = room.players.length >= 1 && room.players.every(p => p.ready);
  return { ready: true, allReady };
}

function startRound(code) {
  const room = rooms.get(code);
  if (!room) return false;
  room.state = 'playing';
  room.round += 1;
  room.scores = {};
  room.players.forEach(p => { p.ready = false; });
  return true;
}

function submitScore(code, playerId, avgScore, beatScores) {
  const room = rooms.get(code);
  if (!room) return null;
  room.scores[playerId] = { avgScore, beatScores };

  if (Object.keys(room.scores).length < room.players.length) return null;

  const rankings = room.players
    .map(p => ({ ...p, score: room.scores[p.id]?.avgScore ?? 0 }))
    .sort((a, b) => b.score - a.score);

  rankings[0].wins += 1;

  const bracketEntry = {
    round: room.round,
    rankings: rankings.map((p, i) => ({ id: p.id, name: p.name, score: p.score, rank: i + 1 })),
    winner: rankings[0].id,
  };
  room.bracket.push(bracketEntry);

  const champion = room.players.find(p => p.wins >= 2);
  room.state = champion ? 'finished' : 'lobby';
  room.players.forEach(p => { p.ready = false; });

  return { rankings, bracket: room.bracket, champion: champion || null };
}

function removePlayer(playerId) {
  for (const [code, room] of rooms) {
    const idx = room.players.findIndex(p => p.id === playerId);
    if (idx === -1) continue;
    room.players.splice(idx, 1);
    if (room.players.length === 0) {
      rooms.delete(code);
    } else if (room.host === playerId) {
      room.host = room.players[0].id;
    }
    return { code, room };
  }
  return null;
}

function getRoomByPlayer(playerId) {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === playerId)) return room;
  }
  return null;
}

module.exports = { createRoom, getRoom, joinRoom, setLevel, setReady, startRound, submitScore, removePlayer, getRoomByPlayer };
