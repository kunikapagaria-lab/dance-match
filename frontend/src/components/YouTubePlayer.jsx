import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * Wraps the YouTube iframe API.
 *
 * Exposes via ref:
 *   play(seekToSeconds)
 *   pause()
 *   getCurrentTime()  → seconds
 *   getDuration()     → seconds
 *
 * Props:
 *   videoId  – YouTube video ID
 *   hidden   – render off-screen (audio plays, no visible UI)
 *   onReady  – called once the player is ready
 */
const YouTubePlayer = forwardRef(function YouTubePlayer({ videoId, hidden = false, onReady }, ref) {
  // Stable unique ID used as the target div's id attribute
  const divId = useRef(`yt-player-${Math.random().toString(36).slice(2, 10)}`);
  const playerRef = useRef(null);
  const readyRef = useRef(false);

  useImperativeHandle(ref, () => ({
    play(seekTo = 0) {
      if (!playerRef.current || !readyRef.current) return;
      playerRef.current.seekTo(seekTo, true);
      playerRef.current.playVideo();
    },
    pause() {
      if (!playerRef.current || !readyRef.current) return;
      playerRef.current.pauseVideo();
    },
    getCurrentTime() {
      if (!playerRef.current || !readyRef.current) return 0;
      return playerRef.current.getCurrentTime() || 0;
    },
    getDuration() {
      if (!playerRef.current || !readyRef.current) return 0;
      return playerRef.current.getDuration() || 0;
    },
  }));

  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;

    function createPlayer() {
      if (destroyed) return;
      playerRef.current = new window.YT.Player(divId.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: hidden ? 0 : 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady() {
            if (destroyed) return;
            readyRef.current = true;
            onReady?.();
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Chain onto any existing callback so we don't clobber other instances
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        createPlayer();
      };
      // Inject the API script only once
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      destroyed = true;
      readyRef.current = false;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [videoId]);

  if (hidden) {
    return (
      <div style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: 320,
        height: 180,
        pointerEvents: 'none',
        zIndex: -1,
      }}>
        <div id={divId.current} style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}>
      <div id={divId.current} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

export default YouTubePlayer;
