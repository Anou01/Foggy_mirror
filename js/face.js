// face.js - MediaPipe FaceLandmarker wrapper: detects mouth-open breath events and mouth position.

import { FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const MOUTH_OPEN_THRESHOLD = 0.05;
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const LEFT_CORNER = 61;
const RIGHT_CORNER = 291;

export class FaceDetector {
  constructor() {
    this.landmarker = null;
    this.lastLandmarks = null;
  }

  async init(visionFileset) {
    this.landmarker = await FaceLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 1
    });
  }

  detect(videoEl, timestampMs) {
    if (!this.landmarker) return null;
    const result = this.landmarker.detectForVideo(videoEl, timestampMs);
    this.lastLandmarks = result.faceLandmarks?.[0] ?? null;
    return this.lastLandmarks;
  }

  getMouthOpenRatio() {
    if (!this.lastLandmarks) return 0;
    const upper = this.lastLandmarks[UPPER_LIP];
    const lower = this.lastLandmarks[LOWER_LIP];
    const left = this.lastLandmarks[LEFT_CORNER];
    const right = this.lastLandmarks[RIGHT_CORNER];
    const vertical = Math.abs(lower.y - upper.y);
    const horizontal = Math.hypot(left.x - right.x, left.y - right.y);
    if (horizontal === 0) return 0;
    return vertical / horizontal;
  }

  getRawMouthOpen() {
    if (!this.lastLandmarks) return 0;
    const upper = this.lastLandmarks[UPPER_LIP];
    const lower = this.lastLandmarks[LOWER_LIP];
    return Math.abs(lower.y - upper.y);
  }

  getMouthPoint(canvasWidth, canvasHeight) {
    if (!this.lastLandmarks) return null;
    const upper = this.lastLandmarks[UPPER_LIP];
    const lower = this.lastLandmarks[LOWER_LIP];
    return {
      x: ((upper.x + lower.x) / 2) * canvasWidth,
      y: ((upper.y + lower.y) / 2) * canvasHeight,
    };
  }

  isMouthOpen() {
    if (!this.lastLandmarks) return false;
    return this.getRawMouthOpen() > MOUTH_OPEN_THRESHOLD || this.getMouthOpenRatio() > 0.35;
  }
}