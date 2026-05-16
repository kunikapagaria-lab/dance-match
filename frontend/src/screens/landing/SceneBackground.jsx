import { useEffect, useRef } from 'react';

// ── constants ─────────────────────────────────────────────────────────────────
const HEX_R        = 95;
const COL_W        = HEX_R * Math.sqrt(3);
const ROW_H        = HEX_R * 1.5;
const HEX_R2       = HEX_R * 1.4;          // depth-layer hex size
const COL_W2       = HEX_R2 * Math.sqrt(3);
const ROW_H2       = HEX_R2 * 1.5;
const AMBIENT_CNT  = 6;
const TRAIL_LEN    = 30;
const SCAN_SPEED   = 110;                    // px / second
const RIPPLE_MAXR  = 400;
const GRAVITY_PX   = 6;                     // max vertex pull toward cursor

// ── helpers ───────────────────────────────────────────────────────────────────
function parseHex(hex = '#ff1f3d') {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

function hexVerts(cx, cy, r = HEX_R, hot = null) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    let x = cx + r * Math.cos(a);
    let y = cy + r * Math.sin(a);
    if (hot) {
      const d = Math.hypot(x - hot.x, y - hot.y);
      const pull = Math.max(0, 1 - d / 220) * GRAVITY_PX;
      if (d > 0) { x += (hot.x - x) / d * pull; y += (hot.y - y) / d * pull; }
    }
    return { x, y };
  });
}

function buildGrid(w, h, r, cw, rh, offX = 0, offY = 0) {
  const cols = Math.ceil(w / cw) + 3;
  const rows = Math.ceil(h / rh) + 3;
  const out  = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++)
      out.push({ cx: col * cw + (row % 2 ? cw / 2 : 0) - cw + offX,
                 cy: row * rh - rh + offY });
  return out;
}


function makeAmbient(hexes) {
  return Array.from({ length: AMBIENT_CNT }, (_, i) => ({
    hi:    Math.floor((i / AMBIENT_CNT + 0.05) * hexes.length),
    phase: (i / AMBIENT_CNT) * Math.PI * 2,
    freq:  0.35 + Math.random() * 0.4,
    peak:  0.5  + Math.random() * 0.35,
    nextSwap: performance.now() + 3000 + Math.random() * 4000,
  }));
}

function bloomCol({ r, g, b }) {
  const max = Math.max(r, g, b);
  if (max === r) return { r: Math.min(255, r+25), g: Math.min(255, g+12), b };
  if (max === b) return { r, g: Math.min(255, g+18), b: Math.min(255, b+8) };
  return { r: Math.min(255, r+10), g: Math.min(255, g+10), b: Math.min(255, b+10) };
}

function drawEdge(ctx, v1, v2, core, intensity) {
  if (intensity < 0.02) return;
  const bloom = bloomCol(core);
  const { r, g, b } = core;
  const { r: br, g: bg, b: bb } = bloom;

  ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y);
  ctx.lineWidth   = 16;
  ctx.strokeStyle = `rgba(${br},${bg},${bb},${(intensity * 0.14).toFixed(3)})`;
  ctx.stroke();

  ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y);
  ctx.lineWidth   = 5;
  ctx.strokeStyle = `rgba(${br},${bg},${bb},${(intensity * 0.38).toFixed(3)})`;
  ctx.stroke();

  ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y);
  ctx.lineWidth   = 1.3;
  ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(0.95, intensity * 0.92).toFixed(3)})`;
  ctx.stroke();
}

// ── component ──────────────────────────────────────────────────────────────────
export default function SceneBackground({ palette }) {
  const canvasRef = useRef(null);
  const colorRef  = useRef(parseHex('#ff1f3d'));

  useEffect(() => {
    if (palette?.accent) colorRef.current = parseHex(palette.accent);
  }, [palette?.accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const dpr    = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0;
    let hexes = [], hexes2 = [];
    let ambient = [];
    let ripples  = [];                   // [{ x,y,t,speed }]
    let trail    = [];                   // [{ x, y }]
    let scanY    = 0;
    let rafId;
    let lastTime = performance.now();

    // smooth display colour (avatar transition)
    let dispCol = { ...colorRef.current };

    let mouse = { x: 0, y: 0 };
    let hot   = { x: 0, y: 0 };

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
      hexes  = buildGrid(W, H, HEX_R,  COL_W,  ROW_H);
      hexes2 = buildGrid(W, H, HEX_R2, COL_W2, ROW_H2, COL_W2*0.5, ROW_H2*0.5);
      ambient = makeAmbient(hexes);
      mouse     = { x: W/2, y: H*0.4 }; hot = { ...mouse };
      scanY     = 0; trail = [];
    }


    function draw(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = now / 1000;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, W, H);

      // ── smooth avatar colour transition ──
      dispCol.r += (colorRef.current.r - dispCol.r) * 0.04;
      dispCol.g += (colorRef.current.g - dispCol.g) * 0.04;
      dispCol.b += (colorRef.current.b - dispCol.b) * 0.04;
      const col = { r: Math.round(dispCol.r), g: Math.round(dispCol.g), b: Math.round(dispCol.b) };

      // ── smooth hotspot + trail ──
      hot.x += (mouse.x - hot.x) * 0.06;
      hot.y += (mouse.y - hot.y) * 0.06;
      trail.push({ x: hot.x, y: hot.y });
      if (trail.length > TRAIL_LEN) trail.shift();

      // ── scan line ──
      scanY += SCAN_SPEED * dt;
      if (scanY > H + 60) scanY = -60;

      // ── ripples ──
      for (const rp of ripples) rp.t += dt * 0.9;
      ripples = ripples.filter(rp => rp.t < 1.3);

      // ── ambient ──
      const ambMap = new Float32Array(hexes.length);
      for (const a of ambient) {
        if (now > a.nextSwap) { a.hi = Math.floor(Math.random() * hexes.length); a.nextSwap = now + 3000 + Math.random() * 4000; }
        ambMap[a.hi] = Math.max(ambMap[a.hi], a.peak * (0.5 + 0.5 * Math.sin(elapsed * a.freq * Math.PI * 2 + a.phase)));
      }



      ctx.lineCap = 'round';

      // ── depth layer (background grid, no glow) ──
      for (const { cx, cy } of hexes2) {
        const v = hexVerts(cx, cy, HEX_R2);
        ctx.beginPath();
        v.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.closePath();
        ctx.fillStyle   = '#080810';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }

      // ── main hex grid ──
      for (let hi = 0; hi < hexes.length; hi++) {
        const { cx, cy } = hexes[hi];
        const verts = hexVerts(cx, cy, HEX_R, hot);  // gravity pull

        ctx.beginPath();
        verts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
        ctx.closePath();
        ctx.fillStyle   = '#0a0a14';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.045)';
        ctx.lineWidth   = 0.8;
        ctx.stroke();

        for (let ei = 0; ei < 6; ei++) {
          const v1 = verts[ei];
          const v2 = verts[(ei+1)%6];
          const mx = (v1.x + v2.x) * 0.5;
          const my = (v1.y + v2.y) * 0.5;

          // cursor spotlight
          const cursorI = Math.max(0, 1 - Math.hypot(mx-hot.x, my-hot.y)/260)**2;

          // trail glow
          let trailI = 0;
          for (let ti = 0; ti < trail.length; ti++) {
            const age = ti / trail.length;
            trailI = Math.max(trailI, Math.max(0, 1 - Math.hypot(mx-trail[ti].x, my-trail[ti].y)/190)**2 * age * 0.5);
          }

          // ambient breathing
          const ambI = ambMap[hi] || 0;

          // ripple
          let rippleI = 0;
          for (const rp of ripples) {
            const d = Math.hypot(mx - rp.x, my - rp.y);
            const target = rp.t * RIPPLE_MAXR;
            rippleI = Math.max(rippleI, Math.max(0, 1 - Math.abs(d - target)/55) * (1 - rp.t*0.75) * 0.8);
          }

          // scan line
          const scanI = Math.max(0, 1 - Math.abs(my - scanY)/70) * 0.32;

          const intensity = Math.min(1, cursorI + trailI + ambI + rippleI + scanI);
          if (intensity < 0.025) continue;

          drawEdge(ctx, v1, v2, col, intensity);
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    // ── events ──
    const onMouse  = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onTouch  = (e) => { if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; } };
    const onOrient = (e) => { if (e.gamma==null) return; mouse.x = W/2+(e.gamma/90)*W*0.45; mouse.y = H/2+(Math.min(45,Math.max(-45,e.beta||0))/45)*H*0.35; };
    const onScroll = () => {};
    const onClick  = (e) => { ripples.push({ x: e.clientX, y: e.clientY, t: 0 }); };

    window.addEventListener('mousemove',         onMouse);
    window.addEventListener('click',             onClick);
    window.addEventListener('touchmove',         onTouch,  { passive: true });
    window.addEventListener('touchstart',        onTouch,  { passive: true });
    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('scroll',            onScroll, { passive: true });

    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    resize();
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove',          onMouse);
      window.removeEventListener('click',              onClick);
      window.removeEventListener('touchmove',          onTouch);
      window.removeEventListener('touchstart',         onTouch);
      window.removeEventListener('deviceorientation',  onOrient);
      window.removeEventListener('scroll',             onScroll);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:-1, display:'block' }} />;
}
