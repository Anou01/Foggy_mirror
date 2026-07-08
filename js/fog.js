// fog.js - localized condensation layer and soft finger erasing.

const GROW_STEP = 0.02;
const MAX_OPACITY = 0.85;
const FADE_STEP = 0.0005;
const REGROW_STEP = 0.0009;

export class FogSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');
    this.opacity = 0;
    this.breathRadius = 120;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.buffer.width = w;
    this.buffer.height = h;
    this._paintFullBufferTexture(0.18);
  }

  reset() {
    this.opacity = MAX_OPACITY * 0.45;
    this._paintFullBufferTexture(0.22);
  }

  clear() {
    this.opacity = 0;
    this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _paintFullBufferTexture(alpha = 0.18) {
    const { width: w, height: h } = this.buffer;
    this.bufferCtx.clearRect(0, 0, w, h);
    this.bufferCtx.globalCompositeOperation = 'source-over';
    this.bufferCtx.globalAlpha = alpha;
    this.bufferCtx.fillStyle = 'rgba(235,240,245,1)';
    this.bufferCtx.fillRect(0, 0, w, h);
    this.bufferCtx.globalAlpha = 1;
    this._addNoiseTexture(alpha);
  }

  _addNoiseTexture(alpha = 0.12) {
    const { width: w, height: h } = this.buffer;
    this.bufferCtx.save();
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 40 + Math.random() * 130;
      const grad = this.bufferCtx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      this.bufferCtx.fillStyle = grad;
      this.bufferCtx.beginPath();
      this.bufferCtx.arc(x, y, r, 0, Math.PI * 2);
      this.bufferCtx.fill();
    }
    this.bufferCtx.restore();
  }

  addFog(point, timestampMs = performance.now()) {
    if (!point) return;
    this.opacity = Math.min(MAX_OPACITY, this.opacity + GROW_STEP);
    this._paintBreath(point, timestampMs);
  }

  _paintBreath(point, timestampMs) {
    const pulse = 0.5 + 0.5 * Math.sin(timestampMs * 0.006);
    const baseRadius = this.breathRadius + pulse * 28;
    this.bufferCtx.save();
    this.bufferCtx.globalCompositeOperation = 'source-over';
    this.bufferCtx.filter = 'blur(5px)';

    for (let i = 0; i < 7; i++) {
      const angle = timestampMs * 0.0015 + i * 2.399;
      const drift = 8 + i * 5;
      const x = point.x + Math.cos(angle) * drift;
      const y = point.y + Math.sin(angle * 1.3) * drift * 0.65;
      const radius = baseRadius * (0.38 + i * 0.11);
      const alpha = 0.12 - i * 0.011;
      const grad = this.bufferCtx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(245,250,255,${alpha})`);
      grad.addColorStop(0.45, `rgba(230,240,245,${alpha * 0.55})`);
      grad.addColorStop(1, 'rgba(230,240,245,0)');
      this.bufferCtx.fillStyle = grad;
      this.bufferCtx.beginPath();
      this.bufferCtx.arc(x, y, radius, 0, Math.PI * 2);
      this.bufferCtx.fill();
    }
    this.bufferCtx.restore();
    this.bufferCtx.filter = 'none';
  }

  fadeFog() {
    this.opacity = Math.max(0, this.opacity - FADE_STEP);
    this.bufferCtx.save();
    this.bufferCtx.globalCompositeOperation = 'source-over';
    this.bufferCtx.globalAlpha = REGROW_STEP;
    this.bufferCtx.fillStyle = 'rgba(235,240,245,1)';
    this.bufferCtx.fillRect(0, 0, this.buffer.width, this.buffer.height);
    this.bufferCtx.restore();
  }

  eraseAt(x, y, radius = 20, opacity = 1) {
    this.bufferCtx.save();
    this.bufferCtx.globalCompositeOperation = 'destination-out';
    this.bufferCtx.globalAlpha = opacity;
    const grad = this.bufferCtx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    this.bufferCtx.fillStyle = grad;
    this.bufferCtx.beginPath();
    this.bufferCtx.arc(x, y, radius, 0, Math.PI * 2);
    this.bufferCtx.fill();
    this.bufferCtx.restore();
  }

  eraseLine(x1, y1, x2, y2, radius = 20, opacity = 1) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.floor(dist / (radius * 0.35)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.eraseAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius, opacity);
    }
  }

  eraseCurve(points, radius = 20, opacity = 1) {
    if (!points?.length) return;
    if (points.length === 1) {
      this.eraseAt(points[0].x, points[0].y, radius, opacity);
      return;
    }
    for (let i = 1; i < points.length; i++) {
      this.eraseLine(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, radius, opacity);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.opacity <= 0.01) return;
    this.ctx.save();
    this.ctx.globalAlpha = this.opacity;
    this.ctx.filter = 'blur(1.5px)';
    this.ctx.drawImage(this.buffer, 0, 0);
    this.ctx.restore();
  }
}
