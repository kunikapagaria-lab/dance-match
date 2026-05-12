import type { ParallaxState } from '../hooks/useParallax';

interface Props { parallax: ParallaxState; }

export default function BackgroundWordmark({ parallax }: Props) {
  const tx = parallax.x * -14;
  const ty = parallax.y * -6;
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 1, transform: `translate3d(${tx}px, ${ty}px, 0)` }}
    >
      <span
        className="font-display leading-none block"
        style={{
          fontSize: 'clamp(120px, 22vw, 360px)',
          color: 'var(--wordmark)',
          lineHeight: 0.85,
        }}
      >
        DANCE
      </span>
      <span
        className="font-display leading-none block"
        style={{
          fontSize: 'clamp(120px, 22vw, 360px)',
          color: 'var(--wordmark)',
          lineHeight: 0.85,
        }}
      >
        MATCH
      </span>
    </div>
  );
}
