// hand.js - MediaPipe HandLandmarker wrapper: detects pinch, index fingertip, and exposes both hands for calibration.

import { HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_NORM_THRESHOLD = 0.06;

export class HandDetector {
  constructor() {
    this.landmarker = null;
    this.lastLandmarks = null;
    this.lastHands = [];
  }

  async init(visionFileset) {
    this.landmarker = await HandLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
  }

  detect(videoEl, timestampMs) {
    if (!this.landmarker) return [];
    const result = this.landmarker.detectForVideo(videoEl, timestampMs);
    this.lastHands = result.landmarks ?? [];
    this.lastLandmarks = this.lastHands[0] ?? null;
    return this.lastHands;
  }

  getHands() {
    return this.lastHands;
  }

  isPinching() {
    if (!this.lastLandmarks) return { pinching: false, x: 0, y: 0 };
    const thumb = this.lastLandmarks[THUMB_TIP];
    const index = this.lastLandmarks[INDEX_TIP];
    const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
    return { pinching: dist < PINCH_NORM_THRESHOLD };
  }

  getIndexFinger(canvasWidth, canvasHeight) {
    if (!this.lastLandmarks) return null;
    const index = this.lastLandmarks[INDEX_TIP];
    return { x: index.x * canvasWidth, y: index.y * canvasHeight };
  }
}