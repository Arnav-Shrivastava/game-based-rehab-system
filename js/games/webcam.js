/**
 * CogniCare - webcam.js
 * MediaPipe Hands webcam integration for movement games.
 * Expects @mediapipe/camera_utils, @mediapipe/hands, and @mediapipe/drawing_utils to be loaded.
 */

export const Webcam = (() => {
  let videoElement = null;
  let canvasElement = null;
  let canvasCtx = null;
  let hands = null;
  let camera = null;

  let currentFingertip = null;
  let currentFingertips = {};
  let currentHandedness = null;

  async function initWebcam(videoEl, canvasEl) {
    videoElement = videoEl;
    canvasElement = canvasEl;
    canvasCtx = canvasElement.getContext('2d');

    if (!window.Hands || !window.Camera) {
      console.error("MediaPipe scripts not loaded. Check movement.html.");
      return;
    }

    hands = new window.Hands({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    camera = new window.Camera(videoElement, {
      onFrame: async () => {
        await hands.send({image: videoElement});
      },
      width: 640,
      height: 480
    });
    
    await camera.start();
  }

  function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw the video frame to the canvas (mirrored)
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    currentFingertip = null;
    currentFingertips = {};
    currentHandedness = null;

    if (results.multiHandLandmarks && results.multiHandedness && results.multiHandLandmarks.length > 0) {
      // Determine handedness
      if (results.multiHandedness.length > 1) {
        currentHandedness = 'Both';
      } else {
        // MediaPipe usually returns the opposite label because we mirror the image,
        // but let's stick to the raw label or infer. 
        currentHandedness = results.multiHandedness[0].label; 
      }

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const marks = results.multiHandLandmarks[i];
        const label = results.multiHandedness[i].label;
        const indexTip = marks[8];
        const pos = {
          x: (1 - indexTip.x) * canvasElement.width,
          y: indexTip.y * canvasElement.height
        };
        currentFingertips[label] = pos;

        // Keep currentFingertip for backward compatibility (first hand)
        if (i === 0) currentFingertip = pos;

        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(canvasCtx, marks, window.HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
          window.drawLandmarks(canvasCtx, marks, {color: '#FF0000', lineWidth: 1, radius: 2});
        }

        canvasCtx.beginPath();
        canvasCtx.arc(indexTip.x * canvasElement.width, indexTip.y * canvasElement.height, 8, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#0000FF';
        canvasCtx.fill();
      }
    }
    
    canvasCtx.restore();
  }

  function getFingertipPosition() {
    return currentFingertip;
  }

  function getFingertipPositions() {
    return currentFingertips;
  }

  function getHandedness() {
    return currentHandedness;
  }

  function stop() {
    if (camera) {
      camera.stop();
    }
    if (videoElement && videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(t => t.stop());
    }
  }

  return { initWebcam, getFingertipPosition, getFingertipPositions, getHandedness, stop };
})();
