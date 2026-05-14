const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const { createRoom, getRoom, joinRoom, setLevel, setReady, startRound, submitScore, removePlayer, getRoomByPlayer } = require('./rooms');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 4000;

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const EXTRACT_SCRIPT = path.join(__dirname, 'extract_poses.py');
const CUSTOM_DIR = path.join(__dirname, 'dance_data', 'custom');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(CUSTOM_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer: save uploaded videos to uploads/ with their level ID as filename
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const jobId = Math.random().toString(36).slice(2, 10);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${jobId}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
  fileFilter: (_, file, cb) => {
    const ok = file.mimetype.startsWith('video/');
    cb(ok ? null : new Error('Only video files are allowed'), ok);
  },
});

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

// Custom YouTube levels (in-memory, also persisted to disk)
const customLevels = {};
// Load any previously processed custom levels from disk on startup
try {
  for (const file of fs.readdirSync(CUSTOM_DIR)) {
    if (!file.endsWith('.json')) continue;
    const id = file.replace('.json', '');
    try {
      customLevels[id] = JSON.parse(fs.readFileSync(path.join(CUSTOM_DIR, file), 'utf8'));
    } catch (_) { /* skip corrupt files */ }
  }
} catch (_) { /* custom dir doesn't exist yet */ }

// In-memory processing jobs: jobId -> { status, progress, message, levelId, videoId, error }
const jobs = new Map();

function generateJobId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── REST Endpoints ─────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true }));

// Existing + custom level fetch
app.get('/level/:id', (req, res) => {
  const id = req.params.id;
  // Numeric built-in level
  const numId = parseInt(id);
  if (!isNaN(numId) && danceData[numId]) return res.json(danceData[numId]);
  // Custom YouTube level
  if (customLevels[id]) return res.json(customLevels[id]);
  // Try loading from disk (race-condition safety)
  const diskPath = path.join(CUSTOM_DIR, `${id}.json`);
  if (fs.existsSync(diskPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
      customLevels[id] = data;
      return res.json(data);
    } catch (_) {}
  }
  res.status(404).json({ error: 'Level not found' });
});

// Get all custom uploaded levels
app.get('/custom-levels', (req, res) => {
  const levelsList = Object.entries(customLevels).map(([id, data]) => ({
    id,
    type: data.type || (data.videoFile ? 'upload' : 'youtube'),
    videoFile: data.videoFile || null,
    duration: data.duration || 0,
    videoId: data.videoId || null
  }));
  res.json(levelsList);
});

// Delete a custom level
app.delete('/level/:id', (req, res) => {
  const id = req.params.id;
  const levelData = customLevels[id];
  
  if (!levelData) {
    return res.status(404).json({ error: 'Level not found' });
  }
  
  try {
    const jsonPath = path.join(CUSTOM_DIR, `${id}.json`);
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    
    if (levelData.type === 'upload' && levelData.videoFile) {
      const videoPath = path.join(UPLOADS_DIR, levelData.videoFile);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    }
    
    delete customLevels[id];
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete level files' });
  }
});

// Start video processing job
app.post('/process-video', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url in request body' });
  }

  const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//;
  if (!youtubePattern.test(url)) {
    return res.status(400).json({ error: 'URL must be a YouTube link' });
  }

  const jobId = generateJobId();
  const levelId = `yt_${jobId}`;
  const outputPath = path.join(CUSTOM_DIR, `${levelId}.json`);

  jobs.set(jobId, { status: 'processing', progress: 0, message: 'Starting…', levelId, videoId: null });

  // Spawn Python extraction subprocess
  const child = spawn(PYTHON_BIN, [EXTRACT_SCRIPT, url, outputPath, '10'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MEDIAPIPE_DISABLE_GPU: '1' },
  });

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    const job = jobs.get(jobId);
    if (!job) return;
    for (const line of lines) {
      if (line.startsWith('PROGRESS:')) {
        job.progress = parseInt(line.slice(9)) || job.progress;
      } else if (line.startsWith('STATUS:')) {
        job.message = line.slice(7).trim();
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    console.error(`[job ${jobId}] stderr:`, chunk.toString());
  });

  child.on('close', (code) => {
    const job = jobs.get(jobId);
    if (!job) return;
    if (code === 0 && fs.existsSync(outputPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        customLevels[levelId] = data;
        job.status = 'done';
        job.progress = 100;
        job.message = 'Done';
        job.videoId = data.videoId;
      } catch (e) {
        job.status = 'error';
        job.message = 'Failed to parse output JSON';
      }
    } else {
      // Surface the last STATUS:ERROR message if available, otherwise generic
      const lastMsg = job.message || '';
      job.status = 'error';
      job.message = lastMsg.startsWith('ERROR:')
        ? lastMsg.slice(6).trim()
        : `Process exited with code ${code}`;
    }
  });

  child.on('error', (err) => {
    const job = jobs.get(jobId);
    if (job) { job.status = 'error'; job.message = err.message; }
  });

  res.json({ jobId, levelId });
});

// Poll job status
app.get('/job-status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Upload a local video file, then run pose extraction on it
app.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file received' });

  const videoPath = req.file.path;
  const baseName  = path.basename(req.file.filename, path.extname(req.file.filename)); // e.g. upload_abc123
  const levelId   = baseName;
  const jobId     = Math.random().toString(36).slice(2, 10);
  const outputPath = path.join(CUSTOM_DIR, `${levelId}.json`);

  jobs.set(jobId, { status: 'processing', progress: 0, message: 'Starting…', levelId, videoId: null });

  const child = spawn(PYTHON_BIN, [EXTRACT_SCRIPT, videoPath, outputPath, '10'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MEDIAPIPE_DISABLE_GPU: '1' },
  });

  child.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    const job = jobs.get(jobId);
    if (!job) return;
    for (const line of lines) {
      if (line.startsWith('PROGRESS:')) {
        job.progress = parseInt(line.slice(9)) || job.progress;
      } else if (line.startsWith('STATUS:')) {
        job.message = line.slice(7).trim();
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    console.error(`[upload job ${jobId}] stderr:`, chunk.toString());
  });

  child.on('close', (code) => {
    const job = jobs.get(jobId);
    if (!job) return;
    if (code === 0 && fs.existsSync(outputPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        // Store video filename so client can stream it
        data.videoFile = req.file.filename;
        fs.writeFileSync(outputPath, JSON.stringify(data));
        customLevels[levelId] = data;
        job.status   = 'done';
        job.progress = 100;
        job.message  = 'Done';
        job.levelId  = levelId;
      } catch (e) {
        job.status  = 'error';
        job.message = 'Failed to parse output JSON';
      }
    } else {
      const lastMsg = job.message || '';
      job.status  = 'error';
      job.message = lastMsg.startsWith('ERROR:') ? lastMsg.slice(6).trim() : `Process exited with code ${code}`;
    }
  });

  child.on('error', (err) => {
    const job = jobs.get(jobId);
    if (job) { job.status = 'error'; job.message = err.message; }
  });

  res.json({ jobId, levelId });
});

// Stream an uploaded video file to the browser
app.get('/video/:levelId', (req, res) => {
  const level = customLevels[req.params.levelId];
  if (!level || !level.videoFile) return res.status(404).json({ error: 'Video not found' });

  const filePath = path.join(UPLOADS_DIR, level.videoFile);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Video file missing on disk' });

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    // Support byte-range requests so the <video> element can seek
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end   = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type':   'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
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
        // For YouTube levels, tell clients the videoId so they can embed the player
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
        // 4-second buffer so clients can pre-load and YouTube iframe can initialise
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
