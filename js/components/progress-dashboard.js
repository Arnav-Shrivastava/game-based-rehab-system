import { Storage } from '../storage.js';

export const ProgressDashboard = (() => {
  let chartAccuracy = null;
  let chartReaction = null;

  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Build the UI wrapper
    container.innerHTML = `
      <div class="pd-header">
        <h3 class="pd-title">Patient Progress Dashboard</h3>
        <div class="pd-filters">
          <select id="pd-patient-select" class="input-field select-field">
            <option value="">Select a Patient</option>
          </select>
          <select id="pd-game-select" class="input-field select-field" disabled>
            <option value="">All Game Types</option>
          </select>
          <select id="pd-date-select" class="input-field select-field" disabled>
            <option value="all">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>
      </div>
      
      <div id="pd-content" style="display: none;">
        <!-- Summary Cards -->
        <div class="stats-row" id="pd-summary">
           <div class="stat-card">
             <div class="stat-icon blue-bg">📅</div>
             <div>
               <div class="stat-val" id="pd-val-sessions">0</div>
               <div class="stat-lbl">Total Sessions</div>
             </div>
           </div>
           <div class="stat-card">
             <div class="stat-icon green-bg">✅</div>
             <div>
               <div class="stat-val" id="pd-val-accuracy">—</div>
               <div class="stat-lbl">Avg. Accuracy</div>
             </div>
           </div>
           <div class="stat-card">
             <div class="stat-icon purple-bg">⚡</div>
             <div>
               <div class="stat-val" id="pd-val-reaction">—</div>
               <div class="stat-lbl">Best Reaction Time</div>
             </div>
           </div>
        </div>
        
        <!-- Charts -->
        <div class="charts-grid">
          <div class="chart-card">
            <h3 class="chart-title">Accuracy % Over Time</h3>
            <canvas id="pd-chart-accuracy" width="600" height="260"></canvas>
          </div>
          <div class="chart-card">
            <h3 class="chart-title">Reaction Time Over Time</h3>
            <canvas id="pd-chart-reaction" width="600" height="260"></canvas>
          </div>
        </div>

        <!-- Detail View -->
        <div class="section-block">
          <div class="section-header">
            <h3>Movement & Progress Details</h3>
          </div>
          <div class="table-wrap">
            <table class="data-table" id="pd-details-table">
              <thead>
                <tr id="pd-details-head">
                  <th>Date</th>
                  <th>Game Type</th>
                  <th>Level/Diff</th>
                  <th>Accuracy</th>
                  <th>Reaction Time</th>
                </tr>
              </thead>
              <tbody id="pd-details-body">
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="pd-empty-state" style="display: none; padding: 40px; text-align: center; color: var(--text-muted); background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); margin-top: 20px;">
        No sessions yet for this patient/filter.
      </div>
    `;

    populatePatients();

    document.getElementById('pd-patient-select').addEventListener('change', onPatientChange);
    document.getElementById('pd-game-select').addEventListener('change', updateDashboard);
    document.getElementById('pd-date-select').addEventListener('change', updateDashboard);
  }

  function populatePatients() {
    const sel = document.getElementById('pd-patient-select');
    Storage.getPatients().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  function getPatientSessionHistory(patientId) {
    const all = Storage.getSessionsForPatient(patientId);
    return all.map(s => {
      if (!s.gameType) s.gameType = 'cognitive-level';
      return s;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function onPatientChange() {
    const patientId = document.getElementById('pd-patient-select').value;
    const gameSelect = document.getElementById('pd-game-select');
    const dateSelect = document.getElementById('pd-date-select');
    
    if (!patientId) {
      gameSelect.disabled = true;
      dateSelect.disabled = true;
      document.getElementById('pd-content').style.display = 'none';
      document.getElementById('pd-empty-state').style.display = 'none';
      return;
    }

    gameSelect.disabled = false;
    dateSelect.disabled = false;
    gameSelect.value = ''; // reset
    dateSelect.value = 'all';

    const sessions = getPatientSessionHistory(patientId);
    
    // Populate game types
    const gameTypes = new Set(sessions.map(s => s.gameType));
    gameSelect.innerHTML = '<option value="">All Game Types</option>';
    gameTypes.forEach(gt => {
      const opt = document.createElement('option');
      opt.value = gt;
      opt.textContent = gt;
      gameSelect.appendChild(opt);
    });

    updateDashboard();
  }

  function updateDashboard() {
    const patientId = document.getElementById('pd-patient-select').value;
    const gameType = document.getElementById('pd-game-select').value;
    const dateRange = document.getElementById('pd-date-select').value;

    if (!patientId) return;

    let sessions = getPatientSessionHistory(patientId);

    if (gameType) {
      sessions = sessions.filter(s => s.gameType === gameType);
    }

    if (dateRange !== 'all') {
      const days = parseInt(dateRange, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      sessions = sessions.filter(s => new Date(s.date) >= cutoff);
    }

    if (sessions.length === 0) {
      document.getElementById('pd-content').style.display = 'none';
      document.getElementById('pd-empty-state').style.display = 'block';
      return;
    }

    document.getElementById('pd-content').style.display = 'block';
    document.getElementById('pd-empty-state').style.display = 'none';

    renderSummary(sessions);
    renderCharts(sessions);
    renderDetailView(sessions);
  }

  function renderSummary(sessions) {
    const accuracies = sessions.filter(s => s.accuracy != null).map(s => s.accuracy);
    const reactions = sessions.filter(s => s.reactionTime != null).map(s => s.reactionTime);

    const avgAcc = accuracies.length ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : null;
    const bestReact = reactions.length ? Math.min(...reactions) : null;

    document.getElementById('pd-val-sessions').textContent = sessions.length;
    document.getElementById('pd-val-accuracy').textContent = avgAcc != null ? avgAcc + '%' : '—';
    document.getElementById('pd-val-reaction').textContent = bestReact != null ? (bestReact / 1000).toFixed(2) + 's' : '—';
  }

  function renderCharts(sessions) {
    const dates = sessions.map(s => new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    
    // Accuracy Data
    const accData = sessions.map(s => s.accuracy != null ? s.accuracy : null);

    // Reaction Data (skip nulls)
    const reactData = sessions.map(s => s.reactionTime != null ? +(s.reactionTime / 1000).toFixed(2) : null);

    const ctxAcc = document.getElementById('pd-chart-accuracy').getContext('2d');
    const ctxReact = document.getElementById('pd-chart-reaction').getContext('2d');

    const dark = document.body.classList.contains('dark');
    const gridColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    const textColor = dark ? '#cbd5e1' : '#64748b';

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      spanGaps: true, // skip missing values
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? '#1e293b' : '#fff',
          titleColor: dark ? '#fff' : '#0f172a',
          bodyColor: dark ? '#cbd5e1' : '#475569',
          borderColor: dark ? '#334155' : '#e2e8f0',
          borderWidth: 1
        }
      },
      scales: {
        x: { 
          grid: { color: gridColor }, 
          ticks: { color: textColor } 
        },
        y: { 
          grid: { color: gridColor }, 
          ticks: { color: textColor }, 
          beginAtZero: true 
        }
      }
    };

    if (chartAccuracy) chartAccuracy.destroy();
    chartAccuracy = new Chart(ctxAcc, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Accuracy (%)',
          data: accData,
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#27ae60'
        }]
      },
      options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, max: 100 } } }
    });

    if (chartReaction) chartReaction.destroy();
    chartReaction = new Chart(ctxReact, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Reaction Time (s)',
          data: reactData,
          borderColor: '#2980b9',
          backgroundColor: 'rgba(41, 128, 185, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#2980b9'
        }]
      },
      options: commonOptions
    });
  }

  function renderDetailView(sessions) {
    // Check which extra fields are present in the filtered sessions
    const extraFieldsSet = new Set();
    sessions.forEach(s => {
      if (s.handUsed !== undefined) extraFieldsSet.add('handUsed');
      if (s.avgReachDistance !== undefined) extraFieldsSet.add('avgReachDistance');
      if (s.pathDeviation !== undefined) extraFieldsSet.add('pathDeviation');
      if (s.tremorEvents !== undefined) extraFieldsSet.add('tremorEvents');
      if (s.outOfBoundsTime !== undefined) extraFieldsSet.add('outOfBoundsTime');
    });

    const extraFields = Array.from(extraFieldsSet);

    const thead = document.getElementById('pd-details-head');
    thead.innerHTML = `
      <th>Date</th>
      <th>Game Type</th>
      <th>Level/Diff</th>
      <th>Accuracy</th>
      <th>Reaction Time</th>
    `;
    
    const fieldLabels = {
      handUsed: 'Hand Used',
      avgReachDistance: 'Avg Reach Dist',
      pathDeviation: 'Path Deviation',
      tremorEvents: 'Tremor Events',
      outOfBoundsTime: 'Out of Bounds (s)'
    };

    extraFields.forEach(f => {
      const th = document.createElement('th');
      th.textContent = fieldLabels[f] || f;
      thead.appendChild(th);
    });

    const tbody = document.getElementById('pd-details-body');
    tbody.innerHTML = '';
    
    sessions.forEach(s => {
      const tr = document.createElement('tr');
      const dateStr = new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      
      let html = `
        <td>${dateStr}</td>
        <td>${s.gameType}</td>
        <td>L${s.level || '?'} / ${s.difficulty || '-'}</td>
        <td>${s.accuracy != null ? s.accuracy + '%' : '—'}</td>
        <td>${s.reactionTime != null ? (s.reactionTime / 1000).toFixed(2) + 's' : '—'}</td>
      `;

      extraFields.forEach(f => {
        let val = s[f] !== undefined ? s[f] : '—';
        if (f === 'avgReachDistance' && val !== '—') val = Number(val).toFixed(1);
        if (f === 'pathDeviation' && val !== '—') val = Number(val).toFixed(1);
        html += `<td>${val}</td>`;
      });

      tr.innerHTML = html;
      tbody.appendChild(tr);
    });
  }

  // Handle dark mode toggle from ui.js
  const observer = new MutationObserver(() => {
    const patientId = document.getElementById('pd-patient-select')?.value;
    if (patientId) {
      updateDashboard();
    }
  });
  
  // Wait for body to exist before observing
  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  ProgressDashboard.init('progress-dashboard-container');
});
