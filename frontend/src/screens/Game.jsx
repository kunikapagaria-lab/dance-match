import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../App.jsx';
import socket from '../socket.js';
import BeatIndicator from '../components/BeatIndicator.jsx';
import PlayerCamera from '../components/PlayerCamera.jsx';
import ReferenceDancer from '../components/ReferenceDancer.jsx';
import OtherPlayers from '../components/OtherPlayers.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import YouTubePlayer from '../components/YouTubePlayer.jsx';
import PoseOverlay from '../components/PoseOverlay.jsx';
import BeatFeedback from '../components/BeatFeedback.jsx';
import ComboDisplay from '../components/ComboDisplay.jsx';
import MotivationalMessage from '../components/MotivationalMessage.jsx';
import useDanceSync from '../hooks/useDanceSync.js';
import usePoseScorer from '../hooks/usePoseScorer.js';
import useAudio from '../hooks/useAudio.js';
import useWebRTC from '../hooks/useWebRTC.js';
import '../styles/game.css';

const DEFAULT_YT_TOLERANCE = 0.65;

// Motivational messages keyed by milestone + performance tier
const MOTIV = {
  25: { hi: "🔥 Great start — keep that energy!",  lo: "Warm up those moves, you've got this!" },
  50: { hi: "💪 HALFWAY — You're absolutely crushing it!", lo: "Halfway there — feel the beat!" },
  75: { hi: "⚡ ALMOST DONE — FINISH STRONG!",     lo: "Last stretch — give it everything!" },
};

export default function Game() {
  const { gameState } = useGame();
  const { level, audioUrl, danceStartTime, players, playerId, round, isYoutube, videoId } = gameState;
  const navigate = useNavigate();

  const [levelData, setLevelData]   = useState(gameState.levelData || null);
  const [otherPoses, setOtherPoses] = useState({});
  const [liveScores, setLiveScores] = useState({});
  const [totalScore, setTotalScore] = useState(null);
  const [gameOver, setGameOver]     = useState(false);
  const [latestPlayerLandmarks, setLatestPlayerLandmarks] = useState(null);
  const [ytReady, setYtReady]       = useState(false);
  const [isPaused, setIsPaused]         = useState(false); // global — host controls this
  const [isLocalPaused, setIsLocalPaused] = useState(false); // local — non-host only

  // ── Feedback state ─────────────────────────────────────────────────────
  const [feedbackScore, setFeedbackScore] = useState(null);
  const [feedbackKey,   setFeedbackKey]   = useState(0);
  const [comboCount,    setComboCount]    = useState(0);
  const [feverMode,     setFeverMode]     = useState(false);
  const [screenFlash,   setScreenFlash]   = useState(false);
  const [motivMsg,      setMotivMsg]      = useState('');
  const [motivKey,      setMotivKey]      = useState(0);
  const shownMilestonesRef = useRef(new Set());

  const submittedRef            = useRef(false);
  const ytStartedRef            = useRef(false);
  const ytPlayerRef             = useRef(null);
  const videoRef                = useRef(null);
  const playerSkeletonCanvasRef = useRef(null);

  const isUpload = levelData?.type === 'upload';
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

  useEffect(() => {
    if (levelData) return;
    fetch(`${SERVER_URL}/level/${level}`)
      .then(r => r.json())
      .then(data => setLevelData(data))
      .catch(err => console.error('Failed to load level data', err));
  }, [level, SERVER_URL, levelData]);

  useEffect(() => {
    if (!isYoutube || !ytReady || !danceStartTime || ytStartedRef.current) return;
    ytStartedRef.current = true;
    const delay = danceStartTime - Date.now();
    const start = () => ytPlayerRef.current?.play(0);
    if (delay <= 0) start();
    else { const t = setTimeout(start, delay); return () => clearTimeout(t); }
  }, [isYoutube, ytReady, danceStartTime]);

  useEffect(() => {
    if (!levelData?.cloudinaryUrl || !danceStartTime || ytStartedRef.current) return;
    const el = videoRef.current;
    if (!el) return;
    ytStartedRef.current = true;
    el.currentTime = 0;
    const delay = danceStartTime - Date.now();
    const start = () => el.play().catch(() => {});
    if (delay <= 0) start();
    else { const t = setTimeout(start, delay); return () => clearTimeout(t); }
  }, [isUpload, danceStartTime, levelData]);

  const { scoreAgainst, getAverage, reset, scores } = usePoseScorer();

  const { currentBeat, totalBeats, currentKeyframe, getElapsed, keyframes, defaultSegmentDuration } = useDanceSync({
    levelData, startTimestamp: danceStartTime,
    enabled: !!levelData && !!danceStartTime,
    ytPlayerRef: isYoutube ? ytPlayerRef : null,
    videoRef:    isUpload  ? videoRef    : null,
    isPaused
  });

  useAudio({
    audioUrl, startTimestamp: danceStartTime,
    enabled: !isYoutube && !isUpload && !!audioUrl && !!danceStartTime,
    isPaused
  });

  const getEffectiveTolerance = useCallback((kf) => kf?.tolerance ?? DEFAULT_YT_TOLERANCE, []);

  const handleBeat = useCallback((beatNumber, landmarks) => {
    if (!currentKeyframe || !landmarks) return;
    const tolerance = getEffectiveTolerance(currentKeyframe);
    const score = scoreAgainst(landmarks, currentKeyframe.landmarks, tolerance);
    const avg   = getAverage();

    setLiveScores(prev => ({ ...prev, [playerId]: score }));
    setTotalScore(avg);

    // ── Beat feedback ──────────────────────────────────────────────────
    setFeedbackScore(score);
    setFeedbackKey(k => k + 1);

    // ── Combo ──────────────────────────────────────────────────────────
    if (score >= 40) {          // needs GOOD or above to build streak
      setComboCount(c => {
        const next = c + 1;
        if (next >= 10) setFeverMode(true);
        return next;
      });
    } else {
      setComboCount(0);
      if (score < 10) setFeverMode(false); // only break fever on a real miss
    }

    // ── PERFECT screen flash ───────────────────────────────────────────
    if (score >= 88) {
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 220);
    }

    // ── Milestone motivational messages ────────────────────────────────
    if (totalBeats > 0) {
      const pct = Math.floor((beatNumber / totalBeats) * 100);
      for (const milestone of [25, 50, 75]) {
        if (pct >= milestone && !shownMilestonesRef.current.has(milestone)) {
          shownMilestonesRef.current.add(milestone);
          const tier = avg >= 65 ? 'hi' : 'lo';
          setMotivMsg(MOTIV[milestone][tier]);
          setMotivKey(k => k + 1);
          break;
        }
      }
    }

    socket.emit('pose_update', { landmarks, beat: beatNumber });
  }, [currentKeyframe, scoreAgainst, getAverage, playerId, getEffectiveTolerance, totalBeats]);

  useEffect(() => {
    if (!gameOver && currentBeat > 0 && currentBeat >= totalBeats && !submittedRef.current) {
      submittedRef.current = true;
      setGameOver(true);
      if (isYoutube) ytPlayerRef.current?.pause();
      if (isUpload && videoRef.current) videoRef.current.pause();
      socket.emit('submit_score', { avgScore: getAverage(), beatScores: scores.current });
    }
  }, [currentBeat, totalBeats, gameOver, getAverage, scores, isYoutube, isUpload]);

  useEffect(() => {
    socket.on('players_poses', ({ poses }) => setOtherPoses(prev => ({ ...prev, ...poses })));
    socket.on('round_result', ({ rankings }) => {
      const m = {};
      rankings.forEach(r => { m[r.id] = r.score; });
      setLiveScores(m);
    });
    socket.on('game_paused', ({ isPaused: p }) => setIsPaused(p));
    return () => { socket.off('players_poses'); socket.off('round_result'); socket.off('game_paused'); };
  }, []);

  const handleTogglePause = useCallback(() => {
    if (!gameState.isHost) return;
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    socket.emit('toggle_pause', { isPaused: newPaused });
  }, [isPaused, gameState.isHost]);

  const handleLocalPause = useCallback(() => {
    if (gameState.isHost) return;
    setIsLocalPaused(p => !p);
  }, [gameState.isHost]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !gameOver) {
        e.preventDefault();
        if (gameState.isHost) handleTogglePause();
        else handleLocalPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePause, gameOver]);

  const otherPlayers = players.filter(p => p.id !== playerId);

  const localStreamRef  = useRef(null);
  const [hasLocalStream, setHasLocalStream] = useState(false);

  const { remoteStreams } = useWebRTC({
    players,
    playerId,
    localStreamRef,
    enabled: otherPlayers.length > 0 && !!danceStartTime && hasLocalStream,
  });

  if (!levelData) return <div className="game-loading">Loading level data…</div>;

  return (
    <div className={`game-screen ${feverMode ? 'fever-mode' : ''}`}>

      {/* Hidden YouTube player */}
      {isYoutube && videoId && (
        <YouTubePlayer ref={ytPlayerRef} videoId={videoId} hidden onReady={() => setYtReady(true)} />
      )}

      {/* PERFECT screen flash */}
      {screenFlash && <div className="screen-flash" />}

      {/* PAUSED overlay — global (host) */}
      {isPaused && !gameOver && (
        <div className="game-overlay" style={{ cursor: 'default' }}>
          <div className="game-overlay-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            PAUSED
            {gameState.isHost ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, justifyContent: 'center' }}>
                <button onClick={(e) => { e.stopPropagation(); handleTogglePause(); }}
                  style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '12px 24px', fontSize: 13, fontFamily: 'Audiowide, cursive', cursor: 'pointer', borderRadius: '4px', minWidth: 90 }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px var(--glow)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >PLAY</button>
                <button onClick={(e) => { e.stopPropagation(); navigate(gameState.gameMode === 'solo' ? '/solo-setup' : '/lobby'); }}
                  style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '12px 24px', fontSize: 13, fontFamily: 'Audiowide, cursive', cursor: 'pointer', borderRadius: '4px', minWidth: 120 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,31,61,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                >NEXT ROUND</button>
                <button onClick={(e) => { e.stopPropagation(); navigate('/'); }}
                  style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px', fontSize: 13, fontFamily: 'Audiowide, cursive', cursor: 'pointer', borderRadius: '4px', minWidth: 110 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >MAIN MENU</button>
              </div>
            ) : (
              <span style={{ fontSize: '0.45em', letterSpacing: '0.25em', opacity: 0.8, color: 'white', fontFamily: 'Rajdhani, sans-serif' }}>
                PAUSED BY HOST
              </span>
            )}
          </div>
        </div>
      )}

      {/* LOCAL PAUSED overlay — non-host only, doesn't affect others */}
      {isLocalPaused && !isPaused && !gameOver && (
        <div className="game-overlay" style={{ cursor: 'default' }}>
          <div className="game-overlay-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            PAUSED
            <span style={{ fontSize: '0.35em', letterSpacing: '0.2em', opacity: 0.6, color: 'white', fontFamily: 'Rajdhani, sans-serif' }}>
              GAME IS STILL RUNNING FOR OTHERS
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, justifyContent: 'center' }}>
              <button onClick={(e) => { e.stopPropagation(); setIsLocalPaused(false); }}
                style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '12px 24px', fontSize: 13, fontFamily: 'Audiowide, cursive', cursor: 'pointer', borderRadius: '4px', minWidth: 100 }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 20px var(--glow)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >RESUME</button>
              <button onClick={(e) => { e.stopPropagation(); navigate('/lobby'); }}
                style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px', fontSize: 13, fontFamily: 'Audiowide, cursive', cursor: 'pointer', borderRadius: '4px', minWidth: 120 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >GO TO LOBBY</button>
            </div>
          </div>
        </div>
      )}







      <div className="game-main">
        <div className="reference-panel">

          {levelData?.cloudinaryUrl ? (
            <>
              <div className="ref-upload-video">
                <video
                  ref={videoRef}
                  src={levelData.cloudinaryUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  preload="auto" playsInline crossOrigin="anonymous"
                />
                <div className="video-progress-overlay">
                  <BeatIndicator total={totalBeats} getElapsed={getElapsed} keyframes={keyframes} defaultSegmentDuration={defaultSegmentDuration} />
                </div>
              </div>
              <div className="ref-upload-skeleton">
                <div className="reference-dancer">
                  <canvas ref={playerSkeletonCanvasRef} width={320} height={480} className="reference-canvas" />
                  {latestPlayerLandmarks && (
                    <PoseOverlay canvasRef={playerSkeletonCanvasRef}
                      landmarks={latestPlayerLandmarks.map(lm => ({ ...lm, x: 1 - lm.x }))}
                      color="#ffffff" lineWidth={4} dotRadius={6} />
                  )}
                  {!latestPlayerLandmarks && (
                    <div className="reference-placeholder"><span>&#128372;</span><p>Waiting for you…</p></div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="reference-dancer">
              <canvas ref={playerSkeletonCanvasRef} width={320} height={480} className="reference-canvas" />
              {latestPlayerLandmarks && (
                <PoseOverlay canvasRef={playerSkeletonCanvasRef}
                  landmarks={latestPlayerLandmarks.map(lm => ({ ...lm, x: 1 - lm.x }))}
                  color="#ffffff" lineWidth={4} dotRadius={6} />
              )}
              <div className="video-progress-overlay">
                <BeatIndicator total={totalBeats} getElapsed={getElapsed} keyframes={keyframes} defaultSegmentDuration={defaultSegmentDuration} />
              </div>
            </div>
          )}
        </div>

        <div className="camera-panel">



          {/* Combo counter */}
          <ComboDisplay count={comboCount} feverMode={feverMode} />

          <PlayerCamera
            onLandmarks={lms => setLatestPlayerLandmarks(lms)}
            onBeat={(beat) => handleBeat(beat, latestPlayerLandmarks)}
            currentBeat={currentBeat}
            currentKeyframe={currentKeyframe}
            liveScore={liveScores[playerId] ?? null}
            totalScore={totalScore}
            fps={otherPlayers.length > 0 ? 10 : 15}
            onStream={stream => { localStreamRef.current = stream; setHasLocalStream(true); }}
          />
        </div>
      </div>

      {otherPlayers.length > 0 && (
        <div className="others-row">
          <OtherPlayers players={otherPlayers} streams={remoteStreams} scores={liveScores} />
        </div>
      )}

      <div className="leaderboard-row">
        <Leaderboard players={players} scores={liveScores} round={round || 1} />
      </div>



      {gameOver && (
        <div className="game-overlay">
          <div className="game-overlay-text">Round complete! Waiting for results…</div>
        </div>
      )}
    </div>
  );
}
