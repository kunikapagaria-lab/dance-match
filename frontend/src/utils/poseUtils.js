export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 25) return landmarks;

  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];

  const hipMidX = (lHip.x + rHip.x) / 2;
  const hipMidY = (lHip.y + rHip.y) / 2;
  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
  const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;

  const torsoHeight = Math.hypot(shoulderMidX - hipMidX, shoulderMidY - hipMidY);
  if (torsoHeight < 0.001) return landmarks;

  return landmarks.map(lm => ({
    x: (lm.x - hipMidX) / torsoHeight,
    y: (lm.y - hipMidY) / torsoHeight,
    z: lm.z !== undefined ? lm.z / torsoHeight : 0,
  }));
}

// Joint triples (parent, joint, child) for angle extraction
const JOINT_TRIPLES = [
  [23, 11, 13], // L hip-shoulder-elbow
  [24, 12, 14], // R hip-shoulder-elbow
  [11, 13, 15], // L shoulder-elbow-wrist
  [12, 14, 16], // R shoulder-elbow-wrist
  [13, 15, 19], // L elbow-wrist-index
  [14, 16, 20], // R elbow-wrist-index
  [11, 23, 25], // L shoulder-hip-knee
  [12, 24, 26], // R shoulder-hip-knee
  [23, 25, 27], // L hip-knee-ankle
  [24, 26, 28], // R hip-knee-ankle
  [25, 27, 31], // L knee-ankle-foot
  [26, 28, 32], // R knee-ankle-foot
];

export function extractJointAngles(landmarks) {
  const vec = [];
  for (const [a, b, c] of JOINT_TRIPLES) {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    const lmC = landmarks[c];
    if (!lmA || !lmB || !lmC) {
      vec.push(0, 0, 0, 0);
      continue;
    }
    // Unit vectors B→A and B→C
    const bax = lmA.x - lmB.x, bay = lmA.y - lmB.y;
    const bcx = lmC.x - lmB.x, bcy = lmC.y - lmB.y;
    const magBA = Math.hypot(bax, bay) || 1;
    const magBC = Math.hypot(bcx, bcy) || 1;
    vec.push(bax / magBA, bay / magBA, bcx / magBC, bcy / magBC);
  }
  return vec;
}

// Skeleton connections for drawing
export const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
];
