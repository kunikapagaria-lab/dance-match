interface Props { activeIdx: number; total: number; }

export default function BottomMeta({ activeIdx, total }: Props) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-between px-14 max-[900px]:px-5"
      style={{ bottom: 28, zIndex: 10 }}
    >
      {/* Counter */}
      <div className="flex items-center gap-2">
        <span className="font-display text-lg" style={{ color: 'var(--accent)' }}>
          {String(activeIdx + 1).padStart(2, '0')}
        </span>
        <span className="font-display text-xs opacity-40" style={{ color: 'var(--text)' }}>———</span>
        <span className="font-display text-sm text-white opacity-60">
          {String(total).padStart(2, '0')}
        </span>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="rounded-full inline-block transition-all duration-300"
            style={{
              width: 10, height: 10,
              border: '1.5px solid var(--accent)',
              background:   i === activeIdx ? 'var(--accent)' : 'transparent',
              boxShadow:    i === activeIdx ? '0 0 10px var(--accent)' : 'none',
              transform:    i === activeIdx ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Copyright */}
      <span className="font-body text-xs tracking-[0.3em] uppercase"
            style={{ color: 'var(--text)', opacity: 0.7 }}>
        © 2026 — Dance Match Limited
      </span>
    </div>
  );
}
