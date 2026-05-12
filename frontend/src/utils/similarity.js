export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom < 1e-10) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

/**
 * Maps cosine similarity → 0–100 score.
 *
 * Design goals:
 *   - Lying still / random body position (~0.40–0.60 similarity) → 0 pts
 *   - Trying but imprecise (~0.70–0.75) → a few pts (10–25)
 *   - Decent match (~0.80) → ~45 pts
 *   - Good match (~0.88) → ~72 pts
 *   - Excellent (~0.93) → ~88 pts
 *   - Perfect (1.0) → 100 pts
 *
 * The strict floor (≥ 0.70) prevents false scores from random poses.
 * The 0.75-power curve is slightly forgiving above the floor,
 * but still requires real effort to reach GREAT / PERFECT.
 *
 * Tolerance shifts the floor per difficulty:
 *   easy   (0.65) → floor 0.70
 *   medium (0.75) → floor 0.78
 *   hard   (0.85) → floor 0.85
 *   expert (0.95) → floor 0.88 (capped so expert is hard but not impossible)
 */
export function similarityToScore(similarity, tolerance = 0.65) {
  const floor = Math.min(Math.max(tolerance + 0.06, 0.70), 0.88);
  if (similarity <= floor) return 0;
  const t = (similarity - floor) / (1 - floor);
  return Math.min(100, Math.round(Math.pow(t, 0.75) * 100));
}
