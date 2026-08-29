/**
 * CogniCare - app.js
 * Home/Dashboard page logic
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- Splash Screen ---
  const splash = document.getElementById('splash');
  const splashFill = document.getElementById('splash-fill');
  const app = document.getElementById('app');

  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 20 + 10;
    if (pct >= 100) pct = 100;
    if (splashFill) splashFill.style.width = pct + '%';
    if (pct >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        if (splash) splash.classList.add('hidden');
        if (app) { app.style.display = ''; app.style.opacity = '0'; requestAnimationFrame(() => { app.style.transition = 'opacity 0.5s'; app.style.opacity = '1'; }); }
      }, 400);
    }
  }, 120);

  // --- Level Overview data ---
  const LEVELS = [
    { num:1, name:'Single Color', desc:'Touch all balls of one color', colors:['red'] },
    { num:2, name:'Two Colors Grouped', desc:'Alternate between two colors', colors:['red','green'] },
    { num:3, name:'Two Colors Mixed', desc:'Alternate colors – random layout', colors:['red','green'] },
    { num:4, name:'Three Colors Grouped', desc:'Alternate three color groups', colors:['red','green','blue'] },
    { num:5, name:'Three Colors Mixed', desc:'Alternate – random placement', colors:['red','green','blue'] },
    { num:6, name:'Advanced Mode', desc:'Smaller balls, higher speed, track reaction time', colors:['red','green','blue'] },
    { num:7, name:'Basket Sorting', desc:'Drag each ball to the correct basket', colors:['red','green','blue'] },
  ];

  const grid = document.getElementById('levels-grid');
  if (grid) {
    grid.innerHTML = LEVELS.map(l => `
      <a href="therapy.html?level=${l.num}" class="level-card">
        <span class="level-num">${l.num}</span>
        <div class="level-name">${l.name}</div>
        <div class="level-dots">${l.colors.map(c => `<span class="dot ${c}" style="width:10px;height:10px;display:inline-block;border-radius:50%;"></span>`).join(' ')}</div>
        <div class="level-desc">${l.desc}</div>
      </a>
    `).join('');
  }

  // --- Update stats ---
  function updateStats() {
    const patients = Storage.getPatients();
    const sessions = Storage.getSessions();
    const accuracies = sessions.filter(s => s.accuracy != null).map(s => s.accuracy);
    const avgAcc = accuracies.length ? Math.round(accuracies.reduce((a,b) => a+b, 0) / accuracies.length) : null;

    const totalPt = document.getElementById('st-patients');
    const totalSe = document.getElementById('st-sessions');
    const avgAcEl = document.getElementById('st-accuracy');
    const fcCount = document.getElementById('fc-count');
    const fcSess  = document.getElementById('fc-sessions');

    if (totalPt) totalPt.textContent = patients.length;
    if (totalSe) totalSe.textContent = sessions.length;
    if (avgAcEl) avgAcEl.textContent = avgAcc !== null ? avgAcc + '%' : '—';
    if (fcCount) fcCount.textContent = patients.length + ' patient' + (patients.length !== 1 ? 's' : '');
    if (fcSess)  fcSess.textContent  = sessions.length + ' session' + (sessions.length !== 1 ? 's' : '');
  }
  updateStats();

  // --- Recent Sessions ---
  function renderRecentSessions() {
    const container = document.getElementById('recent-sessions');
    if (!container) return;
    const sessions = Storage.getSessions().slice().reverse().slice(0, 5);
    if (!sessions.length) {
      container.innerHTML = '<p class="empty-msg">No sessions recorded yet. <a href="therapy.html">Begin first session →</a></p>';
      return;
    }
    const rows = sessions.map(s => {
      const patient = Storage.getPatientById(s.patientId);
      return `<tr>
        <td>${UI.formatDate(s.date)}</td>
        <td>${patient ? patient.name : 'Unknown'}</td>
        <td>Level ${s.level}</td>
        <td>${s.accuracy != null ? s.accuracy + '%' : '—'}</td>
        <td>${s.correct || 0}</td>
        <td>${s.wrong || 0}</td>
      </tr>`;
    }).join('');
    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Patient</th><th>Level</th><th>Accuracy</th><th>Correct</th><th>Wrong</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }
  renderRecentSessions();
});
