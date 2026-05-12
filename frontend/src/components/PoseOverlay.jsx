import React, { useEffect } from 'react';
import { POSE_CONNECTIONS } from '../utils/poseUtils.js';

// Draws a skeleton from 33 MediaPipe landmarks onto a canvas.
// landmarks: array of {x, y} in [0,1] (will be mapped to canvas dimensions)
export default function PoseOverlay({ canvasRef, landmarks, color = '#00ff88', lineWidth = 3, dotRadius = 5 }) {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !landmarks?.length) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Draw connections
    for (const [a, b] of POSE_CONNECTIONS) {
      const lmA = landmarks[a];
      const lmB = landmarks[b];
      if (!lmA || !lmB) continue;
      ctx.beginPath();
      ctx.moveTo(lmA.x * w, lmA.y * h);
      ctx.lineTo(lmB.x * w, lmB.y * h);
      ctx.stroke();
    }

    // Draw joint dots (face + key joints only)
    const keyJoints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    ctx.fillStyle = color;
    for (const idx of keyJoints) {
      const lm = landmarks[idx];
      if (!lm) continue;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [canvasRef, landmarks, color, lineWidth, dotRadius]);

  return null;
}
