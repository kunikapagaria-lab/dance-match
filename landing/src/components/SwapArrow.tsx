interface Props {
  dir: 'left' | 'right';
  onClick: () => void;
}

export default function SwapArrow({ dir, onClick }: Props) {
  const isLeft = dir === 'left';
  return (
    <button
      aria-label={isLeft ? 'Previous avatar' : 'Next avatar'}
      onClick={onClick}
      className="absolute top-1/2 z-20 flex items-center justify-center outline-none"
      style={{
        transform: 'translateY(-50%)',
        [isLeft ? 'left' : 'right']: -24,
        width: 44, height: 44,
        background: 'rgba(0,0,0,0.55)',
        border: '1.5px solid var(--accent)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, transform 150ms ease',
        boxShadow: '0 0 12px var(--glow-soft)',
      }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.boxShadow = '0 0 24px var(--glow)';
        b.style.transform = `translateY(-50%) scale(1.08)`;
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.boxShadow = '0 0 12px var(--glow-soft)';
        b.style.transform = 'translateY(-50%) scale(1)';
      }}
      onFocus={e  => ((e.currentTarget as HTMLButtonElement).style.outline = '2px solid var(--accent)')}
      onBlur={e   => ((e.currentTarget as HTMLButtonElement).style.outline = 'none')}
    >
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {isLeft
          ? <path d="M10 2L4 7l6 5" />
          : <path d="M4 2l6 5-6 5" />}
      </svg>
    </button>
  );
}
