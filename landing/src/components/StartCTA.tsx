export default function StartCTA() {
  return (
    <button
      className="font-display text-black text-sm tracking-[0.22em] uppercase flex items-center gap-3 group outline-none"
      style={{
        background: 'var(--accent)',
        padding: '18px 32px',
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        boxShadow: '0 0 30px var(--glow), 0 0 80px var(--glow-soft)',
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 50px var(--glow), 0 0 120px var(--glow-soft)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px var(--glow), 0 0 80px var(--glow-soft)';
      }}
      onFocus={e  => ((e.currentTarget as HTMLButtonElement).style.outline = '2px solid var(--accent)')}
      onBlur={e   => ((e.currentTarget as HTMLButtonElement).style.outline = 'none')}
    >
      <span>START DANCING</span>
      <svg width={20} height={14} viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 7h14M13 1l6 6-6 6" />
      </svg>
    </button>
  );
}
