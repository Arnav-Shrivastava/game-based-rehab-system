import { Storage } from '../storage.js';
import { UI } from '../ui.js';
import { TherapySetup } from './therapy-setup.js';
import { TASKS } from '../config/tasks.js';

document.addEventListener('DOMContentLoaded', () => {
  let selectedPatient = null;
  let selectedTask = null;
  let settings = Storage.getSettings();

  let gameState = {
    running: false,
    paused: false,
    score: 0,
    startTime: null,
    elapsedSeconds: 0,
    sessionTimerInterval: null,
    
    currentStepIndex: 0,
    stepsCorrectOnFirstTry: 0,
    promptsNeeded: 0,
    firstTryForCurrentStep: true,
  };

  TherapySetup.initSetup(TASKS, startSession);

  function startSession({ patientId, levelId }) {
    selectedPatient = Storage.getPatientById(patientId);
    selectedTask = TASKS.find(t => t.num === levelId);
    if (!selectedPatient || !selectedTask) return;
    settings = Storage.getSettings();
    resetGameState();

    document.getElementById('therapy-setup').style.display = 'none';
    document.getElementById('therapy-game').style.display = '';

    document.getElementById('game-patient-name').textContent = selectedPatient.name;
    document.getElementById('game-level-label').textContent = selectedTask.name;

    startGameTimer();
    gameState.running = true;
    
    loadStep(0);
  }

  function resetGameState() {
    clearInterval(gameState.sessionTimerInterval);
    gameState = {
      running: true,
      paused: false,
      score: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      sessionTimerInterval: null,
      
      currentStepIndex: 0,
      stepsCorrectOnFirstTry: 0,
      promptsNeeded: 0,
      firstTryForCurrentStep: true,
    };
  }

  function startGameTimer() {
    gameState.sessionTimerInterval = setInterval(() => {
      if (gameState.paused) return;
      gameState.elapsedSeconds++;
      const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2, '0');
      const ss = String(gameState.elapsedSeconds % 60).padStart(2, '0');
      document.getElementById('gs-timer').textContent = `${mm}:${ss}`;
    }, 1000);
  }

  function loadStep(index) {
    if (index >= selectedTask.steps.length) {
      finishSession();
      return;
    }

    gameState.currentStepIndex = index;
    gameState.firstTryForCurrentStep = true;
    
    const step = selectedTask.steps[index];
    document.getElementById('task-prompt').textContent = step.prompt;
    if (settings.enableVoice) {
      UI.speak(step.prompt);
    }
    
    document.getElementById('task-correction').style.display = 'none';
    
    const optionsGrid = document.getElementById('task-options');
    optionsGrid.innerHTML = '';
    
    // Shuffle options
    const shuffled = [...step.options].sort(() => Math.random() - 0.5);
    
    shuffled.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.onclick = () => handleOptionClick(opt, step);
      optionsGrid.appendChild(btn);
    });

    updateProgress((index / selectedTask.steps.length) * 100);
    updateHUD();
  }

  function handleOptionClick(opt, step) {
    if (gameState.paused || !gameState.running) return;

    if (opt.isCorrect) {
      UI.Sounds.correct();
      if (gameState.firstTryForCurrentStep) {
        gameState.stepsCorrectOnFirstTry++;
        gameState.score += 20;
      } else {
        gameState.score += 5; // Reduced score for needing prompt
      }
      loadStep(gameState.currentStepIndex + 1);
    } else {
      UI.Sounds.wrong();
      gameState.firstTryForCurrentStep = false;
      gameState.promptsNeeded++;
      
      const correctionEl = document.getElementById('task-correction');
      correctionEl.textContent = opt.correction || 'That is not the right step. Try again!';
      correctionEl.style.display = 'block';
      
      if (settings.enableVoice) {
        UI.speak(correctionEl.textContent);
      }
      
      updateHUD();
    }
  }

  function updateHUD() {
    document.getElementById('gs-score').textContent = gameState.score;
    document.getElementById('gs-first-try').textContent = gameState.stepsCorrectOnFirstTry;
    document.getElementById('gs-prompts').textContent = gameState.promptsNeeded;
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
    updateProgress(100);
    UI.Sounds.complete();

    const totalSteps = selectedTask.steps.length;
    const firstTryAccuracy = totalSteps > 0 ? Math.round((gameState.stepsCorrectOnFirstTry / totalSteps) * 100) : 100;

    const session = Storage.endSession({
      patientId: selectedPatient.id,
      gameType: 'cognitive-task-sequence',
      level: selectedTask.num,
      accuracy: firstTryAccuracy,
      correct: gameState.stepsCorrectOnFirstTry,
      wrong: gameState.promptsNeeded,
      extra: {
        patientName: selectedPatient.name,
        taskName: selectedTask.name,
        stepsCorrect: gameState.stepsCorrectOnFirstTry,
        stepsIncorrect: gameState.promptsNeeded, // mapping prompts to incorrect for simplicity
        promptsNeeded: gameState.promptsNeeded,
        completionTime: gameState.elapsedSeconds,
        score: gameState.score
      }
    });
    
    showResults(firstTryAccuracy, session);
  }

  function showResults(accuracy, session) {
    document.getElementById('therapy-game').style.display = 'none';
    document.getElementById('therapy-results').style.display = '';

    document.getElementById('result-patient-name').textContent = selectedPatient.name;
    document.getElementById('r-accuracy').textContent = accuracy + '%';
    document.getElementById('r-prompts').textContent = gameState.promptsNeeded;
    
    const mm = String(Math.floor(gameState.elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(gameState.elapsedSeconds % 60).padStart(2, '0');
    document.getElementById('r-time').textContent = `${mm}:${ss}`;
    
    document.getElementById('r-first-try').textContent = `${gameState.stepsCorrectOnFirstTry} / ${selectedTask.steps.length}`;
    document.getElementById('r-level').textContent = selectedTask.name;

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
