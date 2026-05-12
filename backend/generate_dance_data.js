const fs = require('fs');
const path = require('path');

// Build a full 33-landmark array from key joint positions
function makeLandmarks({ hx = 0.50, hy = 0.08, ls, rs, le, re, lw, rw, lh, rh, lk, rk, la, ra }) {
  const lw2 = lw || [0.36, 0.52];
  const rw2 = rw || [0.64, 0.52];
  const la2 = la || [0.44, 0.88];
  const ra2 = ra || [0.56, 0.88];
  return [
    { x: hx,        y: hy,         z: 0 }, // 0 nose
    { x: hx - 0.02, y: hy - 0.01,  z: 0 }, // 1 l eye inner
    { x: hx - 0.03, y: hy - 0.01,  z: 0 }, // 2 l eye
    { x: hx - 0.04, y: hy - 0.01,  z: 0 }, // 3 l eye outer
    { x: hx + 0.02, y: hy - 0.01,  z: 0 }, // 4 r eye inner
    { x: hx + 0.03, y: hy - 0.01,  z: 0 }, // 5 r eye
    { x: hx + 0.04, y: hy - 0.01,  z: 0 }, // 6 r eye outer
    { x: hx - 0.06, y: hy,          z: 0 }, // 7 l ear
    { x: hx + 0.06, y: hy,          z: 0 }, // 8 r ear
    { x: hx - 0.01, y: hy + 0.02,   z: 0 }, // 9 mouth l
    { x: hx + 0.01, y: hy + 0.02,   z: 0 }, // 10 mouth r
    { x: ls[0],     y: ls[1],        z: 0 }, // 11 l shoulder
    { x: rs[0],     y: rs[1],        z: 0 }, // 12 r shoulder
    { x: le[0],     y: le[1],        z: 0 }, // 13 l elbow
    { x: re[0],     y: re[1],        z: 0 }, // 14 r elbow
    { x: lw2[0],    y: lw2[1],       z: 0 }, // 15 l wrist
    { x: rw2[0],    y: rw2[1],       z: 0 }, // 16 r wrist
    { x: lw2[0] - 0.01, y: lw2[1] + 0.02, z: 0 }, // 17 l pinky
    { x: rw2[0] + 0.01, y: rw2[1] + 0.02, z: 0 }, // 18 r pinky
    { x: lw2[0] - 0.01, y: lw2[1] + 0.01, z: 0 }, // 19 l index
    { x: rw2[0] + 0.01, y: rw2[1] + 0.01, z: 0 }, // 20 r index
    { x: lw2[0],    y: lw2[1],       z: 0 }, // 21 l thumb
    { x: rw2[0],    y: rw2[1],       z: 0 }, // 22 r thumb
    { x: lh[0],     y: lh[1],        z: 0 }, // 23 l hip
    { x: rh[0],     y: rh[1],        z: 0 }, // 24 r hip
    { x: lk[0],     y: lk[1],        z: 0 }, // 25 l knee
    { x: rk[0],     y: rk[1],        z: 0 }, // 26 r knee
    { x: la2[0],    y: la2[1],       z: 0 }, // 27 l ankle
    { x: ra2[0],    y: ra2[1],       z: 0 }, // 28 r ankle
    { x: la2[0],    y: la2[1] + 0.02, z: 0 }, // 29 l heel
    { x: ra2[0],    y: ra2[1] + 0.02, z: 0 }, // 30 r heel
    { x: la2[0] + 0.02, y: la2[1] + 0.05, z: 0 }, // 31 l foot index
    { x: ra2[0] - 0.02, y: ra2[1] + 0.05, z: 0 }, // 32 r foot index
  ];
}

// ── Named poses ───────────────────────────────────────────────────────────────
const BASE = {
  hx: 0.50, hy: 0.08,
  ls: [0.42, 0.22], rs: [0.58, 0.22],
  lh: [0.44, 0.52], rh: [0.56, 0.52],
  lk: [0.44, 0.70], rk: [0.56, 0.70],
  la: [0.44, 0.88], ra: [0.56, 0.88],
};

const POSES = {
  neutral:   { ...BASE, le: [0.38, 0.38], re: [0.62, 0.38], lw: [0.36, 0.52], rw: [0.64, 0.52] },
  armsUp:    { ...BASE, le: [0.42, 0.12], re: [0.58, 0.12], lw: [0.42, 0.02], rw: [0.58, 0.02] },
  armsOut:   { ...BASE, le: [0.25, 0.22], re: [0.75, 0.22], lw: [0.12, 0.22], rw: [0.88, 0.22] },
  lUpROut:   { ...BASE, le: [0.42, 0.12], lw: [0.42, 0.02], re: [0.75, 0.22], rw: [0.88, 0.22] },
  lOutRUp:   { ...BASE, le: [0.25, 0.22], lw: [0.12, 0.22], re: [0.58, 0.12], rw: [0.58, 0.02] },
  handsHips: { ...BASE, le: [0.40, 0.40], re: [0.60, 0.40], lw: [0.42, 0.52], rw: [0.58, 0.52] },
  armsCross: { ...BASE, le: [0.50, 0.32], re: [0.50, 0.32], lw: [0.56, 0.26], rw: [0.44, 0.26] },
  diagL:     { ...BASE, le: [0.32, 0.14], lw: [0.24, 0.04], re: [0.65, 0.42], rw: [0.70, 0.54] },
  diagR:     { ...BASE, le: [0.35, 0.42], lw: [0.30, 0.54], re: [0.68, 0.14], rw: [0.76, 0.04] },
  squat: {
    hx: 0.50, hy: 0.13,
    ls: [0.42, 0.27], rs: [0.58, 0.27],
    le: [0.38, 0.43], re: [0.62, 0.43], lw: [0.36, 0.56], rw: [0.64, 0.56],
    lh: [0.42, 0.56], rh: [0.58, 0.56],
    lk: [0.38, 0.68], rk: [0.62, 0.68],
    la: [0.38, 0.82], ra: [0.62, 0.82],
  },
  squatArmsUp: {
    hx: 0.50, hy: 0.13,
    ls: [0.42, 0.27], rs: [0.58, 0.27],
    le: [0.42, 0.16], re: [0.58, 0.16], lw: [0.42, 0.06], rw: [0.58, 0.06],
    lh: [0.42, 0.56], rh: [0.58, 0.56],
    lk: [0.38, 0.68], rk: [0.62, 0.68],
    la: [0.38, 0.82], ra: [0.62, 0.82],
  },
  lStep: { ...BASE, le: [0.38, 0.38], re: [0.62, 0.38], lw: [0.36, 0.52], rw: [0.64, 0.52], lk: [0.40, 0.70], la: [0.34, 0.88] },
  rStep: { ...BASE, le: [0.38, 0.38], re: [0.62, 0.38], lw: [0.36, 0.52], rw: [0.64, 0.52], rk: [0.60, 0.70], ra: [0.66, 0.88] },
  waveLUp:   { ...BASE, le: [0.32, 0.18], lw: [0.26, 0.10], re: [0.62, 0.38], rw: [0.64, 0.52] },
  waveRUp:   { ...BASE, le: [0.38, 0.38], lw: [0.36, 0.52], re: [0.68, 0.18], rw: [0.74, 0.10] },
  lUpRDown:  { ...BASE, le: [0.42, 0.12], lw: [0.42, 0.02], re: [0.62, 0.44], rw: [0.64, 0.58] },
  rUpLDown:  { ...BASE, le: [0.38, 0.44], lw: [0.36, 0.58], re: [0.58, 0.12], rw: [0.58, 0.02] },
  bothFwd:   { ...BASE, le: [0.44, 0.30], re: [0.56, 0.30], lw: [0.44, 0.20], rw: [0.56, 0.20] },
  lKick: {
    ...BASE,
    le: [0.38, 0.38], re: [0.62, 0.38], lw: [0.36, 0.52], rw: [0.64, 0.52],
    lk: [0.40, 0.58], lh: [0.44, 0.52], la: [0.38, 0.44],
  },
  rKick: {
    ...BASE,
    le: [0.38, 0.38], re: [0.62, 0.38], lw: [0.36, 0.52], rw: [0.64, 0.52],
    rk: [0.60, 0.58], rh: [0.56, 0.52], ra: [0.62, 0.44],
  },
};

function beat(n, bpm, pose, holdFrames, tolerance) {
  return {
    beat: n,
    timestamp: parseFloat(((n - 1) * 60 / bpm).toFixed(3)),
    landmarks: makeLandmarks(POSES[pose]),
    holdFrames,
    tolerance,
  };
}

// ── Level definitions ─────────────────────────────────────────────────────────
const levels = [
  {
    level: 1, name: 'Groove Starter', bpm: 85,
    audioUrl: 'https://freemusicarchive.org/file/music/ccCommunity/Kai_Engel/Satin/Kai_Engel_-_Interlude.mp3',
    tolerance: 0.65, holdFrames: 8,
    sequence: [
      'neutral','armsOut','neutral','armsUp','neutral','lUpROut','neutral','lOutRUp',
      'handsHips','armsOut','squatArmsUp','neutral','lUpRDown','rUpLDown','armsCross','neutral',
    ],
  },
  {
    level: 2, name: 'Street Heat', bpm: 100,
    audioUrl: 'https://freemusicarchive.org/file/music/ccCommunity/Scott_Holmes/Inspiring_Cinematic/Scott_Holmes_-_Adventure.mp3',
    tolerance: 0.72, holdFrames: 6,
    sequence: [
      'neutral','armsOut','armsUp','neutral','lUpROut','lOutRUp','handsHips','diagL',
      'diagR','neutral','armsCross','armsUp','lStep','rStep','neutral','lUpROut',
      'armsOut','diagL','squatArmsUp','neutral','lOutRUp','rUpLDown','lUpRDown','neutral',
    ],
  },
  {
    level: 3, name: 'Neon Pulse', bpm: 118,
    audioUrl: 'https://freemusicarchive.org/file/music/ccCommunity/BoxCat_Games/Nameless_The_Hackers_RPG_Soundtrack/BoxCat_Games_-_Epic_Song.mp3',
    tolerance: 0.80, holdFrames: 5,
    sequence: [
      'neutral','armsUp','armsOut','diagL','diagR','lUpROut','lOutRUp','armsCross',
      'squat','armsUp','handsHips','diagL','lStep','rStep','armsOut','diagR',
      'neutral','lUpRDown','rUpLDown','squatArmsUp','diagL','armsUp','waveLUp','waveRUp',
      'lOutRUp','armsOut','armsCross','neutral',
    ],
  },
  {
    level: 4, name: 'Rhythm Riot', bpm: 128,
    audioUrl: 'https://freemusicarchive.org/file/music/Music_for_Video/Jahzzar/Tumbling_Dishes_Like_Old-Mans-Clothes/Jahzzar_-_Dont_Stop.mp3',
    tolerance: 0.87, holdFrames: 4,
    sequence: [
      'neutral','armsUp','diagL','armsOut','diagR','lUpROut','armsCross','lOutRUp',
      'squat','diagL','armsUp','rUpLDown','lUpRDown','handsHips','armsOut','waveLUp',
      'waveRUp','diagR','squatArmsUp','armsUp','lStep','diagL','rStep','diagR',
      'lOutRUp','armsOut','armsCross','lUpROut','neutral','diagL','armsUp','neutral',
    ],
  },
  {
    level: 5, name: 'Pro Breakdown', bpm: 140,
    audioUrl: 'https://freemusicarchive.org/file/music/ccCommunity/Rolemusic/Rolemusic_s_2012_collection_vol_1/Rolemusic_-_Organic_Minimal_Disco.mp3',
    tolerance: 0.95, holdFrames: 3,
    sequence: [
      'neutral','armsUp','diagL','diagR','armsOut','lUpROut','lOutRUp','armsCross',
      'squat','diagL','armsUp','rUpLDown','lUpRDown','lKick','rKick','waveLUp',
      'waveRUp','squatArmsUp','diagR','armsUp','lStep','diagL','rStep','diagR',
      'lOutRUp','armsOut','armsCross','lUpROut','bothFwd','diagL','armsUp','neutral',
    ],
  },
];

const outDir = path.join(__dirname, 'dance_data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const lvl of levels) {
  const beats = lvl.sequence.map((pose, i) =>
    beat(i + 1, lvl.bpm, pose, lvl.holdFrames, lvl.tolerance)
  );
  const totalBeats = beats.length;
  const duration = parseFloat(((totalBeats * 60) / lvl.bpm).toFixed(2));
  const data = {
    level: lvl.level,
    name: lvl.name,
    bpm: lvl.bpm,
    audioUrl: lvl.audioUrl,
    duration,
    beats,
  };
  fs.writeFileSync(path.join(outDir, `level${lvl.level}.json`), JSON.stringify(data, null, 2));
  console.log(`Generated level${lvl.level}.json — ${totalBeats} beats, ${duration}s`);
}
console.log('Done.');
