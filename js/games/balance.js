import { Storage } from '../storage.js';
import { UI } from '../ui.js';
import { TherapySetup } from './therapy-setup.js';
import { Pose } from './pose.js';

const BALANCE_MODES = [
  { 
    num: 1, 
    name: 'Weight-Shift Catcher', 
    desc: 'Shift your weight left and right to catch falling items.', 
    fullDesc: 'Stand in front of the camera. Lean your torso left or right to move the basket and catch the falling objects.' 
  }
];

document.addEventListener('DOMContentLoaded', () => {
  let selectedPatient = null;
  let selectedLevel = null;
  let settings = Storage.getSettings();

  let gameState = {
    running: false,
    paused: false,
    score: 0,
    correct: 0,
    wrong: 0,
    fallingItems: [],
    startTime: null,
    elapsedSeconds: 0,
    sessionTimerInterval: null,
    itemSpawnInterval: null,
    animationFrameId: null,
    paddleX: 0
  };

  TherapySetup.initSetup(BALANCE_MODES, startSession);

  const arena = document.getElementById('game-arena');

  async function startSession({ patientId, levelId }) {
    selectedPatient = Storage.getPatientById(patientId);
    selectedLevel = BALANCE_MODES.find(m => m.num === levelId);
    if (!selectedPatient || !selectedLevel) return;
    settings = Storage.getSettings();
    resetGameState();

    document.getElementById('therapy-setup').style.display = 'none';
    document.getElementById('therapy-game').style.display = '';

    document.getElementById('game-patient-name').textContent = selectedPatient.name;
    document.getElementById('game-level-label').textContent = selectedLevel.name;

    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('game-canvas');
    const overlay = document.getElementById('overlay-canvas');

    canvas.width = arena.offsetWidth;
    canvas.height = arena.offsetHeight;
    if (overlay) {
      overlay.width = arena.offsetWidth;
      overlay.height = arena.offsetHeight;
    }

    gameState.paddleX = canvas.width / 2;

    try {
      await Pose.initWebcam(video, canvas);
    } catch (err) {
      console.warn('Pose init failed:', err);
      UI.showToast("Camera access denied or failed. Please allow camera permissions.", "error");
      document.getElementById('therapy-setup').style.display = '';
      document.getElementById('therapy-game').style.display = 'none';
      return;
    }

    startGameTimer();
    updateHUD();
    gameState.running = true;

    startSpawning();
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function resetGameState() {
    clearInterval(gameState.sessionTimerInterval);
    clearInterval(gameState.itemSpawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    gameState = {
      running: true,
      paused: false,
      score: 0, correct: 0, wrong: 0,
      fallingItems: [],
      startTime: Date.now(),
      elapsedSeconds: 0,
      sessionTimerInterval: null,
      itemSpawnInterval: null,
      animationFrameId: null,
      paddleX: 0
    };
    const overlay = document.getElementById('overlay-canvas');
    if (overlay) overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
  }

  function startGameTimer() {
    gameState.sessionTimerInterval = setInterval(() => {
      if (gameState.paused) return;
      gameState.elapsedSeconds++;
      const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2, '0');
      const ss = String(gameState.elapsedSeconds % 60).padStart(2, '0');
      document.getElementById('gs-timer').textContent = `${mm}:${ss}`;

      const maxSeconds = (settings.movementDuration || 3) * 60;
      updateProgress((gameState.elapsedSeconds / maxSeconds) * 100);

      if (gameState.elapsedSeconds >= maxSeconds) {
        finishSession();
      }
    }, 1000);
  }

  function startSpawning() {
    const speedMs = 1500;
    gameState.itemSpawnInterval = setInterval(() => {
      if (gameState.paused || !gameState.running) return;
      spawnItem();
    }, speedMs);
  }

  function spawnItem() {
    const width = arena.offsetWidth;
    const margin = 50;
    const x = margin + Math.random() * (width - margin * 2);
    
    gameState.fallingItems.push({
      x: x,
      y: -30,
      speed: 3 + Math.random() * 2,
      active: true
    });
  }

  function gameLoop() {
    if (!gameState.running) return;
    if (!gameState.paused) {
      const torso = Pose.getTorsoPosition();
      const canvas = document.getElementById('overlay-canvas');
      const ctx = canvas.getContext('2d');
      
      if (torso) {
        // Map torso x (0 to webcam width) to canvas width
        // Assume player stands in middle, shift left/right
        // Use a smoothing factor to reduce jitter
        const targetX = torso.x;
        gameState.paddleX += (targetX - gameState.paddleX) * 0.2;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Paddle
      const paddleWidth = 120;
      const paddleHeight = 20;
      const paddleY = canvas.height - 40;
      
      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.roundRect(gameState.paddleX - paddleWidth/2, paddleY, paddleWidth, paddleHeight, 10);
      ctx.fill();

      // Update and draw falling items
      for (let i = gameState.fallingItems.length - 1; i >= 0; i--) {
        const item = gameState.fallingItems[i];
        if (!item.active) {
          gameState.fallingItems.splice(i, 1);
          continue;
        }

        item.y += item.speed;

        // Draw item
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 15, 0, 2 * Math.PI);
        ctx.fill();

        // Collision detection
        if (item.y + 15 >= paddleY && item.y - 15 <= paddleY + paddleHeight) {
          if (item.x >= gameState.paddleX - paddleWidth/2 && item.x <= gameState.paddleX + paddleWidth/2) {
            item.active = false;
            gameState.correct++;
            gameState.score += 10;
            UI.Sounds.pop();
            updateHUD();
          }
        }

        // Out of bounds
        if (item.y > canvas.height + 30) {
          item.active = false;
          gameState.wrong++;
          UI.Sounds.wrong();
          updateHUD(true);
        }
      }
    }
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function finishSession() {
    gameState.running = false;
    clearInterval(gameState.sessionTimerInterval);
    clearInterval(gameState.itemSpawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    Pose.stop();
    UI.Sounds.complete();

    const total = gameState.correct + gameState.wrong;
    const accuracy = total > 0 ? Math.round((gameState.correct / total) * 100) : 100;

    const session = Storage.endSession({
      patientId: selectedPatient.id,
      gameType: 'balance-weight-shift',
      level: selectedLevel.num,
      accuracy,
      correct: gameState.correct,
      wrong: gameState.wrong,
      extra: {
        patientName: selectedPatient.name,
        levelName: selectedLevel.name,
        score: gameState.score,
        completionTime: gameState.elapsedSeconds
      }
    });
    
    showResults(accuracy, session);
  }

  function updateHUD(animateWrong = false) {
    document.getElementById('gs-score').textContent = gameState.score;
    document.getElementById('gs-correct').textContent = gameState.correct;
    const wrongEl = document.getElementById('gs-wrong');
    wrongEl.textContent = gameState.wrong;
    if (animateWrong && gameState.wrong > 0) {
      wrongEl.classList.remove('wrong-bump');
      void wrongEl.offsetWidth;
      wrongEl.classList.add('wrong-bump');
    }
  }

  function updateProgress(pct) {
    const p = Math.min(100, Math.max(0, pct));
    const fill = document.getElementById('game-progress-fill');
    if (fill) fill.style.width = p + '%';
    const lbl = document.getElementById('progress-label');
    if (lbl) lbl.textContent = Math.round(p) + '%';
  }

  function showResults(accuracy, session) {
    document.getElementById('therapy-game').style.display = 'none';
    document.getElementById('therapy-results').style.display = '';

    document.getElementById('result-patient-name').textContent = selectedPatient.name;
    document.getElementById('r-accuracy').textContent = accuracy + '%';
    document.getElementById('r-score').textContent = gameState.score;
    const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(gameState.elapsedSeconds % 60).padStart(2, '0');
    document.getElementById('r-time').textContent = `${mm}:${ss}`;
    document.getElementById('r-correct').textContent = gameState.correct;
    document.getElementById('r-wrong').textContent = gameState.wrong;
    document.getElementById('r-level').textContent = selectedLevel.name;

    document.getElementById('btn-play-again').addEventListener('click', () => { location.reload(); });
    document.getElementById('btn-next-level').addEventListener('click', () => { location.href = 'index.html'; });
  }

  // Controls
  document.getElementById('btn-pause').addEventListener('click', () => {
    gameState.paused = true;
    document.getElementById('pause-overlay').style.display = 'flex';
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    gameState.paused = false;
    document.getElementById('pause-overlay').style.display = 'none';
  });
  document.getElementById('btn-restart').addEventListener('click', () => { location.reload(); });
  document.getElementById('btn-quit').addEventListener('click', () => { location.href = 'index.html'; });
});
