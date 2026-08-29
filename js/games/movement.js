import { Storage } from '../storage.js';
import { UI } from '../ui.js';
import { TherapySetup } from './therapy-setup.js';
import { Webcam } from './webcam.js';

const MOVEMENT_MODES = [
  { 
    num: 1, 
    name: 'Reach & Pop', 
    desc: 'Reach and pop targets with your hand.', 
    fullDesc: 'Move your hand in front of the camera to control the blue dot. Reach for the targets that appear and pop them before they disappear.' 
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
    targets: [],
    startTime: null,
    elapsedSeconds: 0,
    sessionTimerInterval: null,
    targetSpawnInterval: null,
    reactionTimes: [],
    distances: [],
    handsUsed: new Set(),
    animationFrameId: null
  };

  TherapySetup.initSetup(MOVEMENT_MODES, startSession);

  async function startSession({ patientId, levelId }) {
    selectedPatient = Storage.getPatientById(patientId);
    selectedLevel = MOVEMENT_MODES.find(m => m.num === levelId);
    if (!selectedPatient || !selectedLevel) return;
    settings = Storage.getSettings();
    resetGameState();

    document.getElementById('therapy-setup').style.display = 'none';
    document.getElementById('therapy-game').style.display = '';

    document.getElementById('game-patient-name').textContent = selectedPatient.name;
    document.getElementById('game-level-label').textContent = selectedLevel.name;

    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('game-canvas');

    const arena = document.getElementById('game-arena');
    canvas.width = arena.offsetWidth;
    canvas.height = arena.offsetHeight;

    await Webcam.initWebcam(video, canvas);

    startGameTimer();
    startSpawning();
    updateHUD();

    gameState.running = true;
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function resetGameState() {
    clearInterval(gameState.sessionTimerInterval);
    clearInterval(gameState.targetSpawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    gameState = {
      running: true,
      paused: false,
      score: 0, correct: 0, wrong: 0,
      targets: [],
      startTime: Date.now(),
      elapsedSeconds: 0,
      sessionTimerInterval: null,
      targetSpawnInterval: null,
      reactionTimes: [],
      distances: [],
      handsUsed: new Set(),
      animationFrameId: null
    };
    const arena = document.getElementById('game-arena');
    arena.querySelectorAll('.ball').forEach(b => b.remove());
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
    const speedMs = settings.movementSpeed || 2000;
    gameState.targetSpawnInterval = setInterval(() => {
      if (gameState.paused || !gameState.running) return;
      
      const maxTargets = settings.movementTargetCount || 5;
      if (gameState.targets.length < maxTargets) {
        spawnTarget();
      }
    }, speedMs);
  }

  function spawnTarget() {
    const arena = document.getElementById('game-arena');
    const sizeCls = getBallSizeCls(settings.movementTargetSize || 'medium');
    const ballPx = sizeCls === 'ball-sm' ? 44 : sizeCls === 'ball-lg' ? 76 : 60;
    
    const margin = 20;
    const aW = arena.offsetWidth;
    const aH = arena.offsetHeight;

    const x = margin + Math.random() * (aW - ballPx - margin * 2);
    const y = margin + Math.random() * (aH - ballPx - margin * 2);

    const colors = ['red', 'green', 'blue'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const ball = document.createElement('div');
    ball.className = `ball ball-${color} ${sizeCls}`;
    ball.style.left = x + 'px';
    ball.style.top = y + 'px';
    ball.dataset.cx = x + ballPx / 2;
    ball.dataset.cy = y + ballPx / 2;
    ball.dataset.r = ballPx / 2;
    ball.dataset.spawnTime = Date.now();
    // Do not add keyboard access since this game requires physical movement tracking
    
    arena.appendChild(ball);
    gameState.targets.push(ball);

    const timeoutMs = (settings.movementSpeed || 2000) * 2.5; 
    setTimeout(() => {
      if (ball.parentElement) {
        ball.classList.add('wrong-flash');
        setTimeout(() => {
          ball.remove();
          gameState.targets = gameState.targets.filter(t => t !== ball);
        }, 300);
        gameState.wrong++;
        UI.Sounds.wrong();
        updateHUD(true);
      }
    }, timeoutMs);
  }

  function getBallSizeCls(size) {
    const sizeMap = { small: 'ball-sm', medium: 'ball-md', large: 'ball-lg' };
    return sizeMap[size] || 'ball-md';
  }

  function gameLoop() {
    if (!gameState.running) return;
    
    if (!gameState.paused) {
      const fingertip = Webcam.getFingertipPosition();
      
      if (fingertip) {
        const hand = Webcam.getHandedness();
        if (hand) gameState.handsUsed.add(hand);

        for (let i = gameState.targets.length - 1; i >= 0; i--) {
          const ball = gameState.targets[i];
          const cx = parseFloat(ball.dataset.cx);
          const cy = parseFloat(ball.dataset.cy);
          const r = parseFloat(ball.dataset.r);
          
          const dist = Math.sqrt((fingertip.x - cx)**2 + (fingertip.y - cy)**2);
          if (dist < r + 20) { 
            ball.classList.add('popping');
            UI.Sounds.pop();
            const hitTime = Date.now();
            const reaction = hitTime - parseInt(ball.dataset.spawnTime);
            gameState.reactionTimes.push(reaction);
            
            const arena = document.getElementById('game-arena');
            const startX = arena.offsetWidth / 2;
            const startY = arena.offsetHeight;
            const reach = Math.sqrt((cx - startX)**2 + (cy - startY)**2);
            gameState.distances.push(reach);

            setTimeout(() => { if(ball.parentNode) ball.remove(); }, 300);
            gameState.targets.splice(i, 1);
            
            gameState.correct++;
            gameState.score += 10;
            updateHUD();
          }
        }
      }
    }
    
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
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

  function finishSession() {
    gameState.running = false;
    clearInterval(gameState.sessionTimerInterval);
    clearInterval(gameState.targetSpawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    Webcam.stop();
    UI.Sounds.complete();

    const total = gameState.correct + gameState.wrong;
    const accuracy = total > 0 ? Math.round((gameState.correct / total) * 100) : 100;
    const avgReact = gameState.reactionTimes.length
      ? Math.round(gameState.reactionTimes.reduce((a,b) => a+b,0) / gameState.reactionTimes.length)
      : 0;
    const avgDist = gameState.distances.length
      ? Math.round(gameState.distances.reduce((a,b) => a+b,0) / gameState.distances.length)
      : 0;

    let finalHand = 'Unknown';
    if (gameState.handsUsed.has('Both') || (gameState.handsUsed.has('Left') && gameState.handsUsed.has('Right'))) {
      finalHand = 'Both';
    } else if (gameState.handsUsed.has('Left')) {
      finalHand = 'Left';
    } else if (gameState.handsUsed.has('Right')) {
      finalHand = 'Right';
    }

    const session = Storage.endSession({
      patientId: selectedPatient.id,
      gameType: 'movement-reach-pop',
      level: selectedLevel.num,
      accuracy,
      correct: gameState.correct,
      wrong: gameState.wrong,
      extra: {
        patientName: selectedPatient.name,
        levelName: selectedLevel.name,
        difficulty: settings.difficulty,
        score: gameState.score,
        completionTime: gameState.elapsedSeconds,
        reactionTime: avgReact,
        handUsed: finalHand,
        avgReachDistance: avgDist
      }
    });

    showResults(accuracy, avgReact, session);
  }

  function showResults(accuracy, avgReact, session) {
    document.getElementById('therapy-game').style.display = 'none';
    document.getElementById('therapy-results').style.display = '';

    document.getElementById('result-patient-name').textContent = selectedPatient.name;
    document.getElementById('r-accuracy').textContent = accuracy + '%';
    document.getElementById('r-score').textContent = gameState.score;
    const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(gameState.elapsedSeconds % 60).padStart(2, '0');
    document.getElementById('r-time').textContent = `${mm}:${ss}`;
    document.getElementById('r-react').textContent = avgReact > 0 ? (avgReact / 1000).toFixed(2) + 's' : '—';
    document.getElementById('r-correct').textContent = gameState.correct;
    document.getElementById('r-wrong').textContent = gameState.wrong;
    document.getElementById('r-level').textContent = selectedLevel.name;
    document.getElementById('r-difficulty').textContent = capitalize(settings.difficulty);

    const wrongPanel = document.getElementById('wrong-detail-panel');
    if (wrongPanel) wrongPanel.style.display = 'none';

    document.getElementById('btn-play-again').addEventListener('click', () => { location.reload(); });
    document.getElementById('btn-next-level').addEventListener('click', () => { location.href = 'index.html'; });
  }

  function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

  // Controls
  document.getElementById('btn-pause').addEventListener('click', () => {
    gameState.paused = true;
    document.getElementById('pause-overlay').style.display = 'flex';
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    gameState.paused = false;
    document.getElementById('pause-overlay').style.display = 'none';
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    location.reload();
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    location.href = 'index.html';
  });
});
