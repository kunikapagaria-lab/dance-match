import { useEffect, useRef } from 'react';

export default function useAudio({ audioUrl, startTimestamp, enabled, isPaused = false }) {
  const audioRef = useRef(null);
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !audioUrl || !startTimestamp || scheduledRef.current) return;
    scheduledRef.current = true;

    const audio = new Audio(audioUrl);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const delay = startTimestamp - Date.now();
    const start = () => {
      audio.currentTime = Math.max(0, -delay / 1000);
      audio.play().catch(err => console.warn('Audio play blocked:', err));
    };

    if (delay <= 0) {
      start();
    } else {
      const timer = setTimeout(start, delay);
      return () => clearTimeout(timer);
    }
  }, [enabled, audioUrl, startTimestamp]);

  useEffect(() => {
    if (!audioRef.current || !scheduledRef.current) return;
    if (isPaused) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.warn('Audio resume blocked:', err));
    }
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      scheduledRef.current = false;
    };
  }, []);
}
