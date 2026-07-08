import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrawingSystem } from '../js/draw.js';

function makeCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
  };
}

function makeCanvas(w = 800, h = 600) {
  const ctx = makeCtx();
  return { width: w, height: h, style: {}, getContext: vi.fn(() => ctx), _ctx: ctx };
}

function makeFog() {
  return { eraseAt: vi.fn(), eraseLine: vi.fn(), eraseCurve: vi.fn() };
}

let draw;
let fog;
let canvas;

beforeEach(() => {
  canvas = makeCanvas();
  fog = makeFog();
  draw = new DrawingSystem(canvas, fog);
});

describe('DrawingSystem.startStroke()', () => {
  it('sets isDrawing to true', () => {
    draw.startStroke(100, 200, 0);
    expect(draw.isDrawing).toBe(true);
  });

  it('stores prevPoint', () => {
    draw.startStroke(100, 200, 0);
    expect(draw.prevPoint.x).toBe(100);
    expect(draw.prevPoint.y).toBe(200);
  });

  it('calls fog.eraseAt at the starting point', () => {
    draw.startStroke(100, 200, 0);
    expect(fog.eraseAt).toHaveBeenCalledWith(100, 200, draw.eraseRadius, 1);
  });
});

describe('DrawingSystem.drawTo()', () => {
  it('does nothing if not drawing', () => {
    draw.drawTo(100, 200, 0);
    expect(fog.eraseCurve).not.toHaveBeenCalled();
    expect(fog.eraseAt).not.toHaveBeenCalled();
  });

  it('erases an interpolated curve from previous point to the new point', () => {
    draw.startStroke(50, 50, 0);
    fog.eraseAt.mockClear();
    draw.drawTo(150, 150, 100);
    expect(fog.eraseCurve).toHaveBeenCalled();
    expect(fog.eraseCurve.mock.calls[0][0].length).toBeGreaterThan(2);
  });

  it('updates prevPoint after each drawTo', () => {
    draw.startStroke(0, 0, 0);
    draw.drawTo(100, 100, 100);
    expect(draw.prevPoint.x).toBeGreaterThan(0);
    draw.drawTo(200, 200, 200);
    expect(draw.prevPoint.x).toBeGreaterThan(100);
  });

  it('uses thicker erase radius for slow movement than fast movement', () => {
    draw.startStroke(0, 0, 0);
    draw.drawTo(10, 0, 100);
    const slowRadius = fog.eraseCurve.mock.calls.at(-1)[1];
    draw.drawTo(300, 0, 116);
    const fastRadius = fog.eraseCurve.mock.calls.at(-1)[1];
    expect(slowRadius).toBeGreaterThan(fastRadius);
  });
});

describe('DrawingSystem.endStroke()', () => {
  it('sets isDrawing to false and clears prevPoint', () => {
    draw.startStroke(100, 100, 0);
    draw.endStroke();
    expect(draw.isDrawing).toBe(false);
    expect(draw.prevPoint).toBeNull();
  });
});

describe('DrawingSystem.renderCursor()', () => {
  it('clears the canvas every call', () => {
    draw.renderCursor(null, false);
    expect(canvas._ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('does not draw cursor when point is null', () => {
    draw.renderCursor(null, false);
    expect(canvas._ctx.arc).not.toHaveBeenCalled();
  });

  it('draws a larger circle when pinching', () => {
    draw.renderCursor({ x: 100, y: 100 }, true);
    const pinchRadius = canvas._ctx.arc.mock.calls[0][2];
    canvas._ctx.arc.mockClear();
    draw.renderCursor({ x: 100, y: 100 }, false);
    const noRadius = canvas._ctx.arc.mock.calls[0][2];
    expect(pinchRadius).toBeGreaterThan(noRadius);
  });
});

describe('DrawingSystem.resize()', () => {
  it('updates canvas dimensions', () => {
    draw.resize(1920, 1080);
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
  });

  it('does NOT set style.width/height because CSS handles it', () => {
    draw.resize(1920, 1080);
    expect(canvas.style.width).toBeUndefined();
    expect(canvas.style.height).toBeUndefined();
  });
});