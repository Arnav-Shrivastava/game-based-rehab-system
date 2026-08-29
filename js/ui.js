/**
 * CogniCare - ui.js
 * Shared UI utilities: clock, dark mode, fullscreen, toasts, sounds
 */

const UI = (() => {

  /* ---- Clock ---- */
  function startClock() {
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      const el = document.getElementById('clock');
      if (el) el.textContent = `${hh}:${mm}`;
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---- Footer date ---- */
  function setFooterDate() {
    const el = document.getElementById('footer-date');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  }

  /* ---- Dark Mode ---- */
  function applyDarkMode(on) {
    document.body.classList.toggle('dark', on);
    const btn = document.getElementById('btn-dark');
    if (btn) btn.textContent = on ? '☀️' : '🌙';
    const chk = document.getElementById('s-dark-mode');
    if (chk) chk.checked = on;
  }
  function initDarkMode() {
    const settings = Storage.getSettings();
    applyDarkMode(settings.darkMode);
    const btn = document.getElementById('btn-dark');
    if (btn) {
      btn.addEventListener('click', () => {
        const next = !document.body.classList.contains('dark');
        applyDarkMode(next);
        const s = Storage.getSettings();
        s.darkMode = next;
        Storage.saveSettings(s);
      });
    }
  }

  /* ---- Fullscreen ---- */
  function initFullscreen() {
    const btn = document.getElementById('btn-fs');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        btn.textContent = '⊡';
      } else {
        document.exitFullscreen();
        btn.textContent = '⛶';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) btn.textContent = '⛶';
    });
  }

  /* ---- Toast ---- */
  function showToast(msg, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast${type !== 'success' ? ' ' + type : ''}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  /* ---- Sounds ---- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx = null;

  function getCtx() {
    if (!actx) actx = new AudioCtx();
    return actx;
  }

  function playTone(freq, type, duration, gain = 0.3) {
    const settings = Storage.getSettings();
    if (!settings.enableSound) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gain * (settings.volume / 100), ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = type;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  const Sounds = {
    click:   () => playTone(600, 'sine', 0.1, 0.2),
    correct: () => { playTone(880, 'sine', 0.15, 0.3); setTimeout(() => playTone(1100, 'sine', 0.2, 0.3), 100); },
    wrong:   () => { playTone(200, 'sawtooth', 0.3, 0.4); },
    complete:() => {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.25, 0.35), i * 120));
    },
    pop:     () => playTone(500, 'square', 0.08, 0.25),
  };

  /* ---- Voice Instructions ---- */
  function speak(text) {
    const settings = Storage.getSettings();
    if (!settings.enableVoice) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 1;
    window.speechSynthesis.speak(utt);
  }

  /* ---- Avatar color from name ---- */
  const AVATAR_COLORS = ['#e74c3c','#27ae60','#2980b9','#8e44ad','#f39c12','#16a085','#d35400'];
  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  function avatarInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substr(0,2);
  }

  /* ---- Format date ---- */
  function formatDate(iso) {
    return new Date(iso).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  /* ---- Init (called on every page) ---- */
  function init() {
    startClock();
    setFooterDate();
    initDarkMode();
    initFullscreen();
  }

  return { init, showToast, Sounds, speak, avatarColor, avatarInitials, formatDate, applyDarkMode };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', () => UI.init());
