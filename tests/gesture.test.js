import { describe, it, expect } from 'vitest';
import { CalibrationGate, getLAngleDegrees, isLShapeHand, areBothHandsLShape } from '../js/gesture.js';

function makeHand(points = {}) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const [idx, value] of Object.entries(points)) {
    lm[Number(idx)] = { x: 0, y: 0, z: 0, ...value };
  }
  return lm;
}

function lHand() {
  return makeHand({
    3: { x: 0.5, y: 0.5 },
    4: { x: 0.35, y: 0.5 },
    5: { x: 0.5, y: 0.5 },
    8: { x: 0.5, y: 0.3 },
  });
}

describe('getLAngleDegrees', () => {
  it('returns about 90 degrees for perpendicular thumb and index vectors', () => {
    expect(getLAngleDegrees(lHand())).toBeCloseTo(90, 1);
  });

  it('returns about 180 degrees for opposite collinear vectors', () => {
    const hand = makeHand({
      3: { x: 0.5, y: 0.5 },
      4: { x: 0.35, y: 0.5 },
      5: { x: 0.5, y: 0.5 },
      8: { x: 0.65, y: 0.5 },
    });
    expect(getLAngleDegrees(hand)).toBeCloseTo(180, 1);
  });
});

describe('isLShapeHand', () => {
  it('accepts hands with thumb and index spread between 70 and 110 degrees', () => {
    expect(isLShapeHand(lHand())).toBe(true);
  });

  it('rejects hands outside the L angle threshold', () => {
    const hand = makeHand({
      3: { x: 0.5, y: 0.5 },
      4: { x: 0.35, y: 0.5 },
      5: { x: 0.5, y: 0.5 },
      8: { x: 0.65, y: 0.5 },
    });
    expect(isLShapeHand(hand)).toBe(false);
  });
});

describe('areBothHandsLShape', () => {
  it('requires two L-shaped hands', () => {
    expect(areBothHandsLShape([lHand(), lHand()])).toBe(true);
    expect(areBothHandsLShape([lHand()])).toBe(false);
    expect(areBothHandsLShape([])).toBe(false);
  });
});

describe('CalibrationGate', () => {
  it('confirms only after both L hands are held for the configured duration', () => {
    const gate = new CalibrationGate({ holdMs: 700 });
    expect(gate.update([lHand(), lHand()], 1000).confirmed).toBe(false);
    expect(gate.update([lHand(), lHand()], 1600).confirmed).toBe(false);
    expect(gate.update([lHand(), lHand()], 1700).confirmed).toBe(true);
  });

  it('resets the hold timer when either hand breaks the L shape', () => {
    const gate = new CalibrationGate({ holdMs: 700 });
    gate.update([lHand(), lHand()], 1000);
    gate.update([lHand()], 1500);
    expect(gate.update([lHand(), lHand()], 2000).confirmed).toBe(false);
    expect(gate.update([lHand(), lHand()], 2700).confirmed).toBe(true);
  });
});
