import type { Avatar } from '../data/avatars';
import { FALLBACK_GLB } from '../data/avatars';

interface Props { avatar: Avatar; }

export default function Avatar3D({ avatar }: Props) {
  const useFallback = avatar.glb.startsWith('/models/');

  return (
    <model-viewer
      src={useFallback ? FALLBACK_GLB : avatar.glb}
      alt={avatar.name}
      animation-name="Dance"
      autoplay
      auto-rotate
      interaction-prompt="none"
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        filter: useFallback
          ? `hue-rotate(${avatar.hueShift}deg) drop-shadow(0 0 20px var(--glow)) drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(-4px 0 12px var(--glow-soft))`
          : `drop-shadow(0 0 20px var(--glow)) drop-shadow(0 2px 8px rgba(0,0,0,0.9)) drop-shadow(-4px 0 12px var(--glow-soft))`,
      }}
    />
  );
}
