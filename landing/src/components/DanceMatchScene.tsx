import { useState, useCallback } from 'react';
import { AVATARS } from '../data/avatars';
import { useParallax } from '../hooks/useParallax';
import { useKeyboardSwap } from '../hooks/useKeyboardSwap';
import SceneBackground from './SceneBackground';
import BackgroundWordmark from './BackgroundWordmark';
import Header from './Header';
import HeroText from './HeroText';
import CharacterZone from './CharacterZone';
import BottomMeta from './BottomMeta';
import '../styles/neon.css';

export default function DanceMatchScene() {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [swapping,  setSwapping]    = useState(false);
  const { containerRef, parallax }  = useParallax();

  const avatar = AVATARS[activeIdx];

  const handleSwap = useCallback((dir: 1 | -1) => {
    if (swapping) return;
    setSwapping(true);
    setTimeout(() => {
      setActiveIdx(i => (i + dir + AVATARS.length) % AVATARS.length);
      setTimeout(() => setSwapping(false), 50);
    }, 220);
  }, [swapping]);

  useKeyboardSwap(handleSwap);

  const cssVars = {
    '--accent':     avatar.palette.accent,
    '--accent-soft':avatar.palette.accentSoft,
    '--glow':       avatar.palette.glow,
    '--glow-soft':  avatar.palette.glowSoft,
    '--base':       avatar.palette.base,
    '--base2':      avatar.palette.base2,
    '--text':       avatar.palette.text,
    '--wordmark':   avatar.palette.wordmark,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ ...cssVars, background: avatar.palette.base, transition: 'background 600ms ease' }}
    >
      <SceneBackground parallax={parallax} palette={avatar.palette} />
      <BackgroundWordmark parallax={parallax} />
      <Header />
      <HeroText avatar={avatar} swapping={swapping} />
      <CharacterZone
        avatar={avatar}
        parallax={parallax}
        swapping={swapping}
        onSwap={handleSwap}
      />
      <BottomMeta activeIdx={activeIdx} total={AVATARS.length} />
    </div>
  );
}
