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
  },
  {
    num: 2,
    name: 'Trace the Path',
    desc: 'Trace the wavy line from start to finish.',
    fullDesc: 'Use your hand or mouse to trace the path displayed on the screen. Stay as close to the center as possible!'
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
    animationFrameId: null,
    
    // Trace specific
    mousePos: null,
    pathSamples: [],
    outOfBoundsFrames: 0,
    totalFrames: 0,
    tremorEvents: 0,
    lastTracePoint: null,
    lastSignedDist: undefined,
    lastDelta: undefined,
    reachedEnd: false
  };

  TherapySetup.initSetup(MOVEMENT_MODES, startSession);

  const arena = document.getElementById('game-arena');
  arena.addEventListener('mousemove', e => {
    const rect = arena.getBoundingClientRect();
    gameState.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });
  arena.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = arena.getBoundingClientRect();
    gameState.mousePos = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  });

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
    const overlay = document.getElementById('overlay-canvas');

    canvas.width = arena.offsetWidth;
    canvas.height = arena.offsetHeight;
    if (overlay) {
      overlay.width = arena.offsetWidth;
      overlay.height = arena.offsetHeight;
    }

    try {
      await Webcam.initWebcam(video, canvas);
    } catch (err) {
      console.warn('Webcam init failed:', err);
      if (selectedLevel.num === 1) {
        UI.showToast("Camera access denied or failed. Please allow camera permissions.", "error");
        document.getElementById('therapy-setup').style.display = '';
        document.getElementById('therapy-game').style.display = 'none';
        return;
      }
    }

    startGameTimer();
    updateHUD();
    gameState.running = true;

    if (selectedLevel.num === 1) {
      startSpawning();
      gameState.animationFrameId = requestAnimationFrame(gameLoopPop);
    } else if (selectedLevel.num === 2) {
      generatePath(overlay.width, overlay.height);
      gameState.animationFrameId = requestAnimationFrame(gameLoopTrace);
    }
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
      animationFrameId: null,
      
      mousePos: null,
      pathSamples: [],
      outOfBoundsFrames: 0,
      totalFrames: 0,
      tremorEvents: 0,
      lastTracePoint: null,
      lastSignedDist: undefined,
      lastDelta: undefined,
      reachedEnd: false,
      firstContactTime: null
    };
    arena.querySelectorAll('.ball').forEach(b => b.remove());
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

      // Timeout safety net
      if (gameState.elapsedSeconds >= maxSeconds) {
        if (selectedLevel.num === 1) {
          finishSessionPop();
        } else {
          finishSessionTrace(); // Will mark as incomplete due to timeout
        }
      }
    }, 1000);
  }

  /* ================= REACH & POP ================= */
  function startSpawning() {
    const speedMs = settings.movementSpeed || 2000;
    gameState.targetSpawnInterval = setInterval(() => {
      if (gameState.paused || !gameState.running) return;
      const maxTargets = settings.movementTargetCount || 5;
      if (gameState.targets.length < maxTargets) spawnTarget();
    }, speedMs);
  }

  function spawnTarget() {
    const sizeCls = getBallSizeCls(settings.movementTargetSize || 'medium');
    const ballPx = sizeCls === 'ball-sm' ? 44 : sizeCls === 'ball-lg' ? 76 : 60;
    const margin = 20;
    const x = margin + Math.random() * (arena.offsetWidth - ballPx - margin * 2);
    const y = margin + Math.random() * (arena.offsetHeight - ballPx - margin * 2);
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

  function gameLoopPop() {
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
            gameState.reactionTimes.push(hitTime - parseInt(ball.dataset.spawnTime));
            
            const startX = arena.offsetWidth / 2;
            const startY = arena.offsetHeight;
            gameState.distances.push(Math.sqrt((cx - startX)**2 + (cy - startY)**2));

            setTimeout(() => { if(ball.parentNode) ball.remove(); }, 300);
            gameState.targets.splice(i, 1);
            
            gameState.correct++;
            gameState.score += 10;
            updateHUD();
          }
        }
      }
    }
    gameState.animationFrameId = requestAnimationFrame(gameLoopPop);
  }

  function finishSessionPop() {
    gameState.running = false;
    clearInterval(gameState.sessionTimerInterval);
    clearInterval(gameState.targetSpawnInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    Webcam.stop();
    UI.Sounds.complete();

    const total = gameState.correct + gameState.wrong;
    const accuracy = total > 0 ? Math.round((gameState.correct / total) * 100) : 100;
    const avgReact = gameState.reactionTimes.length ? Math.round(gameState.reactionTimes.reduce((a,b) => a+b,0) / gameState.reactionTimes.length) : 0;
    const avgDist = gameState.distances.length ? Math.round(gameState.distances.reduce((a,b) => a+b,0) / gameState.distances.length) : 0;
    const finalHand = resolveHandUsed();

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

  /* ================= TRACE THE PATH ================= */
  function generatePath(width, height) {
    const diff = settings.difficulty || 'medium';
    let segments = diff === 'easy' ? 1 : diff === 'hard' ? 3 : 2;
    const stepX = (width * 0.8) / segments;
    let startX = width * 0.1;
    let startY = height / 2;

    const ctx = document.getElementById('overlay-canvas').getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    gameState.pathSamples = [{x: startX, y: startY}];

    for (let i = 0; i < segments; i++) {
      const endX = startX + stepX;
      const yOffset = (i % 2 === 0 ? 1 : -1) * (height * 0.3);
      const endY = height / 2;
      const cp1X = startX + stepX * 0.3;
      const cp1Y = startY + yOffset;
      const cp2X = startX + stepX * 0.7;
      const cp2Y = endY + yOffset;
      
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);

      for (let t = 0.02; t <= 1; t += 0.02) {
        const x = (1-t)**3 * startX + 3*(1-t)**2*t * cp1X + 3*(1-t)*t**2 * cp2X + t**3 * endX;
        const y = (1-t)**3 * startY + 3*(1-t)**2*t * cp1Y + 3*(1-t)*t**2 * cp2Y + t**3 * endY;
        gameState.pathSamples.push({x, y});
      }
      startX = endX;
      startY = endY;
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = (settings.traceTolerance || 40) * 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    const sp = gameState.pathSamples[0];
    const ep = gameState.pathSamples[gameState.pathSamples.length - 1];
    ctx.fillStyle = '#00FF00'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(ep.x, ep.y, 15, 0, Math.PI*2); ctx.fill();
  }

  function gameLoopTrace() {
    if (!gameState.running) return;
    
    if (!gameState.paused) {
      let px = null, py = null, hand = null;
      const fingertip = Webcam.getFingertipPosition();
      if (fingertip) { px = fingertip.x; py = fingertip.y; hand = Webcam.getHandedness(); }
      else if (gameState.mousePos) { px = gameState.mousePos.x; py = gameState.mousePos.y; hand = 'Mouse'; }

      if (px !== null && py !== null) {
        if (hand) gameState.handsUsed.add(hand);
        const hit = checkPathHit(px, py);
        const dist = hit.distance;
        const signedDist = hit.signedDistance;
        const tol = settings.traceTolerance || 40;

        const ctx = document.getElementById('overlay-canvas').getContext('2d');
        if (gameState.lastTracePoint) {
          ctx.beginPath();
          ctx.moveTo(gameState.lastTracePoint.x, gameState.lastTracePoint.y);
          ctx.lineTo(px, py);
          ctx.strokeStyle = dist <= tol ? 'lime' : 'red';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        gameState.lastTracePoint = {x: px, y: py};

        if (dist > tol) {
          gameState.outOfBoundsFrames++;
        }

        if (dist <= tol && !gameState.firstContactTime) {
          gameState.firstContactTime = Date.now();
        }

        if (gameState.lastSignedDist !== undefined) {
          const delta = signedDist - gameState.lastSignedDist;
          if (gameState.lastDelta !== undefined) {
            // Tremor: sign of delta changes (direction reverses relative to path curve) 
            // and amplitude of change > 2px to ignore subpixel noise
            if (Math.sign(delta) !== Math.sign(gameState.lastDelta) && Math.abs(delta) > 2) {
               gameState.tremorEvents++;
            }
          }
          if (Math.abs(delta) > 1) gameState.lastDelta = delta; // only update delta if noticeable change
        }
        gameState.lastSignedDist = signedDist;
        gameState.distances.push(dist); // Used for pathDeviation

        // End condition check
        const ep = gameState.pathSamples[gameState.pathSamples.length - 1];
        if (Math.sqrt((px - ep.x)**2 + (py - ep.y)**2) < 30) {
          gameState.reachedEnd = true;
          finishSessionTrace();
          return; 
        }
        gameState.totalFrames++;
      }
    }
    gameState.animationFrameId = requestAnimationFrame(gameLoopTrace);
  }

  function checkPathHit(px, py) {
    let minDist = Infinity;
    let closestP = null;
    let idx = 0;
    for (let i = 0; i < gameState.pathSamples.length; i++) {
      const p = gameState.pathSamples[i];
      const d = Math.sqrt((px - p.x)**2 + (py - p.y)**2);
      if (d < minDist) { minDist = d; closestP = p; idx = i; }
    }
    
    let signedDist = minDist;
    if (idx < gameState.pathSamples.length - 1) {
      const p1 = gameState.pathSamples[idx];
      const p2 = gameState.pathSamples[idx + 1];
      const cross = (p2.x - p1.x) * (py - p1.y) - (p2.y - p1.y) * (px - p1.x);
      signedDist = Math.sign(cross) * minDist;
    }
    return { distance: minDist, signedDistance: signedDist };
  }

  function finishSessionTrace() {
    gameState.running = false;
    clearInterval(gameState.sessionTimerInterval);
    cancelAnimationFrame(gameState.animationFrameId);
    Webcam.stop();
    UI.Sounds.complete();

    const fps = 60; // Approx
    const outOfBoundsTime = gameState.outOfBoundsFrames / fps;
    const compTime = gameState.elapsedSeconds;
    
    let accuracy = 100;
    if (compTime > 0) {
      accuracy = Math.max(0, Math.round(100 - (outOfBoundsTime / compTime * 100)));
    }
    if (!gameState.reachedEnd) accuracy = Math.round(accuracy * 0.5); // Penalty for timeout

    const avgDeviation = gameState.distances.length ? Math.round(gameState.distances.reduce((a,b) => a+b,0) / gameState.distances.length) : 0;
    const finalHand = resolveHandUsed();
    const reactTime = gameState.firstContactTime ? (gameState.firstContactTime - gameState.startTime) : 0;

    const session = Storage.endSession({
      patientId: selectedPatient.id,
      gameType: 'movement-trace-path',
      level: selectedLevel.num,
      accuracy,
      correct: gameState.reachedEnd ? 1 : 0,
      wrong: gameState.reachedEnd ? 0 : 1,
      extra: {
        patientName: selectedPatient.name,
        levelName: selectedLevel.name,
        difficulty: settings.difficulty,
        score: accuracy * 10,
        completionTime: compTime,
        reactionTime: reactTime,
        handUsed: finalHand,
        pathDeviation: avgDeviation,
        tremorEvents: gameState.tremorEvents,
        outOfBoundsTime: parseFloat(outOfBoundsTime.toFixed(2))
      }
    });
    
    // Update display state manually since we reuse HUD
    gameState.score = accuracy * 10;
    gameState.correct = gameState.reachedEnd ? 1 : 0;
    gameState.wrong = gameState.reachedEnd ? 0 : 1;
    showResults(accuracy, 0, session);
  }

  /* ================= UTILS ================= */
  function resolveHandUsed() {
    if (gameState.handsUsed.has('Both') || (gameState.handsUsed.has('Left') && gameState.handsUsed.has('Right'))) return 'Both';
    if (gameState.handsUsed.has('Left')) return 'Left';
    if (gameState.handsUsed.has('Right')) return 'Right';
    if (gameState.handsUsed.has('Mouse')) return 'Mouse';
    return 'Unknown';
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
  document.getElementById('btn-restart').addEventListener('click', () => { location.reload(); });
  document.getElementById('btn-quit').addEventListener('click', () => { location.href = 'index.html'; });
});
