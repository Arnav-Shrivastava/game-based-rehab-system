import { Storage } from '../storage.js';
import { UI } from '../ui.js';

export const TherapySetup = (() => {

  let selectedPatient = null;
  let selectedLevel = null;
  let onStartCallback = null;

  function initSetup(options, callback) {
    onStartCallback = callback;
    renderPatientList();
    renderLevelGrid(options);
    renderSettingsPreview();

    const params = new URLSearchParams(location.search);
    const preloadPatient = params.get('patientId');
    const preloadLevel = parseInt(params.get('level') || '0');

    if (preloadPatient) selectPatientById(preloadPatient);
    if (preloadLevel) {
       const opt = options.find(o => o.num === preloadLevel);
       if (opt) selectLevel(opt);
    }

    const searchEl = document.getElementById('pt-search');
    if (searchEl) {
      searchEl.addEventListener('input', e => renderPatientList(e.target.value));
    }
    
    const startBtn = document.getElementById('btn-start-session');
    if (startBtn) {
      startBtn.onclick = () => {
        if (!selectedPatient || !selectedLevel) return;
        onStartCallback({ patientId: selectedPatient.id, levelId: selectedLevel.num });
      };
    }

    const voiceBtn = document.getElementById('btn-voice');
    if (voiceBtn) {
      voiceBtn.onclick = () => {
        const instr = document.getElementById('instruction-text');
        if (instr) UI.speak(instr.textContent);
      };
    }
  }

  function renderPatientList(filter = '') {
    const container = document.getElementById('pt-list');
    if (!container) return;
    let patients = Storage.getPatients();
    if (filter) {
      const q = filter.toLowerCase();
      patients = patients.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (!patients.length) {
      container.innerHTML = `<p class="empty-msg">No patients found. <a href="patient.html">Add a patient →</a></p>`;
      return;
    }
    container.innerHTML = patients.map(p => `
      <div class="pt-select-item${selectedPatient && selectedPatient.id === p.id ? ' selected' : ''}" data-id="${p.id}">
        <div class="pt-select-avatar" style="background:${UI.avatarColor(p.name)}">${UI.avatarInitials(p.name)}</div>
        <div>
          <div class="pt-select-name">${p.name}</div>
          <div class="pt-select-sub">${p.id} · Age ${p.age}</div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.pt-select-item').forEach(el => {
      el.addEventListener('click', () => {
        selectPatientById(el.dataset.id);
        container.querySelectorAll('.pt-select-item').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  }

  function selectPatientById(id) {
    selectedPatient = Storage.getPatientById(id);
    const badge = document.getElementById('setup-patient-badge');
    if (badge && selectedPatient) { badge.textContent = '👤 ' + selectedPatient.name; badge.style.display = ''; }
    checkReadyToStart();
  }

  function renderLevelGrid(options) {
    const grid = document.getElementById('level-select-grid');
    if (!grid) return;
    grid.innerHTML = options.map(l => `
      <button class="level-select-btn${selectedLevel && selectedLevel.num === l.num ? ' selected' : ''}" data-num="${l.num}">
        <span class="lsb-num">${l.num}</span>
        ${l.name}
      </button>`).join('');
    grid.querySelectorAll('.level-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num);
        const option = options.find(o => o.num === num);
        selectLevel(option);
        grid.querySelectorAll('.level-select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  function selectLevel(option) {
    selectedLevel = option;
    const badge = document.getElementById('setup-level-badge');
    if (badge) { badge.textContent = '🎮 Level ' + option.num + ': ' + option.name; badge.style.display = ''; }
    
    const instr = document.getElementById('instruction-text');
    if (instr) instr.textContent = option.fullDesc || '';
    
    checkReadyToStart();
  }

  function renderSettingsPreview() {
    const settings = Storage.getSettings();
    const container = document.getElementById('settings-preview');
    if (!container) return;
    
    function capitalize(s) { return s && s[0].toUpperCase() + s.slice(1); }

    container.innerHTML = `
      <div class="sp-item"><span class="sp-label">Balls</span><span class="sp-val">${settings.ballCount}</span></div>
      <div class="sp-item"><span class="sp-label">Size</span><span class="sp-val">${capitalize(settings.ballSize)}</span></div>
      <div class="sp-item"><span class="sp-label">Difficulty</span><span class="sp-val">${capitalize(settings.difficulty)}</span></div>
      <div class="sp-item"><span class="sp-label">Timer</span><span class="sp-val">${settings.enableTimer ? settings.timerDuration + 'm' : 'Off'}</span></div>
      <div class="sp-item"><span class="sp-label">Sound</span><span class="sp-val">${settings.enableSound ? 'On' : 'Off'}</span></div>`;
  }

  function checkReadyToStart() {
    const startBtn = document.getElementById('btn-start-session');
    if (startBtn) {
      startBtn.disabled = !(selectedPatient && selectedLevel);
    }
  }

  return { initSetup };

})();
