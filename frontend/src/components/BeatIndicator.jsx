import React, { useEffect, useRef } from 'react';

export default function BeatIndicator({ total, getElapsed, keyframes, defaultSegmentDuration }) {
  const fillRef = useRef(null);
  const pulseRef = useRef(null);
  const countRef = useRef(null);

  useEffect(() => {
    if (!getElapsed || !keyframes || keyframes.length === 0) return;
    let raf;
    
    function tick() {
      const elapsed = getElapsed();
      let lo = 0, hi = keyframes.length - 1, kfIdx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (keyframes[mid].timestamp <= elapsed) { kfIdx = mid; lo = mid + 1; }
        else hi = mid - 1;
      }

      let pct = 0;
      let currentDisplay = 0;
      
      if (kfIdx !== -1) {
        const kf = keyframes[kfIdx];
        const nextTs = keyframes[kfIdx + 1]?.timestamp ?? (kf.timestamp + defaultSegmentDuration);
        const segDuration = nextTs - kf.timestamp;
        const segElapsed = elapsed - kf.timestamp;
        const progress = Math.max(0, Math.min(1, segElapsed / Math.max(segDuration, 0.001)));
        
        pct = total > 0 ? (((kfIdx + 1) - 1 + progress) / total) * 100 : 0;
        currentDisplay = kfIdx + 1;
      }
      
      const safePct = Math.max(0, Math.min(100, pct));
      if (fillRef.current) fillRef.current.style.width = `${safePct}%`;
      if (pulseRef.current) pulseRef.current.style.left = `${safePct}%`;
      raf = requestAnimationFrame(tick);
    }
    
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getElapsed, keyframes, defaultSegmentDuration, total]);

  return (
    <div className="beat-indicator">
      <div className="beat-bar-track seamless">
        <div ref={fillRef} className="beat-bar-fill seamless" style={{ width: '0%' }} />
      </div>
    </div>
  );
}
