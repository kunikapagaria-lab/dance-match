import { useEffect, useRef } from 'react';

export default function ComboDisplay({ count, feverMode }) {
  const ref = useRef(null);

  // Pulse animation each time count changes
  useEffect(() => {
    if (!ref.current || count < 3) return;
    ref.current.style.animation = 'none';
    void ref.current.offsetWidth; // reflow
    ref.current.style.animation = 'combo-pop 0.35s ease';
  }, [count]);

  if (count < 3) return null;

  const icon  = count >= 20 ? '⚡' : count >= 10 ? '🔥' : '✦';
  const label = count >= 20 ? 'INSANE' : count >= 10 ? 'ON FIRE' : 'COMBO';

  return (
    <div ref={ref} className={`combo-display ${feverMode ? 'combo-fever' : ''}`}>
      <span className="combo-icon">{icon}</span>
      <span className="combo-number">×{count}</span>
      <span className="combo-label">{label}</span>
    </div>
  );
}
