const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;

const DEFAULT_MIN_ANGLE = 70;
const DEFAULT_MAX_ANGLE = 110;
const DEFAULT_HOLD_MS = 700;

function vector(from, to) {
  return { x: to.x - from.x, y: to.y - from.y };
}

function length(v) {
  return Math.hypot(v.x, v.y);
}

export function getLAngleDegrees(landmarks) {
  if (!landmarks?.[THUMB_IP] || !landmarks?.[THUMB_TIP] || !landmarks?.[INDEX_MCP] || !landmarks?.[INDEX_TIP]) {
    return 0;
  }
  const thumb = vector(landmarks[THUMB_IP], landmarks[THUMB_TIP]);
  const index = vector(landmarks[INDEX_MCP], landmarks[INDEX_TIP]);
  const thumbLen = length(thumb);
  const indexLen = length(index);
  if (thumbLen === 0 || indexLen === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, (thumb.x * index.x + thumb.y * index.y) / (thumbLen * indexLen)));
  return Math.acos(cosine) * 180 / Math.PI;
}

export function isLShapeHand(landmarks, { minAngle = DEFAULT_MIN_ANGLE, maxAngle = DEFAULT_MAX_ANGLE } = {}) {
  const angle = getLAngleDegrees(landmarks);
  return angle >= minAngle && angle <= maxAngle;
}

export function areBothHandsLShape(hands, options = {}) {
  if (!Array.isArray(hands) || hands.length < 2) return false;
  return hands.slice(0, 2).every(hand => isLShapeHand(hand, options));
}

export class CalibrationGate {
  constructor({ holdMs = DEFAULT_HOLD_MS, minAngle = DEFAULT_MIN_ANGLE, maxAngle = DEFAULT_MAX_ANGLE } = {}) {
    this.holdMs = holdMs;
    this.angleOptions = { minAngle, maxAngle };
    this.startedAt = null;
    this.confirmed = false;
  }

  reset() {
    this.startedAt = null;
    this.confirmed = false;
  }

  update(hands, timestampMs) {
    const valid = areBothHandsLShape(hands, this.angleOptions);
    if (!valid) {
      this.startedAt = null;
      this.confirmed = false;
      return { valid: false, confirmed: false, progress: 0 };
    }

    if (this.startedAt === null) this.startedAt = timestampMs;
    const elapsed = Math.max(0, timestampMs - this.startedAt);
    this.confirmed = elapsed >= this.holdMs;
    return {
      valid: true,
      confirmed: this.confirmed,
      progress: Math.min(1, elapsed / this.holdMs),
    };
  }
}