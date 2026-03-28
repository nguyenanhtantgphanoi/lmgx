const profileRoot = document.getElementById('priestProfileRoot');
const profileForm = document.getElementById('priestProfileForm');
const profileMessage = document.getElementById('profileMessage');
const deletePriestBtn = document.getElementById('deletePriestBtn');

const priestId = profileRoot?.dataset?.priestId;

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
    <td><input type="number" class="sib-birth" value="${s.birthYear || ''}" /></td>
    <td><input type="number" class="sib-death" value="${s.deathYear || ''}" /></td>
    <td><input type="text" class="sib-occ" value="${escHtml(s.occupation || '')}" /></td>
    <td><button type="button" class="btn-remove-row" title="Xóa">✕</button></td>
  `;
  tr.querySelector('.btn-remove-row').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function readSiblings() {
  return Array.from(document.querySelectorAll('#siblingsBody .sibling-row')).map((tr) => ({
    saintAndFullName: tr.querySelector('.sib-name')?.value.trim() || '',
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
  card.querySelector('.btn-remove-card').addEventListener('click', () => card.remove());
  card.querySelector('.btn-add-degree').addEventListener('click', () => addDegreeRow(degreesBody));
  document.getElementById('schoolsList').appendChild(card);
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
  tr.querySelector('.btn-remove-row').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function readSchools() {
  return Array.from(document.querySelectorAll('.school-card')).map((card) => ({
    schoolName: card.querySelector('.school-name')?.value.trim() || '',
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

function addMissionCard(m = {}) {
  const card = document.createElement('div');
  card.className = 'mission-card';
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
        <input type="text" class="mission-letter" value="${escHtml(m.appointmentLetter || '')}" />
      </label>
    </div>
  `;
  card.querySelector('.btn-remove-card').addEventListener('click', () => card.remove());
  document.getElementById('missionsList').appendChild(card);
}

function readMissions() {
  return Array.from(document.querySelectorAll('.mission-card')).map((card) => ({
    name: card.querySelector('.mission-name')?.value.trim() || '',
    places: card.querySelector('.mission-places')?.value.trim() || '',
    from: card.querySelector('.mission-from')?.value || null,
    to: card.querySelector('.mission-to')?.value || null,
    appointmentLetter: card.querySelector('.mission-letter')?.value.trim() || '',
  }));
}

document.getElementById('addMissionBtn').addEventListener('click', () => addMissionCard());

// --- Fill form ---
function fillForm(p) {
  // Personal
  profileForm.elements.namedItem('saintName').value = p.saintName || '';
  profileForm.elements.namedItem('fullName').value = p.fullName || '';
  profileForm.elements.namedItem('dateOfBirth').value = toDateInputValue(p.dateOfBirth);
  profileForm.elements.namedItem('placeOfBirth').value = p.placeOfBirth || '';
  profileForm.elements.namedItem('homeCommunity').value = p.homeCommunity || '';
  profileForm.elements.namedItem('homeParish').value = p.homeParish || '';
  profileForm.elements.namedItem('diocese').value = p.diocese || '';
  profileForm.elements.namedItem('permanentAddress').value = p.permanentAddress || '';
  profileForm.elements.namedItem('nationalId').value = p.nationalId || '';
  profileForm.elements.namedItem('passport').value = p.passport || '';
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
    dateOfBirth:       dateField('dateOfBirth'),
    placeOfBirth:      getField('placeOfBirth'),
    homeCommunity:     getField('homeCommunity'),
    homeParish:        getField('homeParish'),
    diocese:           getField('diocese'),
    permanentAddress:  getField('permanentAddress'),
    nationalId:        getField('nationalId'),
    passport:          getField('passport'),
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
    setProfileMessage(`Đã tải hồ sơ ${priest.fullName}.`, 'ok');
  } catch (error) {
    setProfileMessage(error.message || 'Lỗi không mong muốn khi tải hồ sơ.', 'error');
  }
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const updated = await updatePriest(getPayloadFromForm());
    setProfileMessage(`Đã lưu hồ sơ ${updated.fullName}.`, 'ok');
  } catch (error) {
    setProfileMessage(error.message || 'Lỗi không mong muốn khi lưu hồ sơ.', 'error');
  }
});

deletePriestBtn.addEventListener('click', async () => {
  const fullName = trimVal(profileForm.elements.namedItem('fullName')) || 'linh mục này';
  if (!window.confirm(`Xóa hồ sơ ${fullName}?`)) return;
  try {
    await deletePriest();
    window.location.href = '/priest-manager';
  } catch (error) {
    setProfileMessage(error.message || 'Lỗi không mong muốn khi xóa hồ sơ.', 'error');
  }
});

loadPriestProfile();
