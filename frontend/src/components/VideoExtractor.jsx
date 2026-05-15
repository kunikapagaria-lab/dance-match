import { useEffect, useRef, useState } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const TARGET_FPS = 10;

export default function VideoExtractor({ file, onComplete, onError, onCancel }) {
  const [phase, setPhase] = useState('extracting');
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Analyzing video…');
  const cancelledRef = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    cancelledRef.current = false;
    run();
    return () => { cancelledRef.current = true; };
  }, []);

  async function run() {
    try {
      setPhase('extracting');
      setStatusMsg('Extracting poses from video…');
      const { frames, duration } = await extractPoses();
      if (cancelledRef.current) return;

      setPhase('uploading');
      setProgress(0);
      setStatusMsg('Uploading video to cloud…');
      const cloudinaryUrl = await uploadToCloudinary();
      if (cancelledRef.current) return;

      setPhase('saving');
      setStatusMsg('Saving…');
      const levelId = await saveToServer(frames, duration, cloudinaryUrl);
      if (cancelledRef.current) return;

      onComplete({ levelId, cloudinaryUrl, duration, originalFilename: file.name });
    } catch (err) {
      if (!cancelledRef.current) onError(err.message || 'Extraction failed');
    }
  }

  async function extractPoses() {
    const PoseClass = window.Pose;
    if (!PoseClass) throw new Error('MediaPipe not loaded — please refresh the page and try again.');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    await new Promise((resolve, reject) => {
      video.onerror = () => reject(new Error('Could not load video file.'));
      video.onloadedmetadata = resolve;
      video.src = URL.createObjectURL(file);
    });

    const duration = video.duration;
    const totalFrames = Math.ceil(duration * TARGET_FPS);

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const pose = new PoseClass({ locateFile: (f) => `/mediapipe/${f}` });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const frames = [];
    let lastResults = null;
    pose.onResults((r) => { lastResults = r; });

    for (let i = 0; i < totalFrames; i++) {
      if (cancelledRef.current) break;

      const t = i / TARGET_FPS;
      await seekTo(video, t);

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      lastResults = null;
      await pose.send({ image: canvas });

      if (lastResults?.poseLandmarks) {
        frames.push({
          timestamp: Math.round(t * 1000) / 1000,
          landmarks: lastResults.poseLandmarks.map(lm => ({
            x: lm.x, y: lm.y, z: lm.z,
            visibility: lm.visibility ?? 1.0,
          })),
        });
      }
      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    try { pose.close(); } catch (_) {}
    URL.revokeObjectURL(video.src);
    return { frames, duration };
  }

  function seekTo(video, t) {
    return new Promise((resolve) => {
      if (Math.abs(video.currentTime - t) < 0.05) { resolve(); return; }
      video.addEventListener('seeked', resolve, { once: true });
      video.currentTime = t;
    });
  }

  function uploadToCloudinary() {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error('Cloudinary not configured — add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to Vercel env vars.');
    }
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      form.append('folder', 'dance_videos');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText).secure_url);
        } else {
          reject(new Error('Video upload to Cloudinary failed.'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during video upload.'));
      xhr.send(form);
    });
  }

  async function saveToServer(frames, duration, cloudinaryUrl) {
    const levelId = `upload_${Math.random().toString(36).slice(2, 10)}`;
    const res = await fetch(`${SERVER_URL}/save-level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: levelId,
        type: 'upload',
        duration,
        fps: TARGET_FPS,
        frames,
        cloudinaryUrl,
        originalFilename: file.name,
      }),
    });
    if (!res.ok) throw new Error('Failed to save level to server.');
    return levelId;
  }

  const phaseMessages = {
    extracting: "Processing on your device — don't close this tab.",
    uploading: 'Uploading video to cloud storage…',
    saving: 'Almost done…',
  };

  return (
    <div style={{ marginTop: 10 }}>
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          {statusMsg}
        </span>
        <span className="font-body" style={{ fontSize: 12, color: 'var(--accent)' }}>
          {phase === 'saving' ? '…' : `${progress}%`}
        </span>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', background: 'var(--accent)', borderRadius: 2,
          width: phase === 'saving' ? '100%' : `${progress}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {phaseMessages[phase]}
        </p>
        <button
          onClick={() => { cancelledRef.current = true; onCancel?.(); }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11, padding: 0 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
