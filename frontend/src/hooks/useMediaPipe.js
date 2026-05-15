import { useEffect, useRef, useState } from 'react';

export default function useMediaPipe({ videoRef, onResults, enabled = true, fps = 15 }) {
  const poseRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function init() {
      // 1. Request webcam
      setStatus('requesting');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        console.error('Camera denied:', err);
        setStatus('error');
        return;
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise(resolve => {
        if (video.readyState >= 2) { resolve(); return; }
        video.onloadedmetadata = () => video.play().then(resolve).catch(resolve);
      });

      // 2. Set up MediaPipe Pose — no initialize(), just setOptions + onResults
      setStatus('loading');
      const PoseClass = window.Pose;
      if (!PoseClass) { console.error('window.Pose not found — pose.js script not loaded'); setStatus('error'); return; }
      const pose = new PoseClass({
        locateFile: (file) => `/mediapipe/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        if (cancelled) return;
        setStatus('ready');
        onResultsRef.current(results);
      });

      poseRef.current = pose;

      // 3. rAF frame loop — capped at target FPS to keep CPU free for video + rendering
      let busy = false;
      let lastSent = 0;
      const FRAME_MS = 1000 / fps;

      async function sendFrame(now) {
        if (cancelled) return;
        if (!busy && now - lastSent >= FRAME_MS && video.readyState >= 2 && !video.paused) {
          lastSent = now;
          busy = true;
          try { await pose.send({ image: video }); } catch (e) { console.warn('pose.send error:', e); }
          busy = false;
        }
        rafRef.current = requestAnimationFrame(sendFrame);
      }
      rafRef.current = requestAnimationFrame(sendFrame);
    }

    init().catch(err => {
      console.error('MediaPipe init error:', err);
      setStatus('error');
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      try { poseRef.current?.close(); } catch (_) {}
    };
  }, [enabled]);

  return { status };
}
