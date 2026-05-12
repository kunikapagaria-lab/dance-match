import type { Avatar } from '../data/avatars';
import ModeBox from './ModeBox';
import StartCTA from './StartCTA';

interface Props { avatar: Avatar; swapping: boolean; }

export default function HeroText({ avatar, swapping }: Props) {
  const cls = swapping ? 'is-swapping' : 'is-entering';

  return (
    <div
      className="absolute max-[900px]:static max-[900px]:top-auto max-[900px]:transform-none max-[900px]:w-full max-[900px]:pt-24 max-[900px]:px-5"
      style={{
        left: 56, top: '50%', transform: 'translateY(-50%)',
        width: '46%', maxWidth: 620, zIndex: 10,
      }}
    >
      {/* Eyebrow */}
      <div className={`flex items-center gap-2 mb-4 ${cls}`} style={{ animationDelay: '0ms' }}>
        <span className="rounded-full inline-block flex-shrink-0"
              style={{
                width: 8, height: 8,
                background: 'var(--accent)',
                boxShadow: '0 0 10px var(--accent)',
                animation: 'pulse-dot 1.6s ease-in-out infinite',
              }} />
        <span className="font-body font-semibold text-xs tracking-[0.32em] uppercase"
              style={{ color: 'var(--text)', opacity: 0.85 }}>
          Dance Match Prod™
        </span>
      </div>

      {/* Style tag */}
      <div className={`font-body font-semibold mb-1 ${cls}`}
           style={{ fontSize: 16, letterSpacing: '0.28em', opacity: 0.7, color: 'var(--text)', animationDelay: '30ms' }}>
        {avatar.style}
      </div>

      {/* Headline name */}
      <h1 className={`font-display glow-text leading-none mb-3 ${cls}`}
          style={{
            fontSize: 'clamp(64px, 11vw, 180px)',
            lineHeight: 0.9,
            color: 'var(--text)',
            margin: '0 0 12px',
            animationDelay: '60ms',
          }}>
        {avatar.name}
      </h1>

      {/* Quote */}
      <p className={`font-body mb-2 ${cls}`}
         style={{
           fontWeight: 300, fontStyle: 'italic',
           fontSize: 18, maxWidth: 440, opacity: 0.78,
           color: 'var(--text)', animationDelay: '90ms',
         }}>
        " {avatar.quote} "
      </p>

      {/* Substyle */}
      <p className={`font-body tracking-[0.35em] text-xs mb-8 ${cls}`}
         style={{ color: 'var(--accent)', opacity: 0.8, animationDelay: '110ms' }}>
        {avatar.tag}
      </p>

      {/* Mode boxes */}
      <div className={`flex gap-4 flex-wrap mb-8 ${cls}`} style={{ animationDelay: '140ms' }}>
        <ModeBox num="01" label="SOLO" />
        <ModeBox num="02" label="MULTIPLAYER" />
      </div>

      {/* CTA */}
      <div className={cls} style={{ animationDelay: '170ms' }}>
        <StartCTA />
      </div>
    </div>
  );
}
