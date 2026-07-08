// tests/hand.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { HandDetector } from '../js/hand.js';

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_NORM_THRESHOLD = 0.06; // must match hand.js constant

function makeLandmarks(overrides = {}) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const [idx, val] of Object.entries(overrides)) {
    lm[Number(idx)] = { x: 0, y: 0, z: 0, ...val };
  }
  return lm;
}

let hand;
beforeEach(() => {
  hand = new HandDetector();
});

// ---------------------------------------------------------------------------
// isPinching
// ---------------------------------------------------------------------------
describe('HandDetector.isPinching()', () => {
  it('returns { pinching: false } when no landmarks', () => {
    const result = hand.isPinching(800, 600);
    expect(result.pinching).toBe(false);
  });

  it('detects a pinch when thumb and index are very close', () => {
    // Distance ≈ 0.02 (well under 0.06 threshold)
    hand.lastLandmarks = makeLandmarks({
      [THUMB_TIP]: { x: 0.50, y: 0.50 },
      [INDEX_TIP]: { x: 0.51, y: 0.51 },
    });
    expect(hand.isPinching(800, 600).pinching).toBe(true);
  });

  it('does NOT detect a pinch when fingers are far apart', () => {
    // Distance ≈ 0.14 (well over 0.06 threshold)
    hand.lastLandmarks = makeLandmarks({
      [THUMB_TIP]: { x: 0.40, y: 0.50 },
      [INDEX_TIP]: { x: 0.50, y: 0.60 },
    });
    expect(hand.isPinching(800, 600).pinching).toBe(false);
  });

  it('BUG FIX: result is display-size-independent (norm coords)', () => {
    // Same hand pose should give the same pinching result on any canvas size
    hand.lastLandmarks = makeLandmarks({
      [THUMB_TIP]: { x: 0.50, y: 0.50 },
      [INDEX_TIP]: { x: 0.51, y: 0.51 },
    });
    const small = hand.isPinching(320, 240);
    const large = hand.isPinching(1920, 1080);
    expect(small.pinching).toBe(large.pinching);
  });

  it('pinch exactly at threshold is NOT pinching', () => {
    // Distance = PINCH_NORM_THRESHOLD exactly → should NOT trigger (strict <)
    const d = PINCH_NORM_THRESHOLD;
    hand.lastLandmarks = makeLandmarks({
      [THUMB_TIP]: { x: 0.50, y: 0.50 },
      [INDEX_TIP]: { x: 0.50 + d, y: 0.50 },
    });
    expect(hand.isPinching(800, 600).pinching).toBe(false);
  });

  it('pinch just under threshold IS pinching', () => {
    const d = PINCH_NORM_THRESHOLD - 0.005;
    hand.lastLandmarks = makeLandmarks({
      [THUMB_TIP]: { x: 0.50, y: 0.50 },
      [INDEX_TIP]: { x: 0.50 + d, y: 0.50 },
    });
    expect(hand.isPinching(800, 600).pinching).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getIndexFinger
// ---------------------------------------------------------------------------
describe('HandDetector.getIndexFinger()', () => {
  it('returns null when no landmarks', () => {
    expect(hand.getIndexFinger(800, 600)).toBeNull();
  });

  it('maps normalized coords to canvas pixel coords', () => {
    hand.lastLandmarks = makeLandmarks({
      [INDEX_TIP]: { x: 0.25, y: 0.75 },
    });
    const pt = hand.getIndexFinger(800, 600);
    expect(pt.x).toBeCloseTo(0.25 * 800);
    expect(pt.y).toBeCloseTo(0.75 * 600);
  });

  it('returns (0,0) pixel when index tip is at top-left', () => {
    hand.lastLandmarks = makeLandmarks({
      [INDEX_TIP]: { x: 0, y: 0 },
    });
    const pt = hand.getIndexFinger(800, 600);
    expect(pt.x).toBe(0);
    expect(pt.y).toBe(0);
  });

  it('returns (width,height) when index tip is at bottom-right', () => {
    hand.lastLandmarks = makeLandmarks({
      [INDEX_TIP]: { x: 1, y: 1 },
    });
    const pt = hand.getIndexFinger(800, 600);
    expect(pt.x).toBe(800);
    expect(pt.y).toBe(600);
  });
});
