# Foggy Mirror

Foggy Mirror is an interactive, browser-based web application that simulates a foggy mirror experience using your webcam and computer vision.

## What it does

- **Webcam Integration**: Displays a live, mirrored feed from your camera.
- **Machine Learning**: Uses MediaPipe vision models to track your face and hands in real-time right in the browser.
- **Breath Detection (Fogging)**: Open your mouth to simulate "breathing" fog onto the glass. A realistic condensation layer will build up on the screen.
- **Hand Gestures (Calibration & Drawing)**:
  - **Calibration**: Before interacting, you must calibrate by raising both hands in an "L shape" (thumb and index finger open). This acts as a lock to prevent unintended interactions.
  - **Drawing / Wiping**: Once calibrated, you can pinch your thumb and index finger together to "wipe" away the fog, allowing you to draw or write on the foggy mirror with your fingers.
- **Visual Effects**: Built using HTML5 Canvas layers for smooth, realistic condensation fading, noise texturing, and soft-finger erasing strokes.

## How to use

1. Run the project on a local server (e.g., using `npx serve` or Live Server). The camera requires a secure context (localhost, 127.0.0.1, or HTTPS).
2. Allow camera access when prompted by the browser.
3. Follow the on-screen calibration prompt: raise both hands in an L shape.
4. Open your mouth to fog up the mirror.
5. Pinch your thumb and index finger to wipe the fog and draw.
6. Click the "Clear glass" button to instantly reset the fog.

## Technologies Used

- Vanilla JavaScript (ES Modules)
- HTML5 Canvas (Multiple layers for video, mirror, fog, and drawing)
- CSS3 (Styling and UI overlays)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (Face and Hand Landmark detection)
- Vitest (for testing)

## Project Structure

- `index.html`: Main entry point containing the UI and canvas layers.
- `js/app.js`: Core state machine and orchestration logic.
- `js/camera.js`: Webcam handling and responsive video cropping.
- `js/face.js` & `js/hand.js`: Wrappers around MediaPipe for face/mouth and hand/pinch detection.
- `js/fog.js`: Canvas logic for the condensation effect, growth, fading, and erasing.
- `js/draw.js`: Smooth curve interpolation for wiping strokes.
- `js/gesture.js`: Logic for detecting the L-shape calibration gesture.
- `css/style.css`: UI layout and animations.
