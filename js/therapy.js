/**
 * CogniCare - therapy.js
 * Full therapy session controller – all 7 levels
 */

import { Storage } from './storage.js';
import { UI } from './ui.js';
import { LEVEL_DEFS, getLevelDef, getLevelInstruction } from './levels.js';
import { DragDrop } from './dragdrop.js';
import { TherapySetup } from './games/therapy-setup.js';

document.addEventListener('DOMContentLoaded', () => {

  // -------- State --------
  let selectedPatient = null;
  let selectedLevel   = null;
  let settings        = Storage.getSettings();

  let gameState = {
    running: false,
    paused:  false,
    score: 0,
    correct: 0,
    wrong: 0,
    wrongLog: [],      // { time, color, level } entries for each wrong selection
    lastColor: null,
    balls: [],
    startTime: null,
    reactionStart: null,
    reactionTimes: [],
    timerInterval: null,
    elapsedSeconds: 0,
    sessionTimerInterval: null,
  };

  // -------- Pre-Game Setup --------
  TherapySetup.initSetup(LEVEL_DEFS, startSession);

  // -------- Start Session --------
  function startSession({ patientId, levelId }) {
    selectedPatient = Storage.getPatientById(patientId);
    selectedLevel = getLevelDef(levelId);
    if (!selectedPatient || !selectedLevel) return;
    settings = Storage.getSettings();
    resetGameState();

    document.getElementById('therapy-setup').style.display = 'none';
    document.getElementById('therapy-game').style.display  = '';

    document.getElementById('game-patient-name').textContent = selectedPatient.name;
    document.getElementById('game-level-label').textContent  = 'Level ' + selectedLevel.num;

    buildArena();
    startGameTimer();
    updateHUD();
    updateInstruction();

    if (settings.enableVoice) UI.speak(getLevelInstruction(selectedLevel));
    gameState.running = true;
  }

  function resetGameState() {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.sessionTimerInterval);
    gameState = {
      running: true,
      paused:  false,
      score: 0, correct: 0, wrong: 0,
      wrongLog: [],
      lastColor: null, balls: [],
      startTime: Date.now(),
      reactionStart: Date.now(),
      reactionTimes: [],
      timerInterval: null,
      elapsedSeconds: 0,
      sessionTimerInterval: null,
    };
  }

  // -------- Build Arena --------
  function buildArena() {
    const arena = document.getElementById('game-arena');

    // Grab baskets BEFORE clearing innerHTML (clearing destroys child elements)
    const basketsRow = document.getElementById('baskets-row');
    if (basketsRow && basketsRow.parentNode) basketsRow.parentNode.removeChild(basketsRow);

    arena.innerHTML = '';
    arena.className = 'game-arena';

    const level   = selectedLevel;
    const count   = settings.ballCount;
    const sizeCls = getBallSizeCls();

    if (level.layout === 'grouped') {
      buildGroupedLayout(arena, level, count, sizeCls);
    } else {
      buildFreeLayout(arena, level, count, sizeCls);
    }

    // Always re-attach baskets row (shown only for level 7)
    if (basketsRow) {
      basketsRow.style.display = level.basketMode ? 'flex' : 'none';
      arena.appendChild(basketsRow);
    }

    if (level.basketMode) {
      // Reset basket zones
      ['bz-red','bz-green','bz-blue'].forEach(id => {
        const z = document.getElementById(id);
        if (z) z.innerHTML = '';
      });
      DragDrop.init(arena, handleBasketDrop);
    }

    // Update progress bar total
    gameState.totalBalls = arena.querySelectorAll('.ball').length;
    updateProgress();
  }

  function getBallSizeCls() {
    const sizeMap = { small: 'ball-sm', medium: 'ball-md', large: 'ball-lg' };
    return sizeMap[settings.ballSize] || 'ball-md';
  }

  function buildGroupedLayout(arena, level, count, sizeCls) {
    const wrap = document.createElement('div');
    wrap.className = 'color-group-wrap';

    level.colors.forEach(color => {
      const perGroup = Math.round(count / level.colors.length);
      const group = document.createElement('div');
      group.className = 'color-group';
      group.innerHTML = `<div class="color-group-label ${color}-text">${capitalize(color)} Group</div>`;
      const ballsWrap = document.createElement('div');
      ballsWrap.className = 'color-group-balls';
      for (let i = 0; i < perGroup; i++) {
        const ball = createBall(color, sizeCls, level);
        // In grouped mode balls use flow layout — add class to override position:absolute
        ball.classList.add('ball-grouped');
        ballsWrap.appendChild(ball);
        gameState.balls.push(ball);
      }
      group.appendChild(ballsWrap);
      wrap.appendChild(group);
    });
    arena.appendChild(wrap);
  }

  function buildFreeLayout(arena, level, count, sizeCls) {
    arena.classList.add('arena-free');
    const placed = [];
    const ballPx = sizeCls === 'ball-sm' ? 44 : sizeCls === 'ball-lg' ? 76 : 60;

    for (let i = 0; i < count; i++) {
      const color = level.colors[i % level.colors.length];
      const ball  = createBall(color, sizeCls, level);
      const pos   = randomPosition(arena, ballPx, placed);
      ball.style.left = pos.x + 'px';
      ball.style.top  = pos.y + 'px';
      placed.push({ x: pos.x, y: pos.y, r: ballPx / 2 + 4 });
      arena.appendChild(ball);
      gameState.balls.push(ball);
    }

    // Level 6: add some subtle animation
    if (level.num === 6) {
      gameState.balls.forEach(b => {
        b.style.transition = 'left 3s ease, top 3s ease';
      });
    }
  }

  function randomPosition(arena, ballPx, placed) {
    const aW = arena.offsetWidth  || 700;
    const aH = arena.offsetHeight || 440;
    const margin = 20;
    let attempts = 0;
    while (attempts < 200) {
      const x = margin + Math.random() * (aW - ballPx - margin * 2);
      const y = margin + Math.random() * (aH - ballPx - margin * 2 - 80);
      if (!placed.some(p => dist(p.x + ballPx/2, p.y + ballPx/2, x + ballPx/2, y + ballPx/2) < p.r + ballPx/2 + 4)) {
        return { x, y };
      }
      attempts++;
    }
    return { x: margin + Math.random() * (aW - ballPx - margin * 2), y: margin + Math.random() * (aH - ballPx - margin * 2 - 80) };
  }

  function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }

  function createBall(color, sizeCls, level) {
    const ball = document.createElement('div');
    ball.className = `ball ball-${color} ${sizeCls}`;
    ball.dataset.color = color;
    ball.textContent = color[0].toUpperCase();
    // Accessibility: all balls get keyboard support
    ball.setAttribute('tabindex', '0');
    ball.setAttribute('role', 'button');
    ball.setAttribute('aria-label', color + ' ball – press Enter or Space to select');
    if (level.basketMode) {
      ball.setAttribute('draggable', 'true');
      // Keyboard pick-and-drop for basket mode
      ball.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Find matching basket and simulate drop
          const basket = document.querySelector(`.basket[data-color="${color}"]`);
          if (basket) handleBasketDrop(ball, basket);
        }
      });
    } else {
      ball.addEventListener('click', () => handleBallClick(ball));
      ball.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBallClick(ball); } });
    }
    return ball;
  }

  // -------- Ball Click Handler --------
  function handleBallClick(ball) {
    if (!gameState.running || gameState.paused) return;
    const color = ball.dataset.color;
    const level = selectedLevel;

    // Alternating rule check
    if (level.alternateRule && gameState.lastColor === color) {
      gameState.wrong++;
      gameState.wrongLog.push({ time: gameState.elapsedSeconds, color, reason: 'same-color' });
      showError(`❌ Wrong! You picked ${color} twice in a row.`);
      ball.classList.add('wrong-flash');
      setTimeout(() => ball.classList.remove('wrong-flash'), 400);
      UI.Sounds.wrong();
      updateHUD(true);  // true = animate wrong counter
      return;
    }

    // Correct hit
    const reactionMs = Date.now() - gameState.reactionStart;
    gameState.reactionTimes.push(reactionMs);
    gameState.reactionStart = Date.now();
    gameState.lastColor = color;
    gameState.correct++;
    gameState.score += 10;

    // Pop animation
    ball.classList.add('popping');
    UI.Sounds.pop();
    setTimeout(() => {
      ball.remove();
      gameState.balls = gameState.balls.filter(b => b !== ball);
      updateHUD();
      updateProgress();
      updateInstruction();
      checkLevelComplete();
    }, 350);
  }

  // -------- Basket Drop Handler (Level 7) --------
  function handleBasketDrop(ball, basket) {
    const ballColor   = ball.dataset.color;
    const basketColor = basket.dataset.color;

    if (ballColor === basketColor) {
      // Correct
      ball.style.position = 'relative';
      ball.style.left = '';
      ball.style.top  = '';
      ball.style.opacity = '1';
      ball.removeAttribute('draggable');
      ball.style.width  = '36px';
      ball.style.height = '36px';
      ball.style.fontSize = '0.6rem';
      basket.querySelector('.basket-zone').appendChild(ball);
      basket.classList.add('correct-drop');
      setTimeout(() => basket.classList.remove('correct-drop'), 400);

      gameState.correct++;
      gameState.score += 10;
      const r = Date.now() - gameState.reactionStart;
      gameState.reactionTimes.push(r);
      gameState.reactionStart = Date.now();
      gameState.balls = gameState.balls.filter(b => b !== ball);
      UI.Sounds.correct();
    } else {
      // Wrong basket
      basket.classList.add('wrong-basket');
      setTimeout(() => basket.classList.remove('wrong-basket'), 500);
      ball.style.opacity = '1';
      gameState.wrong++;
      gameState.wrongLog.push({ time: gameState.elapsedSeconds, color: ball.dataset.color, reason: 'wrong-basket', expected: basket.dataset.color });
      showError(`❌ Wrong basket! ${capitalize(ball.dataset.color)} ball goes in the ${capitalize(ball.dataset.color)} basket.`);
      UI.Sounds.wrong();
    }
    updateHUD(gameState.wrong > 0);
    updateProgress();
    checkLevelComplete();
  }

  // -------- Error Banner --------
  function showError(msg) {
    const banner = document.getElementById('error-banner');
    const text   = document.getElementById('error-text');
    if (!banner || !text) return;
    text.textContent = msg;
    banner.style.display = '';
    clearTimeout(banner._timeout);
    banner._timeout = setTimeout(() => { banner.style.display = 'none'; }, 2500);
  }

  // -------- HUD Update --------
  function updateHUD(animateWrong = false) {
    document.getElementById('gs-score').textContent   = gameState.score;
    document.getElementById('gs-correct').textContent = gameState.correct;
    const wrongEl = document.getElementById('gs-wrong');
    wrongEl.textContent = gameState.wrong;
    if (animateWrong && gameState.wrong > 0) {
      wrongEl.classList.remove('wrong-bump');
      void wrongEl.offsetWidth; // reflow to restart animation
      wrongEl.classList.add('wrong-bump');
    }
    // Update the wrong-panel counter
    const wrongPanel = document.getElementById('wrong-panel-count');
    if (wrongPanel) {
      wrongPanel.textContent = gameState.wrong;
      if (animateWrong && gameState.wrong > 0) {
        wrongPanel.parentElement.classList.remove('wrong-panel-bump');
        void wrongPanel.parentElement.offsetWidth;
        wrongPanel.parentElement.classList.add('wrong-panel-bump');
      }
    }
    // Show/hide the wrong panel based on count
    const wrongPanelWrap = document.getElementById('wrong-live-panel');
    if (wrongPanelWrap) {
      wrongPanelWrap.style.display = gameState.wrong > 0 ? 'flex' : 'none';
    }
  }

  // -------- Progress --------
  function updateProgress() {
    const total    = gameState.totalBalls || 1;
    const remaining = document.getElementById('game-arena').querySelectorAll('.ball').length;
    const done     = total - remaining;
    const pct      = Math.round((done / total) * 100);
    document.getElementById('game-progress-fill').style.width = pct + '%';
    document.getElementById('progress-label').textContent = pct + '%';
  }

  // -------- Instruction update --------
  function updateInstruction() {
    const text = getLevelInstruction(selectedLevel, gameState.lastColor);
    document.getElementById('gi-text').textContent = text;
  }

  // -------- Timer --------
  function startGameTimer() {
    // Elapsed time
    gameState.timerInterval = setInterval(() => {
      if (gameState.paused) return;
      gameState.elapsedSeconds++;
      const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2,'0');
      const ss = String(gameState.elapsedSeconds % 60).padStart(2,'0');
      document.getElementById('gs-timer').textContent = `${mm}:${ss}`;
    }, 1000);

    // Session timer (countdown)
    if (settings.enableTimer) {
      let remaining = settings.timerDuration * 60;
      gameState.sessionTimerInterval = setInterval(() => {
        if (gameState.paused) return;
        remaining--;
        if (remaining <= 0) {
          clearInterval(gameState.sessionTimerInterval);
          showError('Time is up!');
          UI.Sounds.wrong();
          finishSession();
        }
      }, 1000);
    }
  }

  // -------- Level Complete Check --------
  function checkLevelComplete() {
    const remaining = document.getElementById('game-arena').querySelectorAll('.ball[data-color]').length;
    if (remaining === 0) {
      finishSession();
    }
  }

  // -------- Finish Session --------
  function finishSession() {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.sessionTimerInterval);
    gameState.running = false;

    UI.Sounds.complete();

    const total    = gameState.correct + gameState.wrong;
    const accuracy = total > 0 ? Math.round((gameState.correct / total) * 100) : 100;
    const avgReact = gameState.reactionTimes.length
      ? Math.round(gameState.reactionTimes.reduce((a,b) => a+b,0) / gameState.reactionTimes.length)
      : 0;

    // Save session
    const session = Storage.addSession({
      patientId:    selectedPatient.id,
      patientName:  selectedPatient.name,
      level:        selectedLevel.num,
      levelName:    selectedLevel.name,
      difficulty:   settings.difficulty,
      correct:      gameState.correct,
      wrong:        gameState.wrong,
      accuracy,
      reactionTime: avgReact,
      completionTime: gameState.elapsedSeconds,
      score:        gameState.score,
    });

    // Show results
    showResults(accuracy, avgReact, session);
  }

  function showResults(accuracy, avgReact, session) {
    document.getElementById('therapy-game').style.display    = 'none';
    document.getElementById('therapy-results').style.display = '';

    document.getElementById('result-patient-name').textContent = selectedPatient.name;
    document.getElementById('r-accuracy').textContent = accuracy + '%';
    document.getElementById('r-score').textContent    = gameState.score;
    const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2,'0');
    const ss = String(gameState.elapsedSeconds % 60).padStart(2,'0');
    document.getElementById('r-time').textContent   = `${mm}:${ss}`;
    document.getElementById('r-react').textContent  = avgReact > 0 ? (avgReact / 1000).toFixed(2) + 's' : '—';
    document.getElementById('r-correct').textContent    = gameState.correct;
    document.getElementById('r-wrong').textContent      = gameState.wrong;
    document.getElementById('r-level').textContent      = 'Level ' + selectedLevel.num + ' – ' + selectedLevel.name;
    document.getElementById('r-difficulty').textContent = capitalize(settings.difficulty);

    // Wrong attempts detail panel
    renderWrongLog();

    spawnConfetti();

    // Save notes button (save on navigation or on demand)
    const notesField = document.getElementById('doctor-notes');

    document.getElementById('btn-play-again').addEventListener('click', () => {
      saveNotes(session.id, notesField.value);
      resetToSetup();
    });
    document.getElementById('btn-next-level').addEventListener('click', () => {
      saveNotes(session.id, notesField.value);
      const next = Math.min(selectedLevel.num + 1, 7);
      selectLevel(next);
      resetToSetup(true);
    });
  }

  function renderWrongLog() {
    const container = document.getElementById('wrong-log-container');
    if (!container) return;
    const panel = document.getElementById('wrong-detail-panel');
    if (gameState.wrongLog.length === 0) {
      if (panel) panel.style.display = 'none';
      return;
    }
    if (panel) panel.style.display = '';
    const mm = t => String(Math.floor(t / 60)).padStart(2,'0');
    const ss = t => String(t % 60).padStart(2,'0');
    container.innerHTML = gameState.wrongLog.map((entry, i) => `
      <div class="wrong-log-entry">
        <span class="wl-num">#${i+1}</span>
        <span class="wl-time">⏱ ${mm(entry.time)}:${ss(entry.time)}</span>
        <span class="wl-dot" style="background:var(--${entry.color})"></span>
        <span class="wl-color">${capitalize(entry.color)}</span>
        <span class="wl-reason">${entry.reason === 'same-color' ? 'Same color repeated' : `Wrong basket (put in ${capitalize(entry.expected||'')} basket)`}</span>
      </div>
    `).join('');
  }

  function saveNotes(sessionId, notes) {
    if (!notes.trim()) return;
    const sessions = Storage.getSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx > -1) {
      sessions[idx].notes = notes.trim();
      try { localStorage.setItem('cognicare_sessions', JSON.stringify(sessions)); } catch(e) {}
    }
  }

  function resetToSetup(keepLevel = false) {
    document.getElementById('therapy-results').style.display = 'none';
    document.getElementById('therapy-game').style.display    = 'none';
    document.getElementById('therapy-setup').style.display   = '';
    resetGameState();
    renderPatientList();
    if (!keepLevel) { selectedLevel = null; }
    renderLevelGrid();
    renderSettingsPreview();
    checkReadyToStart();
  }

  // -------- Controls --------
  document.getElementById('btn-pause').addEventListener('click', () => {
    gameState.paused = true;
    document.getElementById('pause-overlay').style.display = 'flex';
    document.getElementById('btn-pause').disabled = true;
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    gameState.paused = false;
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('btn-pause').disabled = false;
    gameState.reactionStart = Date.now();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.sessionTimerInterval);
    startSession();
  });
  document.getElementById('btn-quit').addEventListener('click', () => {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.sessionTimerInterval);
    gameState.running = false;
    resetToSetup();
  });

  document.getElementById('gi-voice').addEventListener('click', () => {
    UI.speak(document.getElementById('gi-text').textContent);
  });

  // -------- Confetti --------
  function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#e74c3c','#27ae60','#2980b9','#f39c12','#8e44ad'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 1) + 's';
      piece.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      container.appendChild(piece);
    }
  }

  // -------- Helpers --------
  function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
});
