import { useNavigate } from 'react-router-dom';

function ModeBox({ num, label, onClick }) {
  return (
    <button onClick={onClick} className="relative group" style={{
      background: 'rgba(0,0,0,0.45)', border: '1.5px solid var(--accent)',
      padding: '22px 28px', minWidth: 160,
      backdropFilter: 'blur(4px)',
      boxShadow: '0 0 20px var(--glow-soft), inset 0 0 28px rgba(0,0,0,0.6)',
      cursor: 'pointer', outline: 'none',
      transition: 'transform 200ms, box-shadow 200ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 36px var(--glow), inset 0 0 28px rgba(0,0,0,0.6)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 20px var(--glow-soft), inset 0 0 28px rgba(0,0,0,0.6)'; }}
    >
      {['tl','tr','bl','br'].map(p => (
        <span key={p} style={{
          position: 'absolute', width: 10, height: 10,
          top:    p.includes('t') ? -1 : 'auto', bottom: p.includes('b') ? -1 : 'auto',
          left:   p.includes('l') ? -1 : 'auto', right:  p.includes('r') ? -1 : 'auto',
          borderTop:    p.includes('t') ? '2px solid var(--accent)' : 'none',
          borderBottom: p.includes('b') ? '2px solid var(--accent)' : 'none',
          borderLeft:   p.includes('l') ? '2px solid var(--accent)' : 'none',
          borderRight:  p.includes('r') ? '2px solid var(--accent)' : 'none',
          boxShadow: '0 0 6px var(--glow)',
        }} />
      ))}
      <div className="font-body font-semibold text-xs mb-1" style={{ letterSpacing: '0.3em', color: 'var(--accent)' }}>{num}</div>
      <div className="font-display text-white text-lg">{label}</div>
    </button>
  );
}

export default function HeroText({ avatar, swapping }) {
  const navigate = useNavigate();
  const cls = swapping ? 'is-swapping' : 'is-entering';

  return (
    <div style={{ position: 'absolute', left: 56, top: '50%', transform: 'translateY(-50%)', width: '46%', maxWidth: 620, zIndex: 10 }}>

      <div className={`flex items-center gap-2 mb-4 ${cls}`}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', animation: 'pulse-dot 1.6s ease-in-out infinite', display: 'inline-block' }} />
        <span className="font-body font-semibold" style={{ fontSize: 12, letterSpacing: '0.32em', color: 'var(--text)', opacity: 0.85 }}>
          Dance Match Prod™
        </span>
      </div>

      <div className={`font-body font-semibold mb-1 ${cls}`} style={{ fontSize: 16, letterSpacing: '0.28em', opacity: 0.7, color: 'var(--text)' }}>
        {avatar.style}
      </div>

      <h1 className={`font-display glow-text ${cls}`} style={{ fontSize: 'clamp(64px,11vw,180px)', lineHeight: 0.9, color: 'var(--text)', margin: '0 0 12px' }}>
        {avatar.name}
      </h1>

      <p className={`font-body mb-2 ${cls}`} style={{ fontWeight: 300, fontStyle: 'italic', fontSize: 18, maxWidth: 440, opacity: 0.78, color: 'var(--text)' }}>
        " {avatar.quote} "
      </p>

      <p className={`font-body mb-8 ${cls}`} style={{ letterSpacing: '0.35em', fontSize: 11, color: 'var(--accent)', opacity: 0.8 }}>
        {avatar.tag}
      </p>

      <div className={`flex gap-4 flex-wrap mb-8 ${cls}`}>
        <ModeBox num="01" label="SOLO"        onClick={() => navigate('/lobby')} />
        <ModeBox num="02" label="MULTIPLAYER" onClick={() => navigate('/lobby')} />
      </div>

      <div className={cls}>
        <button
          onClick={() => navigate('/lobby')}
          className="font-display text-black text-sm flex items-center gap-3"
          style={{
            letterSpacing: '0.22em', background: 'var(--accent)', padding: '18px 32px', border: 'none',
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
            boxShadow: '0 0 30px var(--glow), 0 0 80px var(--glow-soft)', cursor: 'pointer',
            transition: 'transform 200ms, box-shadow 200ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px var(--glow), 0 0 120px var(--glow-soft)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 30px var(--glow), 0 0 80px var(--glow-soft)'; }}
        >
          <span>START DANCING</span>
          <svg width={20} height={14} viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 7h14M13 1l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
