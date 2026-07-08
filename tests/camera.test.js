import { describe, it, expect, vi, afterEach } from 'vitest';
import { Camera, getCameraUnavailableMessage, isCameraSupported } from '../js/camera.js';

function makeCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage: vi.fn() })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('camera capability checks', () => {
  it('reports unsupported when mediaDevices is missing', () => {
    vi.stubGlobal('navigator', {});
    expect(isCameraSupported()).toBe(false);
  });

  it('uses a clear secure-context message when getUserMedia is unavailable', () => {
    expect(getCameraUnavailableMessage()).toContain('https');
    expect(getCameraUnavailableMessage()).toContain('localhost');
  });

  it('throws a useful error instead of dereferencing undefined mediaDevices', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', { innerWidth: 800, innerHeight: 600 });
    const video = { play: vi.fn(), srcObject: null };
    const camera = new Camera(video, makeCanvas());

    await expect(camera.start()).rejects.toThrow(/Camera access requires/);
  });
});
