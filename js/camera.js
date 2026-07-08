// camera.js — opens webcam and mirrors it onto the mirrorCanvas

export function isCameraSupported() {
  return Boolean(globalThis.navigator?.mediaDevices?.getUserMedia);
}

export function getCameraUnavailableMessage() {
  return 'Camera access requires a supported browser and a secure URL. Open this page on https, localhost, or 127.0.0.1, then allow camera permission.';
}

export class Camera {
  constructor(videoEl, mirrorCanvas) {
    this.video = videoEl;
    this.canvas = mirrorCanvas;
    this.ctx = mirrorCanvas.getContext('2d');
    this.stream = null;
  }

  async start() {
    if (!isCameraSupported()) {
      throw new Error(getCameraUnavailableMessage());
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    });
    this.video.srcObject = this.stream;
    await new Promise(resolve => (this.video.onloadedmetadata = resolve));
    await this.video.play();
    this.resize();
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    return { w, h };
  }

  // Draw the current video frame onto the mirror canvas with cover-crop
  // so the drawn canvas fills the viewport without stretching.
  getFrame() {
    if (!this.video.videoWidth) return null;
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const videoRatio = vw / vh;
    const canvasRatio = cw / ch;
    let sx, sy, sw, sh;
    if (videoRatio > canvasRatio) {
      // video is wider — crop left/right
      sh = vh;
      sw = vh * canvasRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      // video is taller — crop top/bottom
      sw = vw;
      sh = vw / canvasRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }
    this.ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, cw, ch);
    return this.video;
  }

  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }
}
