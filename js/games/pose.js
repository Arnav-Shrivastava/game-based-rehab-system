/**
 * CogniCare - pose.js
 * MediaPipe Pose webcam integration for balance games.
 * Expects @mediapipe/camera_utils, @mediapipe/pose, and @mediapipe/drawing_utils to be loaded.
 */

export const Pose = (() => {
  let videoElement = null;
  let canvasElement = null;
  let canvasCtx = null;
  let pose = null;
  let camera = null;

  let currentTorsoCenter = null;
  let poseLandmarks = null;

  async function initWebcam(videoEl, canvasEl) {
    videoElement = videoEl;
    canvasElement = canvasEl;
    canvasCtx = canvasElement.getContext('2d');

    if (!window.Pose || !window.Camera) {
      console.error("MediaPipe scripts not loaded. Check balance.html.");
      return;
    }

    pose = new window.Pose({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }});

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);

    camera = new window.Camera(videoElement, {
      onFrame: async () => {
        await pose.send({image: videoElement});
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
    
    currentTorsoCenter = null;
    poseLandmarks = null;

    if (results.poseLandmarks) {
      poseLandmarks = results.poseLandmarks;
      
      const leftShoulder = poseLandmarks[11];
      const rightShoulder = poseLandmarks[12];
      const leftHip = poseLandmarks[23];
      const rightHip = poseLandmarks[24];

      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        // Average of shoulders and hips for stable center of mass proxy
        const cx = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4;
        const cy = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;

        currentTorsoCenter = {
          x: (1 - cx) * canvasElement.width, // Mirror X
          y: cy * canvasElement.height
        };
      } else if (leftShoulder && rightShoulder) {
        // Fallback to shoulders
        const cx = (leftShoulder.x + rightShoulder.x) / 2;
        const cy = (leftShoulder.y + rightShoulder.y) / 2;
        currentTorsoCenter = {
          x: (1 - cx) * canvasElement.width,
          y: cy * canvasElement.height
        };
      }

      if (window.drawConnectors && window.drawLandmarks) {
        window.drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
        window.drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 1, radius: 2});
      }

      if (currentTorsoCenter) {
        canvasCtx.beginPath();
        // Since canvas is flipped, unflip the x coordinate for drawing over it
        canvasCtx.arc((1 - currentTorsoCenter.x / canvasElement.width) * canvasElement.width, currentTorsoCenter.y, 10, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#FF00FF';
        canvasCtx.fill();
      }
    }
    
    canvasCtx.restore();
  }

  function getTorsoPosition() {
    return currentTorsoCenter;
  }

  function getLandmarks() {
    return poseLandmarks;
  }

  function stop() {
    if (camera) {
      camera.stop();
    }
    if (videoElement && videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(t => t.stop());
    }
  }

  return { initWebcam, getTorsoPosition, getLandmarks, stop };
})();
