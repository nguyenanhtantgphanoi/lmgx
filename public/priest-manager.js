const createPriestForm = document.getElementById('createPriestForm');
const priestsBody = document.getElementById('priestsBody');
const priestMessage = document.getElementById('priestMessage');
const refreshPriestsBtn = document.getElementById('refreshPriestsBtn');
const priestRowTemplate = document.getElementById('priestRowTemplate');

async function readErrorMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function setMessage(text, type = '') {
  priestMessage.textContent = text;
  priestMessage.className = `priest-message ${type}`.trim();
}

async function fetchPriests() {
  const response = await fetch('/api/priests');
  if (!response.ok) {
    throw new Error('Failed to load priests');
  }
  return response.json();
}

async function createPriest(payload) {
  const response = await fetch('/api/priests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to create priest'));
  }

  return response.json();
}

async function removePriest(priestId) {
  const response = await fetch(`/api/priests/${priestId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to delete priest');
  }
}

function renderPriests(priests) {
  priestsBody.innerHTML = '';

  if (!priests.length) {
    priestsBody.innerHTML = '<tr><td colspan="5">Chưa có linh mục nào.</td></tr>';
    return;
  }

  for (const priest of priests) {
    const fragment = priestRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('tr');
    fragment.querySelector('.priest-full-name').textContent = priest.fullName;
    fragment.querySelector('.priest-diocese').textContent = priest.diocese || '-';
    fragment.querySelector('.priest-phone').textContent = priest.phone || '-';
    fragment.querySelector('.priest-status').textContent = priest.status || 'active';

    const manageLink = fragment.querySelector('[data-action="manage"]');
    manageLink.href = `/priest-manager/${priest._id}`;

    const deleteBtn = fragment.querySelector('[data-action="delete"]');
    deleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete profile for ${priest.fullName}?`);
      if (!confirmed) {
        return;
      }

      try {
        await removePriest(priest._id);
        row.remove();
        setMessage(`Deleted ${priest.fullName}.`, 'ok');
      } catch (error) {
        setMessage(error.message || 'Unexpected error while deleting priest.', 'error');
      }
    });

    priestsBody.appendChild(row);
  }
}

async function loadPriests() {
  setMessage('Loading priests...');

  try {
    const priests = await fetchPriests();
    renderPriests(priests);
    setMessage(`Loaded ${priests.length} priest profile(s).`, 'ok');
  } catch (error) {
    setMessage(error.message || 'Unexpected error while loading priests.', 'error');
  }
}

createPriestForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    fullName: String(createPriestForm.elements.namedItem('fullName').value || '').trim(),
    status: String(createPriestForm.elements.namedItem('status').value || 'active'),
  };

  try {
    const priest = await createPriest(payload);
    createPriestForm.reset();
    createPriestForm.elements.namedItem('status').value = 'active';
    setMessage(`Created ${priest.fullName}.`, 'ok');
    await loadPriests();
  } catch (error) {
    setMessage(error.message || 'Unexpected error while creating priest.', 'error');
  }
});

refreshPriestsBtn.addEventListener('click', loadPriests);
loadPriests();
