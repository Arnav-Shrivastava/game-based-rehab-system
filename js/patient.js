/**
 * CogniCare - patient.js
 * Patient management page logic
 */

document.addEventListener('DOMContentLoaded', () => {

  let editingId = null;
  let deleteId  = null;

  // ---- Render patient cards ----
  function renderPatients(filter = '') {
    const list   = document.getElementById('patient-list');
    const gender = document.getElementById('patient-filter')?.value || '';
    let patients  = Storage.getPatients();

    if (filter) {
      const q = filter.toLowerCase();
      patients = patients.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.diagnosis || '').toLowerCase().includes(q)
      );
    }
    if (gender) patients = patients.filter(p => p.gender === gender);

    if (!patients.length) {
      list.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">👥</div>
          <h3>${filter ? 'No patients match your search.' : 'No patients yet'}</h3>
          <p>${filter ? 'Try a different keyword.' : 'Click "Add Patient" to register your first patient.'}</p>
        </div>`;
      return;
    }

    list.innerHTML = patients.map(p => {
      const color    = UI.avatarColor(p.name);
      const initials = UI.avatarInitials(p.name);
      const sessions = Storage.getSessionsForPatient(p.id);
      return `
        <div class="patient-card" data-id="${p.id}">
          <div class="pc-header">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="pc-avatar" style="background:${color}">${initials}</div>
              <div>
                <div class="pc-name">${p.name}</div>
                <div class="pc-id">${p.id}</div>
              </div>
            </div>
          </div>
          <div class="pc-detail">
            <span class="pc-tag">Age ${p.age}</span>
            <span class="pc-tag">${capitalize(p.gender)}</span>
            ${p.diagnosis ? `<span class="pc-tag">${p.diagnosis}</span>` : ''}
            <span class="pc-tag">${sessions.length} session${sessions.length !== 1 ? 's' : ''}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);">
            Therapist: <strong>${p.therapist}</strong>
          </div>
          ${p.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;font-style:italic;">"${p.notes}"</div>` : ''}
          <div class="pc-actions">
            <button class="btn btn-outline btn-sm" onclick="startTherapy('${p.id}')">▶ Start Therapy</button>
            <button class="btn btn-outline btn-sm" onclick="editPatient('${p.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

  // ---- Open Add Modal ----
  function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Add Patient';
    document.getElementById('patient-form').reset();
    document.getElementById('f-pid').value = Storage.generateId();
    showModal();
  }

  // ---- Edit Patient ----
  window.editPatient = function(id) {
    const p = Storage.getPatientById(id);
    if (!p) return;
    editingId = id;
    document.getElementById('modal-title').textContent = 'Edit Patient';
    document.getElementById('f-name').value      = p.name;
    document.getElementById('f-pid').value       = p.id;
    document.getElementById('f-age').value       = p.age;
    document.getElementById('f-gender').value    = p.gender;
    document.getElementById('f-therapist').value = p.therapist;
    document.getElementById('f-diagnosis').value = p.diagnosis || '';
    document.getElementById('f-notes').value     = p.notes || '';
    showModal();
  };

  // ---- Delete confirm ----
  window.confirmDelete = function(id) {
    deleteId = id;
    document.getElementById('delete-modal').style.display = 'flex';
  };
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-modal').style.display = 'none';
    deleteId = null;
  });
  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (deleteId) {
      Storage.deletePatient(deleteId);
      UI.showToast('Patient deleted.', 'error');
      deleteId = null;
      document.getElementById('delete-modal').style.display = 'none';
      renderPatients(document.getElementById('patient-search').value);
    }
  });

  // ---- Start therapy shortcut ----
  window.startTherapy = function(id) {
    window.location.href = `therapy.html?patientId=${id}`;
  };

  // ---- Modal helpers ----
  function showModal() { document.getElementById('patient-modal').style.display = 'flex'; }
  function hideModal() { document.getElementById('patient-modal').style.display = 'none'; editingId = null; }

  document.getElementById('btn-add-patient').addEventListener('click', openAddModal);
  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', hideModal);
  document.getElementById('patient-modal').addEventListener('click', e => { if (e.target === document.getElementById('patient-modal')) hideModal(); });

  // ---- Form Submit ----
  document.getElementById('patient-form').addEventListener('submit', e => {
    e.preventDefault();
    const name      = document.getElementById('f-name').value.trim();
    const age       = parseInt(document.getElementById('f-age').value);
    const gender    = document.getElementById('f-gender').value;
    const therapist = document.getElementById('f-therapist').value.trim();

    if (!name || !age || !gender || !therapist) {
      UI.showToast('Please fill all required fields.', 'error');
      return;
    }

    const data = {
      name, age, gender, therapist,
      diagnosis: document.getElementById('f-diagnosis').value.trim(),
      notes:     document.getElementById('f-notes').value.trim(),
    };

    if (editingId) {
      Storage.updatePatient(editingId, data);
      UI.showToast('Patient updated successfully.');
    } else {
      data.id = document.getElementById('f-pid').value;
      Storage.addPatient(data);
      UI.showToast('Patient added successfully.');
    }
    hideModal();
    renderPatients(document.getElementById('patient-search').value);
    UI.Sounds.correct();
  });

  // ---- Search ----
  document.getElementById('patient-search').addEventListener('input', e => {
    renderPatients(e.target.value);
  });
  document.getElementById('patient-filter').addEventListener('change', () => {
    renderPatients(document.getElementById('patient-search').value);
  });

  // ---- Initial render ----
  renderPatients();
});
