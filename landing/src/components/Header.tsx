export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-14 max-[900px]:px-5"
            style={{ top: 32 }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-none rotate-45 inline-block"
              style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
        <span className="font-display text-white text-sm tracking-widest">DANCE·MATCH</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
        <span className="font-body text-xs tracking-[0.3em] uppercase"
              style={{ color: 'var(--text)', opacity: 0.7 }}>Session · Live</span>
      </div>
    </header>
  );
}
