/**
 * CogniCare - storage.js
 * All LocalStorage read/write operations
 */

export const Storage = (() => {
  const KEYS = {
    patients: 'cognicare_patients',
    sessions: 'cognicare_sessions',
    settings: 'cognicare_settings',
    theme:    'cognicare_theme',
  };

  /* ---- Patients ---- */
  function getPatients() {
    try { return JSON.parse(localStorage.getItem(KEYS.patients)) || []; }
    catch { return []; }
  }
  function savePatients(list) {
    localStorage.setItem(KEYS.patients, JSON.stringify(list));
  }
  function addPatient(patient) {
    const list = getPatients();
    patient.id = patient.id || generateId();
    patient.createdAt = new Date().toISOString();
    list.push(patient);
    savePatients(list);
    return patient;
  }
  function updatePatient(id, updates) {
    const list = getPatients().map(p => p.id === id ? { ...p, ...updates, id } : p);
    savePatients(list);
  }
  function deletePatient(id) {
    savePatients(getPatients().filter(p => p.id !== id));
    // also remove sessions for this patient
    saveSessions(getSessions().filter(s => s.patientId !== id));
  }
  function getPatientById(id) {
    return getPatients().find(p => p.id === id) || null;
  }

  /* ---- Sessions ---- */
  function getSessions() {
    try { return JSON.parse(localStorage.getItem(KEYS.sessions)) || []; }
    catch { return []; }
  }
  function saveSessions(list) {
    localStorage.setItem(KEYS.sessions, JSON.stringify(list));
  }
  function addSession(session) {
    const list = getSessions();
    session.id = generateId();
    session.date = new Date().toISOString();
    list.push(session);
    saveSessions(list);
    return session;
  }
  function clearSessions() {
    saveSessions([]);
  }
  function getSessionsForPatient(patientId) {
    return getSessions().filter(s => s.patientId === patientId);
  }

  function endSession(sessionData) {
    // Make sure we have the required fields in the session, backward compatible
    const session = {
      patientId: sessionData.patientId,
      gameType: sessionData.gameType || 'therapy',
      level: sessionData.level,
      accuracy: sessionData.accuracy,
      correct: sessionData.correct,
      wrong: sessionData.wrong,
      wrongLog: sessionData.wrongLog || [],
      ...(sessionData.extra || {})
    };
    return addSession(session);
  }

  /* ---- Settings ---- */
  const DEFAULTS = {
    ballCount: 10,
    ballSize: 'medium',
    difficulty: 'medium',
    enableTimer: false,
    timerDuration: 5,
    enableSound: true,
    enableVoice: true,
    volume: 70,
    darkMode: false,
    theme: 'default',
    highContrast: false,
    fontSize: 16,
    largeTouchTargets: true,
    keyboardNav: true,
  };
  function getSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEYS.settings)) || {};
      return { ...DEFAULTS, ...saved };
    } catch { return { ...DEFAULTS }; }
  }
  function saveSettings(settings) {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  }
  function resetSettings() {
    localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULTS));
    return { ...DEFAULTS };
  }

  /* ---- Helpers ---- */
  function generateId() {
    return 'CC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase();
  }
  function clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  return {
    getPatients, savePatients, addPatient, updatePatient, deletePatient, getPatientById,
    getSessions, addSession, endSession, clearSessions, getSessionsForPatient,
    getSettings, saveSettings, resetSettings,
    clearAll, generateId,
  };
})();
