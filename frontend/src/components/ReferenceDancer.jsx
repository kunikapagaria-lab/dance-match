import React, { useRef, useEffect } from 'react';
import PoseOverlay from './PoseOverlay.jsx';

export default function ReferenceDancer({ keyframe }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const landmarks = keyframe?.landmarks ?? null;

  return (
    <div className="reference-dancer">
      <canvas ref={canvasRef} width={320} height={480} className="reference-canvas" />
      {landmarks && (
        <PoseOverlay canvasRef={canvasRef} landmarks={landmarks} color="#ffffff" lineWidth={4} dotRadius={6} />
      )}
      {!landmarks && (
        <div className="reference-placeholder">
          <span>&#128372;</span>
          <p>Waiting…</p>
        </div>
      )}
    </div>
  );
}
