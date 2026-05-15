const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { createRoom, getRoom, joinRoom, setLevel, setReady, startRound, submitScore, removePlayer, getRoomByPlayer } = require('./rooms');

const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 4000;

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
);

// Pre-built levels 1-5
const danceData = {};
const dataDir = path.join(__dirname, 'dance_data');
for (let i = 1; i <= 5; i++) {
  try {
    danceData[i] = JSON.parse(fs.readFileSync(path.join(dataDir, `level${i}.json`), 'utf8'));
  } catch (e) {
    console.warn(`Could not load level${i}.json`);
  }
}

// Custom levels in memory — restored from Supabase on startup
const customLevels = {};

async function restoreFromSupabase() {
  if (!process.env.SUPABASE_URL) return;
  try {
    const { data, error } = await supabase.from('custom_levels').select('id, data');
    if (error) throw error;
    for (const row of data) customLevels[row.id] = row.data;
    console.log(`Restored ${data.length} levels from Supabase`);
  } catch (e) {
    console.warn('Could not restore from Supabase:', e.message);
  }
}
restoreFromSupabase();

// ── REST Endpoints ─────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true }));

// Fetch a level's full pose data (built-in or custom)
app.get('/level/:id', (req, res) => {
  const id = req.params.id;
  const numId = parseInt(id);
  if (!isNaN(numId) && danceData[numId]) return res.json(danceData[numId]);
  if (customLevels[id]) return res.json(customLevels[id]);
  res.status(404).json({ error: 'Level not found' });
});

// List all custom levels (metadata only — no frames)
app.get('/custom-levels', (req, res) => {
  const list = Object.entries(customLevels).map(([id, data]) => ({
    id,
    type: data.type || 'upload',
    cloudinaryUrl: data.cloudinaryUrl || null,
    originalFilename: data.originalFilename || null,
    duration: data.duration || 0,
  }));
  res.json(list);
});

// Save a level whose poses were extracted in the browser
app.post('/save-level', async (req, res) => {
  const { id, type, duration, fps, frames, cloudinaryUrl, originalFilename } = req.body;
  if (!id || !Array.isArray(frames) || !cloudinaryUrl) {
    return res.status(400).json({ error: 'Missing required fields: id, frames, cloudinaryUrl' });
  }

  const data = {
    type: type || 'upload',
    duration: duration || 0,
    fps: fps || 10,
    frames,
    cloudinaryUrl,
    originalFilename: originalFilename || '',
  };
  customLevels[id] = data;

  if (process.env.SUPABASE_URL) {
    const { error } = await supabase.from('custom_levels').upsert({ id, data });
    if (error) console.warn('Supabase save failed (level kept in memory):', error.message);
  }

  res.json({ success: true, id });
});

// Delete a custom level
app.delete('/level/:id', async (req, res) => {
  const id = req.params.id;
  if (!customLevels[id]) return res.status(404).json({ error: 'Level not found' });

  delete customLevels[id];

  if (process.env.SUPABASE_URL) {
    const { error } = await supabase.from('custom_levels').delete().eq('id', id);
    if (error) console.warn('Supabase delete error:', error.message);
  }

  res.json({ success: true });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('connect', socket.id);

  socket.on('create_room', ({ name, avatar }) => {
    const code = createRoom(socket.id, name || 'Player', avatar || 'default');
    socket.join(code);
    socket.emit('room_created', { code, playerId: socket.id });
    const room = getRoom(code);
    io.to(code).emit('player_joined', { players: room.players });
  });

  socket.on('join_room', ({ code, name, avatar }) => {
    const result = joinRoom(code, socket.id, name || 'Player', avatar || 'default');
    if (result.error) {
      socket.emit('join_error', { message: result.error });
      return;
    }
    socket.join(code);
    socket.emit('room_created', { code, playerId: socket.id });
    io.to(code).emit('player_joined', { players: result.room.players });
  });

  socket.on('set_level', ({ level }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.host !== socket.id) return;
    setLevel(room.code, level);
    io.to(room.code).emit('level_changed', { level });
  });

  socket.on('reset_tournament', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.host !== socket.id) return;
    room.round = 0;
    room.bracket = [];
    room.state = 'lobby';
    room.scores = {};
    room.players.forEach(p => { p.wins = 0; p.ready = false; });
    io.to(room.code).emit('tournament_reset');
  });

  socket.on('host_next_round', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.host !== socket.id) return;
    room.state = 'lobby';
    room.players.forEach(p => { p.ready = false; });
    io.to(room.code).emit('navigate_lobby');
  });

  socket.on('player_ready', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    const { allReady } = setReady(room.code, socket.id);
    io.to(room.code).emit('player_readied', { playerId: socket.id, players: room.players });
    if (allReady) {
      const levelId = room.level;
      const numId = typeof levelId === 'number' ? levelId : parseInt(levelId);
      const isBuiltIn = !isNaN(numId) && danceData[numId];
      const levelData = isBuiltIn ? danceData[numId] : customLevels[levelId];

      io.to(room.code).emit('all_ready', {
        level: levelId,
        audioUrl: levelData?.audioUrl || '',
        videoId: levelData?.videoId || null,
        isYoutube: levelData?.type === 'youtube',
      });
    }
  });

  socket.on('go_to_countdown', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.host !== socket.id) return;
    io.to(room.code).emit('navigate_countdown');
  });

  socket.on('start_game', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.host !== socket.id) return;
    startRound(room.code);

    let count = 5;
    const interval = setInterval(() => {
      io.to(room.code).emit('countdown', { value: count });
      count -= 1;
      if (count < 0) {
        clearInterval(interval);
        io.to(room.code).emit('dance_start', { serverTimestamp: Date.now() + 4000 });
      }
    }, 1000);
  });

  socket.on('pose_update', ({ landmarks, beat }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    socket.to(room.code).emit('players_poses', {
      poses: { [socket.id]: { landmarks, beat } },
    });
  });

  socket.on('toggle_pause', ({ isPaused }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.host !== socket.id) return;
    io.to(room.code).emit('game_paused', { isPaused });
  });

  socket.on('submit_score', ({ avgScore, beatScores }) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    const result = submitScore(room.code, socket.id, avgScore, beatScores);
    if (!result) return;

    const { rankings, bracket, champion } = result;
    io.to(room.code).emit('round_result', { rankings, bracket });
    io.to(room.code).emit('bracket_update', {
      bracket,
      matchWinner: rankings[0]?.id || null,
    });

    if (champion) {
      io.to(room.code).emit('game_over', {
        champion: { id: champion.id, name: champion.name },
        finalBracket: bracket,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    const result = removePlayer(socket.id);
    if (result) {
      io.to(result.code).emit('player_joined', { players: result.room.players });
    }
  });

  socket.on('leave_room', () => {
    const result = removePlayer(socket.id);
    if (result) {
      socket.leave(result.code);
      io.to(result.code).emit('player_joined', { players: result.room.players });
    }
  });
});

server.listen(PORT, () => console.log(`DanceMatch server on port ${PORT}`));
