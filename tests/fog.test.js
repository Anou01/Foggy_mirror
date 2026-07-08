// tests/fog.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FogSystem } from '../js/fog.js';

// ---------------------------------------------------------------------------
// Minimal Canvas 2D mock (jsdom doesn't implement canvas rendering)
// ---------------------------------------------------------------------------
function makeCanvas(w = 800, h = 600) {
  const buffers = [];
  const makeCtx = () => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    filter: '',
  });
  const canvas = {
    width: w,
    height: h,
    style: {},
    getContext: vi.fn(() => makeCtx()),
  };
  // document.createElement mock returns the same kind of canvas object
  const orig = globalThis.document?.createElement;
  return canvas;
}

// Patch document.createElement before each test suite so FogSystem's
// `this.buffer = document.createElement('canvas')` gets a mock canvas.
let fog;
beforeEach(() => {
  const mockCtx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    filter: '',
  };
  const makeCanvas = (w = 0, h = 0) => ({
    width: w,
    height: h,
    style: {},
    getContext: () => mockCtx,
  });

  // Stub document.createElement for the buffer canvas inside FogSystem
  vi.stubGlobal('document', {
    createElement: vi.fn(() => makeCanvas()),
  });

  const canvas = makeCanvas(800, 600);
  fog = new FogSystem(canvas);
  fog.resize(800, 600);
});

// ---------------------------------------------------------------------------
// addFog
// ---------------------------------------------------------------------------
describe('FogSystem.addFog()', () => {
  it('increases opacity by GROW_STEP each call', () => {
    const before = fog.opacity;
    fog.addFog({ x: 100, y: 120 }, 1000);
    expect(fog.opacity).toBeGreaterThan(before);
  });

  it('does not exceed MAX_OPACITY (0.85)', () => {
    fog.opacity = 0.84;
    fog.addFog({ x: 100, y: 120 }, 1000);
    fog.addFog({ x: 100, y: 120 }, 1000);
    fog.addFog({ x: 100, y: 120 }, 1000);
    expect(fog.opacity).toBeLessThanOrEqual(0.85);
  });
});

// ---------------------------------------------------------------------------
// fadeFog
// ---------------------------------------------------------------------------
describe('FogSystem.fadeFog()', () => {
  it('decreases opacity each call', () => {
    fog.opacity = 0.5;
    fog.fadeFog();
    expect(fog.opacity).toBeLessThan(0.5);
  });

  it('does not go below 0', () => {
    fog.opacity = 0;
    fog.fadeFog();
    expect(fog.opacity).toBeGreaterThanOrEqual(0);
  });
});

describe('FogSystem.clear()', () => {
  it('clears the visible fog and resets opacity to zero', () => {
    fog.opacity = 0.5;
    fog.clear();
    expect(fog.opacity).toBe(0);
    expect(fog.bufferCtx.clearRect).toHaveBeenCalledWith(0, 0, fog.buffer.width, fog.buffer.height);
  });
});

// ---------------------------------------------------------------------------
// eraseAt
// ---------------------------------------------------------------------------
describe('FogSystem.eraseAt()', () => {
  it('sets destination-out composite op', () => {
    fog.eraseAt(100, 100);
    expect(fog.bufferCtx.globalCompositeOperation).toBe('destination-out');
  });

  it('calls arc and fill on the buffer context', () => {
    fog.eraseAt(200, 300, 25);
    expect(fog.bufferCtx.arc).toHaveBeenCalledWith(200, 300, 25, 0, Math.PI * 2);
    expect(fog.bufferCtx.fill).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// eraseLine
// ---------------------------------------------------------------------------
describe('FogSystem.eraseLine()', () => {
  it('calls eraseAt at least once for a zero-length segment', () => {
    const spy = vi.spyOn(fog, 'eraseAt');
    fog.eraseLine(100, 100, 100, 100);
    expect(spy).toHaveBeenCalled();
  });

  it('calls eraseAt multiple times for a long segment', () => {
    const spy = vi.spyOn(fog, 'eraseAt');
    fog.eraseLine(0, 0, 400, 0, 20); // 400px line, step ~8px → ≥2 calls
    expect(spy.mock.calls.length).toBeGreaterThan(2);
  });

  it('starts at (x1,y1) and ends at (x2,y2)', () => {
    const spy = vi.spyOn(fog, 'eraseAt');
    fog.eraseLine(10, 20, 50, 80);
    const calls = spy.mock.calls;
    const first = calls[0];
    const last = calls[calls.length - 1];
    expect(first[0]).toBeCloseTo(10);
    expect(first[1]).toBeCloseTo(20);
    expect(last[0]).toBeCloseTo(50);
    expect(last[1]).toBeCloseTo(80);
  });
});

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
describe('FogSystem.render()', () => {
  it('skips drawing when opacity is near zero', () => {
    fog.opacity = 0;
    fog.render();
    expect(fog.ctx.drawImage).not.toHaveBeenCalled();
  });

  it('draws the buffer when opacity > 0.01', () => {
    fog.opacity = 0.5;
    fog.render();
    expect(fog.ctx.drawImage).toHaveBeenCalledWith(fog.buffer, 0, 0);
  });
});

describe('FogSystem localized breath fog', () => {
  it('uses radial gradients instead of full-screen fillRect when adding breath fog', () => {
    fog.bufferCtx.fillRect.mockClear();
    fog.bufferCtx.createRadialGradient.mockClear();
    fog.addFog({ x: 320, y: 240 }, 1000);
    expect(fog.bufferCtx.createRadialGradient).toHaveBeenCalled();
    expect(fog.bufferCtx.arc).toHaveBeenCalled();
    expect(fog.bufferCtx.fillRect).not.toHaveBeenCalledWith(0, 0, fog.buffer.width, fog.buffer.height);
  });
});
