// tests/face.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { FaceDetector } from '../js/face.js';

// Landmark indices used by face.js
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const LEFT_CORNER = 61;
const RIGHT_CORNER = 291;

// Build a minimal 478-point landmark array filled with zeroes,
// then override the specific indices we care about.
function makeLandmarks(overrides = {}) {
  const lm = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const [idx, val] of Object.entries(overrides)) {
    lm[Number(idx)] = { x: 0, y: 0, z: 0, ...val };
  }
  return lm;
}

let face;
beforeEach(() => {
  face = new FaceDetector();
});

// ---------------------------------------------------------------------------
// getMouthOpenRatio — vertical / horizontal
// ---------------------------------------------------------------------------
describe('FaceDetector.getMouthOpenRatio()', () => {
  it('returns 0 when no landmarks detected', () => {
    expect(face.getMouthOpenRatio()).toBe(0);
  });

  it('returns 0 when mouth width is zero (degenerate)', () => {
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { y: 0.4 },
      [LOWER_LIP]: { y: 0.5 },
      [LEFT_CORNER]: { x: 0.3, y: 0.45 },
      [RIGHT_CORNER]: { x: 0.3, y: 0.45 }, // same x → zero width
    });
    expect(face.getMouthOpenRatio()).toBe(0);
  });

  it('returns a positive ratio when mouth is open', () => {
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { x: 0.5, y: 0.40 },
      [LOWER_LIP]: { x: 0.5, y: 0.60 }, // 0.20 apart vertically
      [LEFT_CORNER]: { x: 0.30, y: 0.50 },
      [RIGHT_CORNER]: { x: 0.70, y: 0.50 }, // 0.40 apart horizontally
    });
    const ratio = face.getMouthOpenRatio();
    // vertical=0.20, horizontal=0.40 → ratio=0.5
    expect(ratio).toBeCloseTo(0.5, 2);
  });

  it('BUG FIX: vertical uses abs(lower.y - upper.y) not hypot(dx,dy)', () => {
    // If x coords differ but y coords are the same, vertical gap should be 0
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { x: 0.45, y: 0.50 },
      [LOWER_LIP]: { x: 0.55, y: 0.50 }, // same y, different x
      [LEFT_CORNER]: { x: 0.30, y: 0.50 },
      [RIGHT_CORNER]: { x: 0.70, y: 0.50 },
    });
    // Bug: old code computed hypot(0.55-0.45, 0.50-0.50) = 0.10 (non-zero!)
    // Fix: abs(0.50 - 0.50) = 0
    expect(face.getMouthOpenRatio()).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// getRawMouthOpen
// ---------------------------------------------------------------------------
describe('FaceDetector.getRawMouthOpen()', () => {
  it('returns 0 with no landmarks', () => {
    expect(face.getRawMouthOpen()).toBe(0);
  });

  it('returns the absolute y distance between upper and lower lip', () => {
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { y: 0.40 },
      [LOWER_LIP]: { y: 0.46 },
    });
    expect(face.getRawMouthOpen()).toBeCloseTo(0.06, 5);
  });
});

// ---------------------------------------------------------------------------
// isMouthOpen
// ---------------------------------------------------------------------------
describe('FaceDetector.isMouthOpen()', () => {
  it('returns false with no landmarks', () => {
    expect(face.isMouthOpen()).toBe(false);
  });

  it('returns true when raw gap > 0.05 threshold', () => {
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { x: 0.5, y: 0.40 },
      [LOWER_LIP]: { x: 0.5, y: 0.46 }, // gap = 0.06 > 0.05
      [LEFT_CORNER]: { x: 0.30, y: 0.43 },
      [RIGHT_CORNER]: { x: 0.70, y: 0.43 },
    });
    expect(face.isMouthOpen()).toBe(true);
  });

  it('returns true when ratio > 0.35 even if raw is small', () => {
    // Large ratio: vertical=0.15, horizontal=0.40 → ratio=0.375
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { x: 0.5, y: 0.43 },
      [LOWER_LIP]: { x: 0.5, y: 0.58 },
      [LEFT_CORNER]: { x: 0.30, y: 0.50 },
      [RIGHT_CORNER]: { x: 0.70, y: 0.50 },
    });
    expect(face.isMouthOpen()).toBe(true);
  });

  it('returns false when mouth is closed (small gap and small ratio)', () => {
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { x: 0.5, y: 0.490 },
      [LOWER_LIP]: { x: 0.5, y: 0.500 }, // gap = 0.01 < 0.05
      [LEFT_CORNER]: { x: 0.30, y: 0.495 },
      [RIGHT_CORNER]: { x: 0.70, y: 0.495 }, // width=0.40 → ratio=0.025 < 0.35
    });
    expect(face.isMouthOpen()).toBe(false);
  });
});

describe('FaceDetector.getMouthPoint()', () => {
  it('returns null when no landmarks are available', () => {
    expect(face.getMouthPoint(800, 600)).toBeNull();
  });

  it('returns midpoint between upper and lower lip in canvas coordinates', () => {
    face.lastLandmarks = makeLandmarks({
      [UPPER_LIP]: { x: 0.4, y: 0.5 },
      [LOWER_LIP]: { x: 0.6, y: 0.7 },
    });
    expect(face.getMouthPoint(1000, 500)).toEqual({ x: 500, y: 300 });
  });
});
