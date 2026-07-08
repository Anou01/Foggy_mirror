// app.js - camera, MediaPipe detectors, fog, drawing, and state machine orchestration.

import { FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { Camera } from './camera.js';
import { FaceDetector } from './face.js';
import { HandDetector } from './hand.js';
import { FogSystem } from './fog.js';
import { DrawingSystem } from './draw.js';
import { CalibrationGate, areBothHandsLShape } from './gesture.js';

export const STATE = {
  WAITING_CALIBRATION: 'WAITING_CALIBRATION',
  COUNTDOWN: 'COUNTDOWN',
  IDLE: 'IDLE',
  FOGGING: 'FOGGING',
  READY: 'READY',
  DRAWING: 'DRAWING',
  RELEASE: 'RELEASE'
};

const DETECT_INTERVAL_MS = 45;
const COUNTDOWN_MS = 3000;
const DETECT_W = 640;
const DETECT_H = 360;

export function advanceState(current, {
  mouthOpen = false,
  pinching = false,
  calibrationConfirmed = false,
  calibrationStillValid = true,
  countdownDone = false,
} = {}) {
  switch (current) {
    case STATE.WAITING_CALIBRATION:
      return calibrationConfirmed ? STATE.COUNTDOWN : current;
    case STATE.COUNTDOWN:
      if (!calibrationStillValid) return STATE.WAITING_CALIBRATION;
      return countdownDone ? STATE.IDLE : current;
    case STATE.IDLE:
      if (mouthOpen) return STATE.FOGGING;
      if (pinching) return STATE.READY;
      return current;
    case STATE.FOGGING:
      return mouthOpen ? current : STATE.READY;
    case STATE.READY:
      if (mouthOpen) return STATE.FOGGING;
      if (pinching) return STATE.DRAWING;
      return current;
    case STATE.DRAWING:
      if (!pinching) return STATE.RELEASE;
      if (mouthOpen) return STATE.FOGGING;
      return current;
    case STATE.RELEASE:
      return mouthOpen ? STATE.FOGGING : STATE.READY;
    default:
      return current;
  }
}

class App {
  constructor() {
    this.video = document.getElementById('video');
    this.mirrorCanvas = document.getElementById('mirrorCanvas');
    this.fogCanvas = document.getElementById('fogCanvas');
    this.drawCanvas = document.getElementById('drawCanvas');

    this.mouthStatusEl = document.getElementById('mouthStatus');
    this.pinchStatusEl = document.getElementById('pinchStatus');
    this.stateStatusEl = document.getElementById('stateStatus');
    this.calibrationPrompt = document.getElementById('calibrationPrompt');
    this.countdownEl = document.getElementById('countdown');
    this.startOverlay = document.getElementById('startOverlay');
    this.startBtn = document.getElementById('startBtn');
    this.resetBtn = document.getElementById('resetBtn');

    this.camera = new Camera(this.video, this.mirrorCanvas);
    this.face = new FaceDetector();
    this.hand = new HandDetector();
    this.fog = new FogSystem(this.fogCanvas);
    this.draw = new DrawingSystem(this.drawCanvas, this.fog);
    this.calibration = new CalibrationGate({ holdMs: 700 });

    this.detectionCanvas = document.createElement('canvas');
    this.detectionCanvas.width = DETECT_W;
    this.detectionCanvas.height = DETECT_H;
    this.detectionCtx = this.detectionCanvas.getContext('2d', { alpha: false });

    this.state = STATE.WAITING_CALIBRATION;
    this.running = false;
    this.unlocked = false;
    this.countdownStartedAt = null;
    this.lastDetectAt = -Infinity;
    this.latest = {
      mouthOpen: false,
      pinching: false,
      indexPoint: null,
      mouthPoint: null,
      hands: [],
      calibration: { valid: false, confirmed: false, progress: 0 }
    };

    this._bindUI();
  }

  _bindUI() {
    this.startBtn.addEventListener('click', () => this.start());
    this.resetBtn.addEventListener('click', () => this.fog.clear());
    window.addEventListener('resize', () => {
      if (!this.running) return;
      const { w, h } = this.camera.resize();
      this.fog.resize(w, h);
      this.draw.resize(w, h);
    });
  }

  async start() {
    this.startBtn.disabled = true;
    this.startBtn.textContent = 'Loading models...';
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      await Promise.all([this.face.init(vision), this.hand.init(vision)]);

      await this.camera.start();
      const { w, h } = this.camera.resize();
      this.fog.resize(w, h);
      this.draw.resize(w, h);
      this.fog.clear();

      this.startOverlay.style.display = 'none';
      this.running = true;
      this._setState(STATE.WAITING_CALIBRATION);
      requestAnimationFrame(ts => this._loop(ts));
    } catch (err) {
      console.error(err);
      this.startBtn.textContent = 'Could not start. Try again';
      this.startBtn.disabled = false;
      const message = err?.message || String(err);
      alert('Unable to access camera or load models: ' + message);
    }
  }

  _setState(next, timestampMs = performance.now()) {
    if (this.state === next) return;
    this.state = next;
    this.stateStatusEl.textContent = `STATE: ${next}`;

    if (next === STATE.COUNTDOWN) {
      this.countdownStartedAt = timestampMs;
      this._showCountdownDigit('3');
    }
    if (next === STATE.WAITING_CALIBRATION) {
      this.countdownStartedAt = null;
      this.unlocked = false;
      this.calibration.reset();
      this.countdownEl.textContent = '';
      this.countdownEl.classList.remove('show');
    }
    if (next === STATE.IDLE && !this.unlocked) {
      this.unlocked = true;
      this.countdownEl.textContent = '';
      this.countdownEl.classList.remove('show');
    }
    this.calibrationPrompt.classList.toggle('hidden', this.unlocked || next === STATE.COUNTDOWN);
  }

  _loop(timestampMs) {
    if (!this.running) return;

    try {
      this.camera.getFrame();
      this._detectIfDue(timestampMs);
      this._advance(timestampMs);
      this._render(timestampMs);
      this._updateStatusUI();
    } catch (err) {
      console.error('[loop error]', err);
    }

    requestAnimationFrame(ts => this._loop(ts));
  }

  _detectIfDue(timestampMs) {
    if (timestampMs - this.lastDetectAt < DETECT_INTERVAL_MS) return;
    this.lastDetectAt = timestampMs;

    const source = this._getDetectionSource();
    const hands = this.hand.detect(source, timestampMs) ?? [];
    this.latest.hands = hands;

    if (!this.unlocked) {
      this.latest.calibration = this.state === STATE.COUNTDOWN
        ? { valid: areBothHandsLShape(hands), confirmed: false, progress: 1 }
        : this.calibration.update(hands, timestampMs);
      this.latest.mouthOpen = false;
      this.latest.pinching = false;
      this.latest.indexPoint = null;
      this.latest.mouthPoint = null;
      return;
    }

    this.face.detect(source, timestampMs);
    this.latest.mouthOpen = this.face.isMouthOpen();
    this.latest.mouthPoint = this.face.getMouthPoint(this.fogCanvas.width, this.fogCanvas.height);
    this.latest.pinching = this.hand.isPinching().pinching;
    this.latest.indexPoint = this.hand.getIndexFinger(this.fogCanvas.width, this.fogCanvas.height);
  }

  _getDetectionSource() {
    if (this.video.readyState >= 2) {
      this.detectionCtx.drawImage(this.video, 0, 0, DETECT_W, DETECT_H);
      return this.detectionCanvas;
    }
    return this.video;
  }

  _advance(timestampMs) {
    const countdownElapsed = this.countdownStartedAt === null ? 0 : timestampMs - this.countdownStartedAt;
    const next = advanceState(this.state, {
      mouthOpen: this.latest.mouthOpen,
      pinching: this.latest.pinching,
      calibrationConfirmed: this.latest.calibration.confirmed,
      calibrationStillValid: this.latest.calibration.valid,
      countdownDone: countdownElapsed >= COUNTDOWN_MS,
    });
    this._setState(next, timestampMs);

    if (this.state === STATE.COUNTDOWN) {
      const remaining = Math.max(0, COUNTDOWN_MS - (timestampMs - this.countdownStartedAt));
      const digit = String(Math.max(1, Math.ceil(remaining / 1000)));
      if (this.countdownEl.textContent !== digit) this._showCountdownDigit(digit);
    }
  }

  _showCountdownDigit(digit) {
    this.countdownEl.textContent = digit;
    this.countdownEl.classList.remove('show');
    void this.countdownEl.offsetWidth;
    this.countdownEl.classList.add('show');
  }

  _render(timestampMs) {
    if (this.state === STATE.FOGGING) {
      this.fog.addFog(this.latest.mouthPoint, timestampMs);
    } else {
      this.fog.fadeFog();
    }

    if (this.state === STATE.DRAWING && this.latest.indexPoint) {
      if (!this.draw.isDrawing) this.draw.startStroke(this.latest.indexPoint.x, this.latest.indexPoint.y, timestampMs);
      else this.draw.drawTo(this.latest.indexPoint.x, this.latest.indexPoint.y, timestampMs);
    } else if (this.draw.isDrawing) {
      this.draw.endStroke();
    }

    this.draw.renderCursor(this.unlocked ? this.latest.indexPoint : null, this.latest.pinching);
    this.fog.render();
  }

  _updateStatusUI() {
    const gated = !this.unlocked;
    this.mouthStatusEl.textContent = gated ? 'Mouth: gated' : (this.latest.mouthOpen ? 'Mouth: open' : 'Mouth: closed');
    this.mouthStatusEl.classList.toggle('active', !gated && this.latest.mouthOpen);
    this.pinchStatusEl.textContent = gated
      ? `Calibration: ${Math.round((this.latest.calibration.progress ?? 0) * 100)}%`
      : (this.latest.pinching ? 'Pinch: drawing' : 'Pinch: no');
    this.pinchStatusEl.classList.toggle('active', gated ? this.latest.calibration.valid : this.latest.pinching);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
