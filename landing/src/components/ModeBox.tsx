interface Props { num: string; label: string; }

export default function ModeBox({ num, label }: Props) {
  return (
    <button
      className="relative group outline-none"
      style={{
        background: 'rgba(0,0,0,0.45)',
        border: '1.5px solid var(--accent)',
        padding: '22px 28px',
        minWidth: 180,
        backdropFilter: 'blur(4px)',
        boxShadow: '0 0 20px var(--glow-soft), inset 0 0 28px rgba(0,0,0,0.6)',
        cursor: 'pointer',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
      onFocus={e => (e.currentTarget.style.outline = '2px solid var(--accent)')}
      onBlur={e  => (e.currentTarget.style.outline = 'none')}
    >
      {/* Corner brackets */}
      {(['tl','tr','bl','br'] as const).map(pos => (
        <span key={pos} className="absolute pointer-events-none" style={{
          width: 10, height: 10,
          top:    pos.includes('t') ? -1 : 'auto',
          bottom: pos.includes('b') ? -1 : 'auto',
          left:   pos.includes('l') ? -1 : 'auto',
          right:  pos.includes('r') ? -1 : 'auto',
          borderTop:    pos.includes('t') ? '2px solid var(--accent)' : 'none',
          borderBottom: pos.includes('b') ? '2px solid var(--accent)' : 'none',
          borderLeft:   pos.includes('l') ? '2px solid var(--accent)' : 'none',
          borderRight:  pos.includes('r') ? '2px solid var(--accent)' : 'none',
          boxShadow: '0 0 6px var(--glow)',
        }} />
      ))}

      {/* Hover sheen */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
            style={{ background: 'linear-gradient(120deg, transparent 40%, var(--glow-soft) 50%, transparent 60%)' }} />

      <div className="font-body font-semibold text-xs tracking-[0.3em] mb-1"
           style={{ color: 'var(--accent)' }}>{num}</div>
      <div className="font-display text-white text-lg">{label}</div>

      <style>{`
        button:hover { transform: translateY(-3px); box-shadow: 0 0 36px var(--glow), inset 0 0 28px rgba(0,0,0,0.6) !important; }
      `}</style>
    </button>
  );
}
