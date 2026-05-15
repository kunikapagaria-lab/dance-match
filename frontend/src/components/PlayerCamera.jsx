import React, { useRef, useEffect, useState, useCallback } from 'react';
import useMediaPipe from '../hooks/useMediaPipe.js';
import PoseOverlay from './PoseOverlay.jsx';

const STATUS_LABEL = {
  idle:       '',
  requesting: 'Requesting camera…',
  loading:    'Loading pose model… (first time ~10s)',
  ready:      '',
  error:      'Camera error — check permissions',
};

export default function PlayerCamera({ onLandmarks, onBeat, currentBeat, currentKeyframe, liveScore, totalScore, fps = 15, onStream }) {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [landmarks, setLandmarks] = useState(null);
  const prevBeatRef = useRef(0);

  const handleResults = useCallback((results) => {
    const lms = results.poseLandmarks ?? null;
    setLandmarks(lms);
    if (lms) onLandmarks?.(lms);
  }, [onLandmarks]);

  const { status } = useMediaPipe({ videoRef, onResults: handleResults, enabled: true, fps, onStream });

  // Fire onBeat each time the beat number advances
  useEffect(() => {
    if (currentBeat > 0 && currentBeat !== prevBeatRef.current && landmarks) {
      prevBeatRef.current = currentBeat;
      onBeat?.(currentBeat);
    }
  }, [currentBeat, landmarks, onBeat]);

  const scoreColor =
    liveScore === null ? '#888'
    : liveScore >= 80  ? '#4ade80'
    : liveScore >= 50  ? '#facc15'
    :                    '#f87171';

  return (
    <div className="player-camera">
      {/* Mirrored live video */}
      <video
        ref={videoRef}
        className="camera-canvas"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      {/* Skeleton overlay removed — clean camera view */}

      {/* Status banner */}
      {STATUS_LABEL[status] && (
        <div className="camera-status-banner">{STATUS_LABEL[status]}</div>
      )}

      {/* Score ring — current beat */}
      {liveScore !== null && (
        <div className="score-ring" style={{ '--ring-color': scoreColor }}>
          <span className="score-value">{liveScore}</span>
          <span className="score-label">pts</span>
        </div>
      )}

      {/* Running total score */}
      {totalScore !== null && (
        <div className="score-total">
          <span className="score-total-value">{totalScore}</span>
          <span className="score-total-label">total</span>
        </div>
      )}

      {currentKeyframe && <div className="beat-flash" key={currentBeat} />}
    </div>
  );
}
