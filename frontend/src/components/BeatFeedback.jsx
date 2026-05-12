import { useState, useEffect } from 'react';

const CONFIGS = [
  { min: 88, label: 'PERFECT!',   color: '#ffd700', size: 38, particles: true  },
  { min: 65, label: 'GREAT!',     color: '#4ade80', size: 32, particles: false },
  { min: 40, label: 'GOOD',       color: '#22d3ee', size: 26, particles: false },
  { min: 10, label: 'KEEP GOING', color: '#ffffff', size: 20, particles: false },
  { min:  0, label: 'MISS',       color: '#ef4444', size: 22, particles: false },
];

export default function BeatFeedback({ score, feedbackKey }) {
  const [show, setShow] = useState(false);
  const [cfg, setCfg]   = useState(null);

  useEffect(() => {
    if (score === null || score === undefined || feedbackKey === 0) return;
    const c = CONFIGS.find(c => score >= c.min) || CONFIGS[CONFIGS.length - 1];
    setCfg(c);
    setShow(true);
    const t = setTimeout(() => setShow(false), 850);
    return () => clearTimeout(t);
  }, [feedbackKey]);

  if (!show || !cfg) return null;

  return (
    <div className="beat-feedback-wrap">
      {/* Main label */}
      <span className="beat-feedback-label" style={{
        color: cfg.color,
        fontSize: cfg.size,
        textShadow: `0 0 20px ${cfg.color}, 0 0 40px ${cfg.color}66`,
      }}>
        {cfg.label}
      </span>

      {/* Particle burst for PERFECT */}
      {cfg.particles && (
        <div className="beat-feedback-particles">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="feedback-particle" style={{
              '--angle': `${i * 45}deg`,
              '--color': cfg.color,
              animationDelay: `${i * 20}ms`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
