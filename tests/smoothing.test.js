import { describe, it, expect } from 'vitest';
import { PointSmoother, interpolatePoints, radiusForSpeed } from '../js/smoothing.js';

describe('PointSmoother', () => {
  it('returns the first point unchanged', () => {
    const smoother = new PointSmoother(0.35);
    expect(smoother.update({ x: 10, y: 20 }, 100)).toEqual({ x: 10, y: 20, timestamp: 100 });
  });

  it('moves partially toward later points', () => {
    const smoother = new PointSmoother(0.25);
    smoother.update({ x: 0, y: 0 }, 0);
    const next = smoother.update({ x: 100, y: 0 }, 16);
    expect(next.x).toBe(25);
    expect(next.y).toBe(0);
  });
});

describe('interpolatePoints', () => {
  it('returns intermediate points at roughly the requested spacing', () => {
    const points = interpolatePoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
    expect(points.length).toBeGreaterThan(3);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 100, y: 0 });
  });
});

describe('radiusForSpeed', () => {
  it('uses thicker strokes for slow motion than fast motion', () => {
    expect(radiusForSpeed(50)).toBeGreaterThan(radiusForSpeed(1200));
  });

  it('clamps radius to the configured range', () => {
    expect(radiusForSpeed(0, { min: 10, max: 30 })).toBe(30);
    expect(radiusForSpeed(9999, { min: 10, max: 30 })).toBe(10);
  });
});
