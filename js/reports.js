/**
 * CogniCare - reports.js
 * Reports & Analytics page logic with Canvas charts
 */

document.addEventListener('DOMContentLoaded', () => {

  let allSessions = [];
  let filtered    = [];

  init();

  function init() {
    populatePatientFilter();
    loadAndRender();

    document.getElementById('filter-patient').addEventListener('change', applyFilters);
    document.getElementById('filter-level').addEventListener('change', applyFilters);
    document.getElementById('filter-date-from').addEventListener('change', applyFilters);
    document.getElementById('filter-date-to').addEventListener('change', applyFilters);
    document.getElementById('btn-clear-filter').addEventListener('click', clearFilters);
    document.getElementById('btn-print').addEventListener('click', () => window.print());
    document.getElementById('btn-pdf').addEventListener('click', exportPDF);
  }

  function populatePatientFilter() {
    const sel = document.getElementById('filter-patient');
    sel.innerHTML = '<option value="">All Patients</option>';
    Storage.getPatients().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  function loadAndRender() {
    allSessions = Storage.getSessions().slice().reverse();
    filtered    = [...allSessions];
    renderSummary();
    renderTable();
    renderCharts();
  }

  function applyFilters() {
    const patId    = document.getElementById('filter-patient').value;
    const levelNum = document.getElementById('filter-level').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo   = document.getElementById('filter-date-to').value;

    filtered = allSessions.filter(s => {
      if (patId    && s.patientId !== patId) return false;
      if (levelNum && s.level !== parseInt(levelNum)) return false;
      if (dateFrom && new Date(s.date) < new Date(dateFrom)) return false;
      if (dateTo   && new Date(s.date) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });

    renderSummary();
    renderTable();
    renderCharts();
  }

  function clearFilters() {
    document.getElementById('filter-patient').value   = '';
    document.getElementById('filter-level').value     = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value   = '';
    filtered = [...allSessions];
    renderSummary();
    renderTable();
    renderCharts();
  }

  // ---- Summary Cards ----
  function renderSummary() {
    const accuracies = filtered.filter(s => s.accuracy != null).map(s => s.accuracy);
    const reactions  = filtered.filter(s => s.reactionTime).map(s => s.reactionTime);
    const pats       = new Set(filtered.map(s => s.patientId)).size;
    const avgAcc     = accuracies.length ? Math.round(avg(accuracies)) : null;
    const avgReact   = reactions.length  ? Math.round(avg(reactions)) : null;

    document.getElementById('rpt-sessions').textContent = filtered.length;
    document.getElementById('rpt-accuracy').textContent = avgAcc  != null ? avgAcc + '%' : '—';
    document.getElementById('rpt-react').textContent    = avgReact != null ? (avgReact/1000).toFixed(2) + 's' : '—';
    document.getElementById('rpt-patients').textContent = pats;
    document.getElementById('session-count').textContent = filtered.length + ' session' + (filtered.length !== 1 ? 's' : '');
  }

  // ---- Table ----
  function renderTable() {
    const tbody = document.getElementById('session-table-body');
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-cell">No sessions match the current filters.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(s => {
      const patient = Storage.getPatientById(s.patientId);
      const mm = String(Math.floor((s.completionTime||0)/60)).padStart(2,'0');
      const ss = String((s.completionTime||0)%60).padStart(2,'0');
      return `<tr>
        <td>${new Date(s.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
        <td>${patient ? patient.name : s.patientName || '—'}</td>
        <td>Level ${s.level}</td>
        <td>${capitalize(s.difficulty||'—')}</td>
        <td style="color:var(--green);font-weight:600">${s.correct||0}</td>
        <td style="color:var(--red);font-weight:600">${s.wrong||0}</td>
        <td><strong>${s.accuracy != null ? s.accuracy + '%' : '—'}</strong></td>
        <td>${s.reactionTime ? (s.reactionTime/1000).toFixed(2)+'s' : '—'}</td>
        <td>${mm}:${ss}</td>
        <td style="font-size:0.78rem;color:var(--text-muted)">${s.notes ? s.notes.substring(0,40)+'…' : '—'}</td>
      </tr>`;
    }).join('');
  }

  // ---- Charts (Canvas) ----
  function renderCharts() {
    drawAccuracyChart();
    drawReactionChart();
    drawLevelsChart();
    drawHitsChart();
  }

  // --- Accuracy Trend ---
  function drawAccuracyChart() {
    const canvas = document.getElementById('chart-accuracy');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = filtered.slice().reverse().slice(-20).map(s => s.accuracy || 0);
    const labels = filtered.slice().reverse().slice(-20).map((s,i) => '#'+(i+1));
    drawLineChart(ctx, canvas, labels, data, '#27ae60', 'Accuracy (%)', 100);
  }

  // --- Reaction Time Trend ---
  function drawReactionChart() {
    const canvas = document.getElementById('chart-reaction');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = filtered.slice().reverse().slice(-20).map(s => s.reactionTime ? +(s.reactionTime/1000).toFixed(2) : 0);
    const labels = filtered.slice().reverse().slice(-20).map((_,i) => '#'+(i+1));
    drawLineChart(ctx, canvas, labels, data, '#2980b9', 'Reaction Time (s)', null);
  }

  // --- Sessions per Level ---
  function drawLevelsChart() {
    const canvas = document.getElementById('chart-levels');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const counts = [1,2,3,4,5,6,7].map(l => filtered.filter(s => s.level === l).length);
    const labels = ['L1','L2','L3','L4','L5','L6','L7'];
    const colors = ['#e74c3c','#e67e22','#f1c40f','#27ae60','#2980b9','#8e44ad','#16a085'];
    drawBarChart(ctx, canvas, labels, counts, colors);
  }

  // --- Correct vs Wrong ---
  function drawHitsChart() {
    const canvas = document.getElementById('chart-hits');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const correct = filtered.reduce((a,s) => a + (s.correct||0), 0);
    const wrong   = filtered.reduce((a,s) => a + (s.wrong  ||0), 0);
    drawPieChart(ctx, canvas, ['Correct', 'Wrong'], [correct, wrong], ['#27ae60','#e74c3c']);
  }

  // ---- Generic Line Chart ----
  function drawLineChart(ctx, canvas, labels, data, color, yLabel, maxY) {
    const W = canvas.width, H = canvas.height;
    const padL = 50, padR = 20, padT = 20, padB = 40;
    ctx.clearRect(0, 0, W, H);

    if (!data.length) { drawEmpty(ctx, W, H); return; }

    const max = maxY || Math.max(...data, 1) * 1.2;
    const min = 0;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(max - (max/4)*i), padL - 6, y + 4);
    }

    // Line
    const step = data.length > 1 ? chartW / (data.length - 1) : chartW;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    data.forEach((v, i) => {
      const x = padL + i * step;
      const y = padT + chartH - ((v - min) / (max - min)) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under line
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.lineTo(padL + (data.length-1)*step, padT + chartH);
    ctx.lineTo(padL, padT + chartH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dots
    data.forEach((v, i) => {
      const x = padL + i * step;
      const y = padT + chartH - ((v - min) / (max - min)) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI*2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((lbl, i) => {
      ctx.fillText(lbl, padL + i * step, H - padB + 18);
    });
  }

  // ---- Generic Bar Chart ----
  function drawBarChart(ctx, canvas, labels, data, colors) {
    const W = canvas.width, H = canvas.height;
    const padL = 40, padR = 20, padT = 20, padB = 40;
    ctx.clearRect(0, 0, W, H);

    const max = Math.max(...data, 1);
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const barW   = chartW / labels.length * 0.6;
    const gap    = chartW / labels.length;

    // Grid
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH/4)*i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W-padR, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(max - (max/4)*i), padL-4, y+4);
    }

    data.forEach((v, i) => {
      const x = padL + i * gap + (gap - barW) / 2;
      const barH = (v / max) * chartH;
      const y    = padT + chartH - barH;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barW, barH, 4) : ctx.rect(x, y, barW, barH);
      ctx.fill();

      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW/2, H - padB + 18);
      if (v > 0) {
        ctx.fillStyle = '#1a202c'; ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(v, x + barW/2, y - 4);
      }
    });
  }

  // ---- Pie Chart ----
  function drawPieChart(ctx, canvas, labels, data, colors) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const total = data.reduce((a,b) => a+b, 0);
    if (!total) { drawEmpty(ctx, W, H); return; }

    const cx = W/2 - 40, cy = H/2, r = Math.min(W/3, H/2) - 20;
    let start = -Math.PI/2;
    data.forEach((v, i) => {
      const slice = (v/total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      const mid = start + slice/2;
      const lx  = cx + Math.cos(mid) * r * 0.65;
      const ly  = cy + Math.sin(mid) * r * 0.65;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(v/total*100) + '%', lx, ly + 5);
      start += slice;
    });

    // Legend
    const legX = W - 120, legY = H/2 - 20;
    labels.forEach((lbl, i) => {
      ctx.fillStyle = colors[i];
      ctx.fillRect(legX, legY + i*26, 14, 14);
      ctx.fillStyle = '#1a202c';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lbl + ' (' + data[i] + ')', legX + 20, legY + i*26 + 11);
    });
  }

  function drawEmpty(ctx, W, H) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', W/2, H/2);
  }

  // ---- Export PDF ----
  function exportPDF() {
    window.print();
    UI.showToast('Use "Save as PDF" in the print dialog.');
  }

  // ---- Helpers ----
  function avg(arr) { return arr.reduce((a,b) => a+b, 0) / arr.length; }
  function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
});
