/**
 * CogniCare - settings.js
 * Settings page logic
 */

import { Storage } from './storage.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {

  let settings = Storage.getSettings();
  applyToForm(settings);
  setupEventListeners();

  function applyToForm(s) {
    // Ball count
    const bc = document.getElementById('s-ball-count');
    if (bc) { bc.value = s.ballCount; document.getElementById('ball-count-val').textContent = s.ballCount; }

    // Ball size
    setActiveToggle('ball-size-group', s.ballSize);

    // Difficulty
    setActiveToggle('difficulty-group', s.difficulty);
    updateDifficultyInfo(s.difficulty);

    // Timer
    const et = document.getElementById('s-enable-timer');
    if (et) et.checked = s.enableTimer;
    const td = document.getElementById('s-timer-duration');
    if (td) { td.value = s.timerDuration; document.getElementById('timer-val').textContent = s.timerDuration; }

    // Movement
    const mtc = document.getElementById('s-move-target-count');
    if (mtc) { mtc.value = s.movementTargetCount || 5; document.getElementById('move-target-count-val').textContent = s.movementTargetCount || 5; }
    setActiveToggle('move-target-size-group', s.movementTargetSize || 'medium');
    const ms = document.getElementById('s-move-speed');
    if (ms) { ms.value = s.movementSpeed || 2000; document.getElementById('move-speed-val').textContent = ((s.movementSpeed || 2000) / 1000).toFixed(1) + 's'; }
    const md = document.getElementById('s-move-duration');
    if (md) { md.value = s.movementDuration || 3; document.getElementById('move-duration-val').textContent = s.movementDuration || 3; }
    const tt = document.getElementById('s-trace-tolerance');
    if (tt) { tt.value = s.traceTolerance || 40; document.getElementById('trace-tolerance-val').textContent = s.traceTolerance || 40; }

    // Sound
    const es = document.getElementById('s-sound');
    if (es) es.checked = s.enableSound;
    const ev = document.getElementById('s-voice');
    if (ev) ev.checked = s.enableVoice;
    const vol = document.getElementById('s-volume');
    if (vol) { vol.value = s.volume; document.getElementById('vol-val').textContent = s.volume + '%'; }

    // Appearance
    const dm = document.getElementById('s-dark-mode');
    if (dm) dm.checked = s.darkMode;
    setActiveTheme(s.theme || 'default');
    const hc = document.getElementById('s-high-contrast');
    if (hc) hc.checked = s.highContrast;

    // Accessibility
    const fs = document.getElementById('s-font-size');
    if (fs) { fs.value = s.fontSize; document.getElementById('font-size-val').textContent = s.fontSize + 'px'; }
    const lt = document.getElementById('s-large-targets');
    if (lt) lt.checked = s.largeTouchTargets;
    const kn = document.getElementById('s-keyboard-nav');
    if (kn) kn.checked = s.keyboardNav;
  }

  function setupEventListeners() {
    // Ball count slider
    document.getElementById('s-ball-count').addEventListener('input', e => {
      document.getElementById('ball-count-val').textContent = e.target.value;
    });

    // Ball size toggles
    document.getElementById('ball-size-group').addEventListener('click', e => {
      const btn = e.target.closest('.btn-toggle');
      if (!btn) return;
      setActiveToggle('ball-size-group', btn.dataset.val);
    });

    // Difficulty toggles
    document.getElementById('difficulty-group').addEventListener('click', e => {
      const btn = e.target.closest('.btn-toggle');
      if (!btn) return;
      setActiveToggle('difficulty-group', btn.dataset.val);
      updateDifficultyInfo(btn.dataset.val);
    });

    // Timer duration slider
    document.getElementById('s-timer-duration').addEventListener('input', e => {
      document.getElementById('timer-val').textContent = e.target.value;
    });

    // Movement Settings
    const smtc = document.getElementById('s-move-target-count');
    if (smtc) smtc.addEventListener('input', e => { document.getElementById('move-target-count-val').textContent = e.target.value; });

    const mtsg = document.getElementById('move-target-size-group');
    if (mtsg) mtsg.addEventListener('click', e => {
      const btn = e.target.closest('.btn-toggle');
      if (btn) setActiveToggle('move-target-size-group', btn.dataset.val);
    });

    const sms = document.getElementById('s-move-speed');
    if (sms) sms.addEventListener('input', e => { document.getElementById('move-speed-val').textContent = (e.target.value / 1000).toFixed(1) + 's'; });

    const smd = document.getElementById('s-move-duration');
    if (smd) smd.addEventListener('input', e => { document.getElementById('move-duration-val').textContent = e.target.value; });

    const stt = document.getElementById('s-trace-tolerance');
    if (stt) stt.addEventListener('input', e => { document.getElementById('trace-tolerance-val').textContent = e.target.value; });

    // Volume slider
    document.getElementById('s-volume').addEventListener('input', e => {
      document.getElementById('vol-val').textContent = e.target.value + '%';
    });

    // Font size slider
    document.getElementById('s-font-size').addEventListener('input', e => {
      document.getElementById('font-size-val').textContent = e.target.value + 'px';
      document.documentElement.style.fontSize = e.target.value + 'px';
    });

    // Dark mode toggle
    document.getElementById('s-dark-mode').addEventListener('change', e => {
      UI.applyDarkMode(e.target.checked);
    });

    // Theme swatches
    document.getElementById('theme-swatches').addEventListener('click', e => {
      const sw = e.target.closest('.swatch');
      if (!sw) return;
      setActiveTheme(sw.dataset.theme);
    });

    // Save
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

    // Reset defaults
    document.getElementById('btn-reset-settings').addEventListener('click', () => {
      const defaults = Storage.resetSettings();
      applyToForm(defaults);
      UI.applyDarkMode(defaults.darkMode);
      document.documentElement.style.fontSize = defaults.fontSize + 'px';
      UI.showToast('Settings reset to defaults.');
      UI.Sounds.click();
    });

    // Data management
    document.getElementById('btn-clear-sessions').addEventListener('click', () => {
      if (confirm('Clear all session data? Patient profiles will be kept.')) {
        Storage.clearSessions();
        UI.showToast('All sessions cleared.', 'warning');
      }
    });
    document.getElementById('btn-reset-all').addEventListener('click', () => {
      if (confirm('This will delete ALL patients, sessions and settings. Are you sure?')) {
        Storage.clearAll();
        UI.showToast('All data has been reset.', 'error');
        setTimeout(() => location.href = 'index.html', 1500);
      }
    });
  }

  function saveSettings() {
    settings = {
      ballCount:        parseInt(document.getElementById('s-ball-count').value),
      ballSize:         getActiveToggle('ball-size-group'),
      difficulty:       getActiveToggle('difficulty-group'),
      enableTimer:      document.getElementById('s-enable-timer').checked,
      timerDuration:    parseInt(document.getElementById('s-timer-duration').value),
      enableSound:      document.getElementById('s-sound').checked,
      enableVoice:      document.getElementById('s-voice').checked,
      volume:           parseInt(document.getElementById('s-volume').value),
      darkMode:         document.getElementById('s-dark-mode').checked,
      theme:            getActiveTheme(),
      highContrast:     document.getElementById('s-high-contrast').checked,
      fontSize:         parseInt(document.getElementById('s-font-size').value),
      largeTouchTargets: document.getElementById('s-large-targets').checked,
      keyboardNav:      document.getElementById('s-keyboard-nav').checked,
      movementTargetCount: parseInt(document.getElementById('s-move-target-count') ? document.getElementById('s-move-target-count').value : 5),
      movementTargetSize: getActiveToggle('move-target-size-group') || 'medium',
      movementSpeed: parseInt(document.getElementById('s-move-speed') ? document.getElementById('s-move-speed').value : 2000),
      movementDuration: parseInt(document.getElementById('s-move-duration') ? document.getElementById('s-move-duration').value : 3),
      traceTolerance: parseInt(document.getElementById('s-trace-tolerance') ? document.getElementById('s-trace-tolerance').value : 40),
    };
    Storage.saveSettings(settings);
    UI.showToast('Settings saved successfully! ✓');
    UI.Sounds.correct();
  }

  function setActiveToggle(groupId, val) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === val);
    });
  }

  function getActiveToggle(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return '';
    const active = group.querySelector('.btn-toggle.active');
    return active ? active.dataset.val : '';
  }

  function setActiveTheme(theme) {
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.theme === theme));
  }

  function getActiveTheme() {
    const active = document.querySelector('.swatch.active');
    return active ? active.dataset.theme : 'default';
  }

  function updateDifficultyInfo(val) {
    const info = document.getElementById('difficulty-info');
    if (!info) return;
    const map = {
      easy:   '<strong>Easy:</strong> Slower pace. Larger targets. 10 balls by default.',
      medium: '<strong>Medium:</strong> Standard game speed. 15 balls by default.',
      hard:   '<strong>Hard:</strong> Faster pace. More balls. Stricter time tracking.',
    };
    info.innerHTML = `<p>${map[val] || ''}</p>`;
  }
});
