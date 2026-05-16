import { useEffect, useRef } from 'react';

const HEX_R   = 56;          // hexagon radius (pointy-top)
const COL_W   = HEX_R * Math.sqrt(3);   // ~97
const ROW_H   = HEX_R * 1.5;            // ~84
const CYAN    = { r: 0,   g: 212, b: 255 };  // #00d4ff
const PURPLE  = { r: 155, g:   0, b: 255 };  // #9b00ff
const PULSE_COUNT = 3;

// ── helpers ──────────────────────────────────────────────────────────────────

function hexVerts(cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6; // pointy-top
    return { x: cx + HEX_R * Math.cos(a), y: cy + HEX_R * Math.sin(a) };
  });
}

function lerpColor(t) {
  const c = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(CYAN.r + (PURPLE.r - CYAN.r) * c),
    g: Math.round(CYAN.g + (PURPLE.g - CYAN.g) * c),
    b: Math.round(CYAN.b + (PURPLE.b - CYAN.b) * c),
  };
}

function buildGrid(w, h) {
  const cols = Math.ceil(w / COL_W) + 3;
  const rows = Math.ceil(h / ROW_H) + 3;
  const hexes = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      hexes.push({
        cx: col * COL_W + (row % 2 === 1 ? COL_W / 2 : 0) - COL_W,
        cy: row * ROW_H - ROW_H,
      });
    }
  }
  return hexes;
}

function makePulse(hexes) {
  return {
    hi:       Math.floor(Math.random() * hexes.length),
    edge:     Math.floor(Math.random() * 6),
    t:        Math.random(),
    speed:    0.004 + Math.random() * 0.006,
    intensity: 0.45 + Math.random() * 0.45,
  };
}

function drawEdge(ctx, v1, v2, col, intensity) {
  // bloom layer
  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y);
  ctx.lineTo(v2.x, v2.y);
  ctx.lineWidth   = 12;
  ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${(intensity * 0.18).toFixed(3)})`;
  ctx.stroke();

  // mid glow
  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y);
  ctx.lineTo(v2.x, v2.y);
  ctx.lineWidth   = 5;
  ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${(intensity * 0.45).toFixed(3)})`;
  ctx.stroke();

  // core line
  ctx.beginPath();
  ctx.moveTo(v1.x, v1.y);
  ctx.lineTo(v2.x, v2.y);
  ctx.lineWidth   = 1.2;
  ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${Math.min(0.95, intensity * 0.95).toFixed(3)})`;
  ctx.stroke();
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SceneBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const dpr    = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0;
    let hexes  = [];
    let pulses = [];
    let rafId;

    let mouse   = { x: 0, y: 0 };
    let hot     = { x: 0, y: 0 };   // smoothed hotspot
    let scrollY = 0;

    // ── setup ──────────────────────────────────────────────────────────────
    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width        = W * dpr;
      canvas.height       = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);

      hexes  = buildGrid(W, H);
      pulses = Array.from({ length: PULSE_COUNT }, () => makePulse(hexes));
      mouse  = { x: W / 2, y: H * 0.35 };
      hot    = { ...mouse };
    }

    // ── animation loop ──────────────────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // background
      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, W, H);

      // lerp hotspot
      hot.x += (mouse.x - hot.x) * 0.06;
      hot.y += (mouse.y - hot.y) * 0.06;

      // update pulses
      for (const p of pulses) {
        p.t += p.speed;
        if (p.t >= 1) {
          p.t -= 1;
          p.edge = (p.edge + 1) % 6;
          if (Math.random() < 0.35) {
            p.hi   = Math.floor(Math.random() * hexes.length);
            p.edge = Math.floor(Math.random() * 6);
          }
        }
      }

      ctx.lineCap = 'round';

      // draw all hexagons
      for (let hi = 0; hi < hexes.length; hi++) {
        const { cx, cy } = hexes[hi];
        const verts = hexVerts(cx, cy);

        // fill
        ctx.beginPath();
        verts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
        ctx.closePath();
        ctx.fillStyle   = '#0a0a12';
        ctx.fill();

        // base border (very faint)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 0.7;
        ctx.stroke();

        // each edge
        for (let ei = 0; ei < 6; ei++) {
          const v1 = verts[ei];
          const v2 = verts[(ei + 1) % 6];
          const mx = (v1.x + v2.x) * 0.5;
          const my = (v1.y + v2.y) * 0.5;

          // cursor glow
          const dist    = Math.hypot(mx - hot.x, my - hot.y);
          const cursorI = Math.max(0, 1 - dist / 230) ** 2;

          // pulse glow (bell-shaped along edge)
          let pulseI = 0;
          for (const p of pulses) {
            if (p.hi === hi && p.edge === ei) {
              pulseI = Math.max(pulseI, p.intensity * Math.sin(p.t * Math.PI));
            }
          }

          const intensity = Math.min(1, cursorI + pulseI * 0.55);
          if (intensity < 0.025) continue;

          // gradient color based on vertical position + scroll parallax
          const t   = Math.min(1, Math.max(0, (my + scrollY * 0.3) / H));
          const col = lerpColor(t);

          drawEdge(ctx, v1, v2, col, intensity);
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    // ── events ──────────────────────────────────────────────────────────────
    const onMouse = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onTouch = (e) => {
      if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    };
    const onOrient = (e) => {
      if (e.gamma == null) return;
      mouse.x = W / 2 + (e.gamma / 90) * W * 0.45;
      mouse.y = H / 2 + (Math.min(45, Math.max(-45, e.beta || 0)) / 45) * H * 0.35;
    };
    const onScroll = () => { scrollY = window.scrollY; };

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(resize);
    ro.observe(document.documentElement);

    resize();
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: -1, display: 'block' }}
    />
  );
}
