import type { Avatar } from '../data/avatars';
import type { ParallaxState } from '../hooks/useParallax';
import Avatar3D from './Avatar3D';
import CharacterFrame from './CharacterFrame';
import SwapArrow from './SwapArrow';

interface Props {
  avatar: Avatar;
  parallax: ParallaxState;
  swapping: boolean;
  onSwap: (dir: 1 | -1) => void;
}

export default function CharacterZone({ avatar, parallax, swapping, onSwap }: Props) {
  const charTx = parallax.x * 42;
  const charTy = parallax.y * 26;
  const charRy = parallax.x * -4;
  const charRx = parallax.y * 3;

  return (
    <div
      className="absolute max-[900px]:static max-[900px]:w-full"
      style={{
        right: 56, top: '8%', bottom: '12%', width: '48%',
        perspective: '1400px',
        perspectiveOrigin: '50% 40%',
        zIndex: 10,
      }}
    >
      {/* Breakout radial glow above frame */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{
        top: '-6%', height: '20%',
        background: `radial-gradient(ellipse 60% 100% at 50% 100%, var(--glow), transparent 70%)`,
        zIndex: 4,
      }} />

      {/* Frame — moves opposite to character */}
      <CharacterFrame parallax={parallax} />

      {/* Character — breaks above the frame */}
      <div
        className={swapping ? 'is-swapping' : ''}
        style={{
          position: 'absolute',
          inset: 0,
          height: '108%',
          marginTop: '-8%',
          zIndex: 5,
          transform: `translate3d(${charTx}px, ${charTy}px, 0) rotateY(${charRy}deg) rotateX(${charRx}deg)`,
          transition: 'transform 60ms linear',
        }}
      >
        <Avatar3D avatar={avatar} />
      </div>

      {/* Swap arrows on the frame edges */}
      <SwapArrow dir="left"  onClick={() => onSwap(-1)} />
      <SwapArrow dir="right" onClick={() => onSwap(1)} />
    </div>
  );
}
