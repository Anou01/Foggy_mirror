// draw.js - smoothed finger-driven erasing strokes over the fog layer.

import { PointSmoother, interpolatePoints, radiusForSpeed, speedBetween } from './smoothing.js';

export class DrawingSystem {
  constructor(drawCanvas, fogSystem) {
    this.canvas = drawCanvas;
    this.ctx = drawCanvas.getContext('2d');
    this.fog = fogSystem;
    this.isDrawing = false;
    this.prevPoint = null;
    this.eraseRadius = 20;
    this.smoother = new PointSmoother(0.42);
    this.spacing = 7;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  startStroke(x, y, timestampMs = performance.now()) {
    this.isDrawing = true;
    this.smoother.reset();
    this.prevPoint = this.smoother.update({ x, y }, timestampMs);
    this.fog.eraseAt(x, y, this.eraseRadius, 1);
  }

  drawTo(x, y, timestampMs = performance.now()) {
    if (!this.isDrawing) return;
    const previous = this.prevPoint;
    const next = this.smoother.update({ x, y }, timestampMs);
    if (previous && next) {
      const speed = speedBetween(previous, next);
      const radius = radiusForSpeed(speed, { min: 10, max: 30, fast: 1500 });
      const opacity = Math.max(0.55, Math.min(1, radius / 24));
      const points = interpolatePoints(previous, next, this.spacing);
      this.fog.eraseCurve(points, radius, opacity);
    } else if (next) {
      this.fog.eraseAt(next.x, next.y, this.eraseRadius, 1);
    }
    this.prevPoint = next;
  }

  endStroke() {
    this.isDrawing = false;
    this.prevPoint = null;
    this.smoother.reset();
  }

  renderCursor(point, pinching) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!point) return;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, pinching ? 9 : 6, 0, Math.PI * 2);
    this.ctx.fillStyle = pinching ? 'rgba(127,216,255,0.9)' : 'rgba(255,255,255,0.5)';
    this.ctx.fill();
    this.ctx.restore();
  }
}