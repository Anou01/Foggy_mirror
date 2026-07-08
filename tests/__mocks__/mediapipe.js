// tests/__mocks__/mediapipe.js
// Stub for @mediapipe/tasks-vision CDN import used in face.js and hand.js.
// Provides minimal class stubs so imports resolve during unit testing.

export const FilesetResolver = {
  forVisionTasks: async () => ({}),
};

export class FaceLandmarker {
  static async createFromOptions() {
    return new FaceLandmarker();
  }
  detectForVideo() {
    return { faceLandmarks: [] };
  }
}

export class HandLandmarker {
  static async createFromOptions() {
    return new HandLandmarker();
  }
  detectForVideo() {
    return { landmarks: [] };
  }
}
