const profileRoot = document.getElementById('priestProfileRoot');
const profileForm = document.getElementById('priestProfileForm');
const profileMessage = document.getElementById('profileMessage');
const deletePriestBtn = document.getElementById('deletePriestBtn');
const identityVerifyModal = document.getElementById('identityVerifyModal');
const identityVerifyForm = document.getElementById('identityVerifyForm');
const identityVerifyUsername = document.getElementById('identityVerifyUsername');
const identityVerifyPassword = document.getElementById('identityVerifyPassword');
const identityVerifyCancel = document.getElementById('identityVerifyCancel');
const identityVerifyError = document.getElementById('identityVerifyError');
const avatarFileInput = document.getElementById('avatarFileInput');
const avatarPreview = document.getElementById('avatarPreview');
const avatarLibrary = document.getElementById('avatarLibrary');
const saveProfileBtn = profileForm?.querySelector('button[type="submit"]');

const priestId = profileRoot?.dataset?.priestId;
let currentAvatarUrl = '';
let baselineSnapshot = '';

// --- Tab switching ---
document.getElementById('profileTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
});

// --- Utilities ---
function setProfileMessage(text, type = '') {
  profileMessage.textContent = text;
  profileMessage.className = `profile-message ${type}`.trim();
}

function toDateInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function trimVal(el) {
  return (el?.value || '').trim();
}

function getField(name) {
  return trimVal(profileForm.elements.namedItem(name));
}

function dateField(name) {
  return getField(name) || null;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function confirmDeleteAction(message) {
  return window.confirm(message || 'Bạn có chắc muốn xóa mục này?');
}

function buildCurrentSnapshot() {
  return JSON.stringify({
    payload: getPayloadFromForm(),
    hasPendingAvatarUpload: Boolean(avatarFileInput?.files?.length),
    hasPendingMissionUpload: Array.from(
      document.querySelectorAll('.mission-doc-files')
    ).some((input) => Boolean(input?.files?.length)),
  });
}

function markSnapshotAsSaved() {
  baselineSnapshot = buildCurrentSnapshot();
  updateSaveButtonState();
}

function updateSaveButtonState() {
  if (!saveProfileBtn) return;

  if (!baselineSnapshot) {
    saveProfileBtn.disabled = true;
    return;
  }

  saveProfileBtn.disabled = buildCurrentSnapshot() === baselineSnapshot;
}

function renderAvatarPreview(avatarUrl) {
  if (!avatarPreview) return;

  if (!avatarUrl) {
    avatarPreview.removeAttribute('src');
    avatarPreview.classList.remove('has-image');
    return;
  }

  avatarPreview.src = avatarUrl;
  avatarPreview.classList.add('has-image');
}

function renderAvatarLibrary(files = []) {
  if (!avatarLibrary) return;

  if (!Array.isArray(files) || files.length === 0) {
    avatarLibrary.innerHTML = '<p>Chưa có ảnh đại diện nào trong thư mục.</p>';
    return;
  }

  avatarLibrary.innerHTML = files
    .map((file) => {
      const selectedClass = file.url === currentAvatarUrl ? ' is-selected' : '';
      return `
        <div class="avatar-card${selectedClass}" data-avatar-url="${file.url}">
          <img src="${file.url}" alt="${escHtml(file.fileName || 'avatar')}" />
          <div class="avatar-card-actions">
            <button type="button" class="btn-avatar-use" data-action="use">Sử dụng</button>
            <button type="button" class="btn-avatar-delete" data-action="delete">Xóa</button>
          </div>
        </div>
      `;
    })
    .join('');

  avatarLibrary.querySelectorAll('.avatar-card').forEach((card) => {
    const avatarUrl = card.dataset.avatarUrl;

    card.querySelector('[data-action="use"]').addEventListener('click', async () => {
      try {
        currentAvatarUrl = avatarUrl;
        renderAvatarPreview(currentAvatarUrl);
        await updatePriest({ avatarUrl: currentAvatarUrl });
        await loadAvatarLibrary();
        setProfileMessage('Đã chọn ảnh đại diện từ thư viện.', 'ok');
        markSnapshotAsSaved();
      } catch (error) {
        setProfileMessage(error.message || 'Không thể chọn ảnh đại diện.', 'error');
      }
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirmDeleteAction('Xóa ảnh đại diện này khỏi thư mục lưu?')) return;

      try {
        await deleteUploadedDocument(avatarUrl);

        if (currentAvatarUrl === avatarUrl) {
          currentAvatarUrl = '';
          renderAvatarPreview('');
          await updatePriest({ avatarUrl: '' });
        }

        await loadAvatarLibrary();
        setProfileMessage('Đã xóa ảnh đại diện.', 'ok');
        markSnapshotAsSaved();
      } catch (error) {
        setProfileMessage(error.message || 'Không thể xóa ảnh đại diện.', 'error');
      }
    });
  });
}

async function loadAvatarLibrary() {
  if (!priestId) return;

  const response = await fetch(`/api/uploads/avatar?priestId=${encodeURIComponent(priestId)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Không thể tải thư viện ảnh đại diện.');
  }

  renderAvatarLibrary(result.files || []);
        updateSaveButtonState();
}

// --- Siblings ---
function renderSiblings(siblings = []) {
  document.getElementById('siblingsBody').innerHTML = '';
  siblings.forEach((s) => addSiblingRow(s));
}

function addSiblingRow(s = {}) {
  const tbody = document.getElementById('siblingsBody');
  const tr = document.createElement('tr');
  tr.className = 'sibling-row';
  tr.innerHTML = `
    <td><input type="text" class="sib-name" value="${escHtml(s.saintAndFullName || '')}" /></td>
    <td>
      <select class="sib-gender">
        <option value=""></option>
        <option value="male" ${s.gender === 'male' ? 'selected' : ''}>Nam</option>
        <option value="female" ${s.gender === 'female' ? 'selected' : ''}>Nữ</option>
      </select>
    </td>
    <td><input type="number" class="sib-birth" value="${s.birthYear || ''}" /></td>
    <td><input type="number" class="sib-death" value="${s.deathYear || ''}" /></td>
    <td><input type="text" class="sib-occ" value="${escHtml(s.occupation || '')}" /></td>
    <td><button type="button" class="btn-remove-row" title="Xóa">✕</button></td>
  `;
  tr.querySelector('.btn-remove-row').addEventListener('click', () => {
    if (!confirmDeleteAction('Xóa thông tin anh/chị/em này?')) return;
    tr.remove();
  });
  tbody.appendChild(tr);
}

function readSiblings() {
  return Array.from(document.querySelectorAll('#siblingsBody .sibling-row')).map((tr) => ({
    saintAndFullName: tr.querySelector('.sib-name')?.value.trim() || '',
    gender: tr.querySelector('.sib-gender')?.value || '',
    birthYear: parseInt(tr.querySelector('.sib-birth')?.value) || null,
    deathYear: parseInt(tr.querySelector('.sib-death')?.value) || null,
    occupation: tr.querySelector('.sib-occ')?.value.trim() || '',
  }));
}

document.getElementById('addSiblingBtn').addEventListener('click', () => addSiblingRow());

// --- Schools ---
let schoolCounter = 0;

function renderSchools(schools = []) {
  document.getElementById('schoolsList').innerHTML = '';
  schoolCounter = 0;
  schools.forEach((s) => addSchoolCard(s));
}

function addSchoolCard(s = {}) {
  const idx = ++schoolCounter;
  const card = document.createElement('div');
  card.className = 'school-card';
  card.innerHTML = `
    <div class="school-card-head">
      <strong>Trường ${idx}</strong>
      <button type="button" class="btn-remove-card">Xóa trường</button>
    </div>
    <div class="form-grid">
      <label class="col-span-2">
        Tên trường / Đại Chủng viện
        <input type="text" class="school-name" value="${escHtml(s.schoolName || '')}" />
      </label>
      <label class="col-span-2">
        Địa chỉ
        <input type="text" class="school-address" value="${escHtml(s.address || '')}" />
      </label>
      <label>
        Từ ngày
        <input type="date" class="school-from" value="${toDateInputValue(s.from)}" />
      </label>
      <label>
        Đến ngày
        <input type="date" class="school-to" value="${toDateInputValue(s.to)}" />
      </label>
    </div>
    <div class="degrees-section">
      <div class="degrees-head">
        <span>Văn bằng</span>
        <button type="button" class="btn-add-degree btn-add">+ Thêm văn bằng</button>
      </div>
      <table class="array-table">
        <thead>
          <tr><th>Tên Văn bằng</th><th>Level</th><th>Chuyên ngành</th><th></th></tr>
        </thead>
        <tbody class="degrees-body"></tbody>
      </table>
    </div>
  `;
  const degreesBody = card.querySelector('.degrees-body');
  (s.degrees || []).forEach((d) => addDegreeRow(degreesBody, d));
  card.querySelector('.btn-remove-card').addEventListener('click', () => {
    if (!confirmDeleteAction('Xóa trường/chủng viện này?')) return;
    card.remove();
    updateSaveButtonState();
  });
  card.querySelector('.btn-add-degree').addEventListener('click', () => addDegreeRow(degreesBody));
  document.getElementById('schoolsList').appendChild(card);
  updateSaveButtonState();
}

function addDegreeRow(tbody, d = {}) {
  const tr = document.createElement('tr');
  tr.className = 'degree-row';
  tr.innerHTML = `
    <td><input type="text" class="deg-name" value="${escHtml(d.degreeName || '')}" /></td>
    <td><input type="text" class="deg-level" value="${escHtml(d.level || '')}" /></td>
    <td><input type="text" class="deg-major" value="${escHtml(d.major || '')}" /></td>
    <td><button type="button" class="btn-remove-row">✕</button></td>
  `;
  tr.querySelector('.btn-remove-row').addEventListener('click', () => {
    if (!confirmDeleteAction('Xóa văn bằng này?')) return;
    tr.remove();
    updateSaveButtonState();
  });
  tbody.appendChild(tr);
  updateSaveButtonState();
}

function readSchools() {
  return Array.from(document.querySelectorAll('.school-card')).map((card) => ({
    schoolName: card.querySelector('.school-name')?.value.trim() || '',
    address: card.querySelector('.school-address')?.value.trim() || '',
    from: card.querySelector('.school-from')?.value || null,
    to: card.querySelector('.school-to')?.value || null,
    degrees: Array.from(card.querySelectorAll('.degree-row')).map((tr) => ({
      degreeName: tr.querySelector('.deg-name')?.value.trim() || '',
      level: tr.querySelector('.deg-level')?.value.trim() || '',
      major: tr.querySelector('.deg-major')?.value.trim() || '',
    })),
  }));
}

document.getElementById('addSchoolBtn').addEventListener('click', () => addSchoolCard());

// --- Missions ---
function renderMissions(missions = []) {
  document.getElementById('missionsList').innerHTML = '';
  missions.forEach((m) => addMissionCard(m));
}

function normalizeMissionDocuments(mission = {}) {
  if (Array.isArray(mission.appointmentLetters)) {
    return mission.appointmentLetters.filter(Boolean);
  }

  if (mission.appointmentLetter) {
    return [mission.appointmentLetter];
  }

  return [];
}

function renderMissionDocuments(card) {
  const listEl = card.querySelector('.mission-doc-list');
  const docs = JSON.parse(card.dataset.docs || '[]');

  listEl.innerHTML = docs
    .map((docUrl) => {
      const fileName = docUrl.split('/').pop() || docUrl;
      return `
        <li>
          <a href="${docUrl}" target="_blank" rel="noopener noreferrer">${fileName}</a>
          <button type="button" class="btn-remove-row mission-doc-remove" data-doc-url="${docUrl}">Xóa</button>
        </li>
      `;
    })
    .join('');

  listEl.querySelectorAll('.mission-doc-remove').forEach((button) => {
    button.addEventListener('click', async () => {
      const docUrl = button.dataset.docUrl;

      if (!confirmDeleteAction('Xóa tệp văn thư/bài sai này?')) return;

      try {
        await deleteUploadedDocument(docUrl);
      } catch (error) {
        setProfileMessage(error.message || 'Không thể xóa tệp khỏi thư mục lưu.', 'error');
        return;
      }

      const currentDocs = JSON.parse(card.dataset.docs || '[]');
      const updatedDocs = currentDocs.filter((url) => url !== docUrl);
      card.dataset.docs = JSON.stringify(updatedDocs);
      renderMissionDocuments(card);
      updateSaveButtonState();
      setProfileMessage('Đã xóa tệp khỏi thư mục lưu.', 'ok');
    });
  });
}

async function deleteUploadedDocument(fileUrl) {
  const response = await fetch('/api/uploads/documents', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priestId, fileUrl }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Không thể xóa tệp.');
  }

  return result;
}

function addMissionCard(m = {}) {
  const card = document.createElement('div');
  card.className = 'mission-card';
  card.dataset.docs = JSON.stringify(normalizeMissionDocuments(m));
  card.innerHTML = `
    <div class="school-card-head">
      <strong>Sứ vụ</strong>
      <button type="button" class="btn-remove-card">Xóa</button>
    </div>
    <div class="form-grid">
      <label class="col-span-2">
        Tên sứ vụ
        <input type="text" class="mission-name" value="${escHtml(m.name || '')}" />
      </label>
      <label class="col-span-2">
        Những nơi phục vụ (giáo xứ / ban / văn phòng / dòng tu)
        <input type="text" class="mission-places" value="${escHtml(m.places || '')}" />
      </label>
      <label>
        Từ ngày
        <input type="date" class="mission-from" value="${toDateInputValue(m.from)}" />
      </label>
      <label>
        Đến ngày
        <input type="date" class="mission-to" value="${toDateInputValue(m.to)}" />
      </label>
      <label class="col-span-2">
        Văn thư bổ nhiệm / bài sai
        <input type="file" class="mission-doc-files" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
      </label>
      <div class="col-span-2 mission-doc-wrap">
        <ul class="mission-doc-list"></ul>
      </div>
    </div>
  `;
  card.querySelector('.btn-remove-card').addEventListener('click', () => {
    if (!confirmDeleteAction('Xóa sứ vụ này?')) return;
    card.remove();
    updateSaveButtonState();
  });
  renderMissionDocuments(card);
  document.getElementById('missionsList').appendChild(card);
  updateSaveButtonState();
}

function readMissions() {
  return Array.from(document.querySelectorAll('.mission-card')).map((card) => ({
    name: card.querySelector('.mission-name')?.value.trim() || '',
    places: card.querySelector('.mission-places')?.value.trim() || '',
    from: card.querySelector('.mission-from')?.value || null,
    to: card.querySelector('.mission-to')?.value || null,
    appointmentLetters: JSON.parse(card.dataset.docs || '[]'),
  }));
}

async function uploadMissionDocuments() {
  const missionCards = Array.from(document.querySelectorAll('.mission-card'));
  let manualFolderName = '';

  for (const card of missionCards) {
    const fileInput = card.querySelector('.mission-doc-files');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      continue;
    }

    const formData = new FormData();
    for (const file of fileInput.files) {
      formData.append('files', file);
    }

    let result;

    while (true) {
      const query = new URLSearchParams({ priestId });
      if (manualFolderName) {
        query.set('folderName', manualFolderName);
      }

      const response = await fetch(`/api/uploads/documents?${query.toString()}`, {
        method: 'POST',
        body: formData,
      });

      result = await response.json();
      if (response.ok) {
        break;
      }

      if (result.code === 'FOLDER_NAME_CONFLICT') {
        const enteredName = window.prompt(
          'Tên thư mục bị trùng. Vui lòng nhập tên thư mục thủ công để lưu tài liệu:',
          manualFolderName || ''
        );

        if (!enteredName || !enteredName.trim()) {
          throw new Error('Bạn cần nhập tên thư mục để tiếp tục tải tệp.');
        }

        manualFolderName = enteredName.trim();
        continue;
      }

      throw new Error(result.message || 'Không thể tải tệp lên cho sứ vụ.');
    }

    const currentDocs = JSON.parse(card.dataset.docs || '[]');
    const uploadedUrls = (result.files || []).map((file) => file.url).filter(Boolean);
    card.dataset.docs = JSON.stringify([...currentDocs, ...uploadedUrls]);
    fileInput.value = '';
    renderMissionDocuments(card);
    updateSaveButtonState();
  }
}

async function uploadAvatarImage() {
  if (!avatarFileInput || !avatarFileInput.files || avatarFileInput.files.length === 0) {
    return;
  }

  const selectedFile = avatarFileInput.files[0];
  const formData = new FormData();
  formData.append('avatar', selectedFile);

  let manualFolderName = '';
  let result;

  while (true) {
    const query = new URLSearchParams({ priestId });
    if (manualFolderName) {
      query.set('folderName', manualFolderName);
    }

    const response = await fetch(`/api/uploads/avatar?${query.toString()}`, {
      method: 'POST',
      body: formData,
    });

    result = await response.json();
    if (response.ok) {
      break;
    }

    if (result.code === 'FOLDER_NAME_CONFLICT') {
      const enteredName = window.prompt(
        'Tên thư mục bị trùng. Vui lòng nhập tên thư mục thủ công để lưu ảnh đại diện:',
        manualFolderName || ''
      );

      if (!enteredName || !enteredName.trim()) {
        throw new Error('Bạn cần nhập tên thư mục để tiếp tục tải ảnh đại diện.');
      }

      manualFolderName = enteredName.trim();
      continue;
    }

    throw new Error(result.message || 'Không thể tải ảnh đại diện.');
  }

  currentAvatarUrl = result.file?.url || '';
  renderAvatarPreview(currentAvatarUrl);
  await loadAvatarLibrary();
  avatarFileInput.value = '';
  updateSaveButtonState();
}

document.getElementById('addMissionBtn').addEventListener('click', () => addMissionCard());
profileForm.addEventListener('input', updateSaveButtonState);
profileForm.addEventListener('change', updateSaveButtonState);

// --- Fill form ---
function fillForm(p) {
  // Personal
  profileForm.elements.namedItem('saintName').value = p.saintName || '';
  profileForm.elements.namedItem('fullName').value = p.fullName || '';
  currentAvatarUrl = p.avatarUrl || '';
  renderAvatarPreview(currentAvatarUrl);
  profileForm.elements.namedItem('dateOfBirth').value = toDateInputValue(p.dateOfBirth);
  profileForm.elements.namedItem('placeOfBirth').value = p.placeOfBirth || '';
  profileForm.elements.namedItem('homeCommunity').value = p.homeCommunity || '';
  profileForm.elements.namedItem('homeParish').value = p.homeParish || '';
  profileForm.elements.namedItem('diocese').value = p.diocese || '';
  profileForm.elements.namedItem('permanentAddress').value = p.permanentAddress || '';
  profileForm.elements.namedItem('temporaryResidenceName').value = p.temporaryResidenceName || '';
  profileForm.elements.namedItem('temporaryResidenceAddress').value = p.temporaryResidenceAddress || '';
  profileForm.elements.namedItem('nationalId').value = p.nationalId || '';
  profileForm.elements.namedItem('nationalIdIssuedDate').value = toDateInputValue(p.nationalIdIssuedDate);
  profileForm.elements.namedItem('nationalIdIssuedPlace').value = p.nationalIdIssuedPlace || '';
  profileForm.elements.namedItem('passport').value = p.passport || '';
  profileForm.elements.namedItem('passportIssuedDate').value = toDateInputValue(p.passportIssuedDate);
  profileForm.elements.namedItem('passportIssuedPlace').value = p.passportIssuedPlace || '';
  profileForm.elements.namedItem('healthInsuranceId').value = p.healthInsuranceId || '';
  profileForm.elements.namedItem('phone').value = p.phone || '';
  profileForm.elements.namedItem('email').value = p.email || '';
  profileForm.elements.namedItem('dateOfDeath').value = toDateInputValue(p.dateOfDeath);
  profileForm.elements.namedItem('placeOfDeath').value = p.placeOfDeath || '';
  profileForm.elements.namedItem('burialDate').value = toDateInputValue(p.burialDate);
  profileForm.elements.namedItem('placeOfBurial').value = p.placeOfBurial || '';
  profileForm.elements.namedItem('status').value = p.status || 'active';
  profileForm.elements.namedItem('notes').value = p.notes || '';

  // Family
  profileForm.elements.namedItem('fatherName').value = p.fatherName || '';
  profileForm.elements.namedItem('motherName').value = p.motherName || '';
  profileForm.elements.namedItem('familyAddress').value = p.familyAddress || '';
  profileForm.elements.namedItem('familyCommunity').value = p.familyCommunity || '';
  profileForm.elements.namedItem('familyParish').value = p.familyParish || '';
  renderSiblings(p.siblings);

  // Education
  renderSchools(p.schools);

  // Sacraments
  const bap = p.baptism || {};
  profileForm.elements.namedItem('baptism.date').value = toDateInputValue(bap.date);
  profileForm.elements.namedItem('baptism.place').value = bap.place || '';
  profileForm.elements.namedItem('baptism.minister').value = bap.minister || '';
  profileForm.elements.namedItem('baptism.godparent').value = bap.godparent || '';

  const con = p.confirmation || {};
  profileForm.elements.namedItem('confirmation.date').value = toDateInputValue(con.date);
  profileForm.elements.namedItem('confirmation.place').value = con.place || '';
  profileForm.elements.namedItem('confirmation.minister').value = con.minister || '';
  profileForm.elements.namedItem('confirmation.godparent').value = con.godparent || '';

  // Ordination
  const dia = p.diaconate || {};
  profileForm.elements.namedItem('diaconate.place').value = dia.place || '';
  profileForm.elements.namedItem('diaconate.date').value = toDateInputValue(dia.date);
  profileForm.elements.namedItem('diaconate.bishop').value = dia.bishop || '';

  const pri = p.priesthood || {};
  profileForm.elements.namedItem('priesthood.place').value = pri.place || '';
  profileForm.elements.namedItem('priesthood.date').value = toDateInputValue(pri.date);
  profileForm.elements.namedItem('priesthood.bishop').value = pri.bishop || '';

  // Transfer
  profileForm.elements.namedItem('originalDiocese').value = p.originalDiocese || '';
  profileForm.elements.namedItem('joinedDioceseDate').value = toDateInputValue(p.joinedDioceseDate);

  // Ministry
  renderMissions(p.missions);
}

// --- Build payload ---
function getPayloadFromForm() {
  return {
    saintName:         getField('saintName'),
    fullName:          getField('fullName'),
    avatarUrl:         currentAvatarUrl,
    dateOfBirth:       dateField('dateOfBirth'),
    placeOfBirth:      getField('placeOfBirth'),
    homeCommunity:     getField('homeCommunity'),
    homeParish:        getField('homeParish'),
    diocese:           getField('diocese'),
    permanentAddress:          getField('permanentAddress'),
    temporaryResidenceName:    getField('temporaryResidenceName'),
    temporaryResidenceAddress: getField('temporaryResidenceAddress'),
    nationalId:             getField('nationalId'),
    nationalIdIssuedDate:   dateField('nationalIdIssuedDate'),
    nationalIdIssuedPlace:  getField('nationalIdIssuedPlace'),
    passport:               getField('passport'),
    passportIssuedDate:     dateField('passportIssuedDate'),
    passportIssuedPlace:    getField('passportIssuedPlace'),
    healthInsuranceId: getField('healthInsuranceId'),
    phone:             getField('phone'),
    email:             getField('email'),
    dateOfDeath:       dateField('dateOfDeath'),
    placeOfDeath:      getField('placeOfDeath'),
    burialDate:        dateField('burialDate'),
    placeOfBurial:     getField('placeOfBurial'),
    status:            getField('status') || 'active',
    notes:             getField('notes'),

    fatherName:      getField('fatherName'),
    motherName:      getField('motherName'),
    familyAddress:   getField('familyAddress'),
    familyCommunity: getField('familyCommunity'),
    familyParish:    getField('familyParish'),
    siblings:        readSiblings(),

    schools: readSchools(),

    baptism: {
      date:      dateField('baptism.date'),
      place:     getField('baptism.place'),
      minister:  getField('baptism.minister'),
      godparent: getField('baptism.godparent'),
    },
    confirmation: {
      date:      dateField('confirmation.date'),
      place:     getField('confirmation.place'),
      minister:  getField('confirmation.minister'),
      godparent: getField('confirmation.godparent'),
    },
    diaconate: {
      place:  getField('diaconate.place'),
      date:   dateField('diaconate.date'),
      bishop: getField('diaconate.bishop'),
    },
    priesthood: {
      place:  getField('priesthood.place'),
      date:   dateField('priesthood.date'),
      bishop: getField('priesthood.bishop'),
    },

    originalDiocese:   getField('originalDiocese'),
    joinedDioceseDate: dateField('joinedDioceseDate'),

    missions: readMissions(),
  };
}

// --- API ---
async function fetchPriest() {
  const response = await fetch(`/api/priests/${priestId}`);
  if (!response.ok) throw new Error('Không thể tải hồ sơ linh mục');
  return response.json();
}

async function updatePriest(payload) {
  const response = await fetch(`/api/priests/${priestId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Không thể lưu hồ sơ linh mục');
  return response.json();
}

async function deletePriest() {
  const response = await fetch(`/api/priests/${priestId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Không thể xóa hồ sơ linh mục');
}

function requestIdentityCredentials() {
  return new Promise((resolve) => {
    identityVerifyError.textContent = '';
    identityVerifyForm.reset();
    identityVerifyModal.setAttribute('aria-hidden', 'false');
    identityVerifyUsername.focus();

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onSubmit = (event) => {
      event.preventDefault();

      const username = (identityVerifyUsername.value || '').trim();
      const password = identityVerifyPassword.value || '';

      if (!username || !password) {
        identityVerifyError.textContent = 'Vui lòng nhập đủ username và password.';
        return;
      }

      cleanup();
      resolve({ username, password });
    };

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    const cleanup = () => {
      identityVerifyModal.setAttribute('aria-hidden', 'true');
      identityVerifyForm.removeEventListener('submit', onSubmit);
      identityVerifyCancel.removeEventListener('click', onCancel);
      identityVerifyModal.removeEventListener('keydown', onKeydown);
    };

    identityVerifyForm.addEventListener('submit', onSubmit);
    identityVerifyCancel.addEventListener('click', onCancel);
    identityVerifyModal.addEventListener('keydown', onKeydown);
  });
}

async function verifyIdentityForDelete() {
  const credentials = await requestIdentityCredentials();

  if (!credentials) {
    throw new Error('Đã hủy xác thực.');
  }

  const response = await fetch('/auth/verify-identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Xác thực thất bại.');
  }
}

// --- Init ---
async function loadPriestProfile() {
  if (!priestId) {
    setProfileMessage('Thiếu priest id trong route.', 'error');
    return;
  }
  setProfileMessage('Đang tải hồ sơ...');
  try {
    const priest = await fetchPriest();
    fillForm(priest);
    await loadAvatarLibrary();
    markSnapshotAsSaved();
    setProfileMessage(`Đã tải hồ sơ ${priest.fullName}.`, 'ok');
  } catch (error) {
    setProfileMessage(error.message || 'Lỗi không mong muốn khi tải hồ sơ.', 'error');
  }
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await uploadAvatarImage();
    await uploadMissionDocuments();
    const updated = await updatePriest(getPayloadFromForm());
    fillForm(updated);
    await loadAvatarLibrary();
    markSnapshotAsSaved();
    setProfileMessage(`Đã lưu hồ sơ ${updated.fullName}.`, 'ok');
  } catch (error) {
    setProfileMessage(error.message || 'Lỗi không mong muốn khi lưu hồ sơ.', 'error');
  }
});

deletePriestBtn.addEventListener('click', async () => {
  const fullName = trimVal(profileForm.elements.namedItem('fullName')) || 'linh mục này';
  if (!confirmDeleteAction(`Xóa hồ sơ ${fullName}?`)) return;
  try {
    await verifyIdentityForDelete();
    await deletePriest();
    window.location.href = '/priest-manager';
  } catch (error) {
    setProfileMessage(error.message || 'Lỗi không mong muốn khi xóa hồ sơ.', 'error');
  }
});

loadPriestProfile();
