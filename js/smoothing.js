export class PointSmoother {
  constructor(alpha = 0.35) {
    this.alpha = alpha;
    this.current = null;
  }

  reset() {
    this.current = null;
  }

  update(point, timestamp) {
    if (!point) return null;
    if (!this.current) {
      this.current = { x: point.x, y: point.y, timestamp };
      return this.current;
    }
    this.current = {
      x: this.current.x + (point.x - this.current.x) * this.alpha,
      y: this.current.y + (point.y - this.current.y) * this.alpha,
      timestamp,
    };
    return this.current;
  }
}

export function interpolatePoints(from, to, spacing = 8) {
  if (!from || !to) return to ? [to] : [];
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(dist / spacing));
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return points;
}

export function radiusForSpeed(speedPxPerSecond, { min = 10, max = 30, fast = 1400 } = {}) {
  const normalized = Math.max(0, Math.min(1, speedPxPerSecond / fast));
  return max - (max - min) * normalized;
}

export function speedBetween(from, to) {
  if (!from || !to || to.timestamp === from.timestamp) return 0;
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const seconds = Math.max(0.001, (to.timestamp - from.timestamp) / 1000);
  return dist / seconds;
}