import { useCallback, useRef } from 'react';
import { normalizeLandmarks, extractJointAngles } from '../utils/poseUtils.js';
import { cosineSimilarity, similarityToScore } from '../utils/similarity.js';

export default function usePoseScorer() {
  const scoresRef = useRef([]);

  const scoreAgainst = useCallback((playerLandmarks, referenceLandmarks, tolerance = 0.65) => {
    if (!playerLandmarks?.length || !referenceLandmarks?.length) return 0;

    const normPlayer = normalizeLandmarks(playerLandmarks);
    const normRef    = normalizeLandmarks(referenceLandmarks);

    const playerAngles = extractJointAngles(normPlayer);
    const refAngles    = extractJointAngles(normRef);

    const similarity = cosineSimilarity(playerAngles, refAngles);
    const score = similarityToScore(similarity, tolerance);

    scoresRef.current.push(score);
    return score;
  }, []);

  const getAverage = useCallback(() => {
    const arr = scoresRef.current;
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }, []);

  const reset = useCallback(() => {
    scoresRef.current = [];
  }, []);

  return { scoreAgainst, getAverage, reset, scores: scoresRef };
}
