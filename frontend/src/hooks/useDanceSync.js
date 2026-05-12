import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Unified sync hook for both built-in beat-based levels and YouTube frame-based levels.
 *
 * Built-in levels:  levelData.beats  – uses Date.now() - startTimestamp as elapsed time
 * YouTube levels:   levelData.frames – uses ytPlayerRef.current.getCurrentTime() as elapsed time
 *
 * Returns { currentBeat, totalBeats, currentKeyframe, getElapsed, keyframes, defaultSegmentDuration }
 */
export default function useDanceSync({ levelData, startTimestamp, enabled, ytPlayerRef = null, videoRef = null, isPaused = false }) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentKeyframe, setCurrentKeyframe] = useState(null);
  
  const rafRef = useRef(null);
  const currentBeatRef = useRef(0);
  const pauseStartTsRef = useRef(null);
  const totalPausedTimeRef = useRef(0);

  useEffect(() => {
    if (isPaused) {
      if (!pauseStartTsRef.current) pauseStartTsRef.current = Date.now();
      if (ytPlayerRef?.current?.pause) ytPlayerRef.current.pause();
      if (videoRef?.current) videoRef.current.pause();
    } else {
      if (pauseStartTsRef.current) {
        totalPausedTimeRef.current += (Date.now() - pauseStartTsRef.current);
        pauseStartTsRef.current = null;
      }
      if (ytPlayerRef?.current?.play) ytPlayerRef.current.play();
      if (videoRef?.current) videoRef.current.play().catch(() => {});
    }
  }, [isPaused, ytPlayerRef, videoRef]);

  // Normalise: YouTube levels use .frames, built-in levels use .beats
  const keyframes = levelData?.frames ?? levelData?.beats ?? [];
  const totalBeats = keyframes.length;

  // For built-in levels, beatDuration is derived from bpm; for YouTube levels use 0.1s (10fps default)
  const defaultSegmentDuration = levelData?.bpm ? 60 / levelData.bpm : (levelData?.fps ? 1 / levelData.fps : 0.1);

  const getElapsed = useCallback(() => {
    const now = Date.now();
    if (now < startTimestamp) return 0;
    if (ytPlayerRef?.current) return ytPlayerRef.current.getCurrentTime();
    if (videoRef?.current) return videoRef.current.currentTime;
    
    let activePause = 0;
    if (isPaused && pauseStartTsRef.current) {
      activePause = now - pauseStartTsRef.current;
    }
    return (now - startTimestamp - totalPausedTimeRef.current - activePause) / 1000;
  }, [startTimestamp, ytPlayerRef, videoRef, isPaused]);

  useEffect(() => {
    if (!enabled || !levelData || !startTimestamp || keyframes.length === 0) return;

    function tick() {
      const elapsed = getElapsed();

      // Binary-search for the latest keyframe whose timestamp <= elapsed
      let lo = 0, hi = keyframes.length - 1, kfIdx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (keyframes[mid].timestamp <= elapsed) { kfIdx = mid; lo = mid + 1; }
        else hi = mid - 1;
      }

      if (kfIdx === -1) {
        // Before the very first keyframe
        if (currentBeatRef.current !== 0) {
          currentBeatRef.current = 0;
          setCurrentBeat(0);
          setCurrentKeyframe(null);
        }
      } else {
        const kf = keyframes[kfIdx];
        if (currentBeatRef.current !== kfIdx + 1) {
          currentBeatRef.current = kfIdx + 1;
          setCurrentBeat(kfIdx + 1);
          setCurrentKeyframe(kf);
        }
      }

      // Keep ticking until 1 second past the last keyframe
      const lastTs = keyframes[keyframes.length - 1].timestamp;
      if (elapsed < lastTs + defaultSegmentDuration + 1 && !isPaused) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    if (!isPaused) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, levelData, startTimestamp, keyframes, defaultSegmentDuration, getElapsed, isPaused]);

  return { currentBeat, totalBeats, currentKeyframe, getElapsed, keyframes, defaultSegmentDuration };
}
