const deletedPriestsBody = document.getElementById('deletedPriestsBody');
const deletedPriestMessage = document.getElementById('deletedPriestMessage');
const refreshDeletedPriestsBtn = document.getElementById('refreshDeletedPriestsBtn');
const deletedPriestRowTemplate = document.getElementById('deletedPriestRowTemplate');

async function readErrorMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function setMessage(text, type = '') {
  deletedPriestMessage.textContent = text;
  deletedPriestMessage.className = `priest-message ${type}`.trim();
}

function formatDeletedAt(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

async function fetchDeletedPriests() {
  const response = await fetch('/api/priests/deleted');
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to load deleted priests'));
  }
  return response.json();
}

async function restorePriest(priestId) {
  const response = await fetch(`/api/priests/${priestId}/restore`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to restore priest'));
  }
  return response.json();
}

async function permanentlyDeletePriest(priestId) {
  const response = await fetch(`/api/priests/${priestId}/permanent`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete priest permanently'));
  }
}

function renderDeletedPriests(priests) {
  deletedPriestsBody.innerHTML = '';

  if (!priests.length) {
    deletedPriestsBody.innerHTML = '<tr><td colspan="4">Không có hồ sơ đã xóa.</td></tr>';
    return;
  }

  for (const priest of priests) {
    const fragment = deletedPriestRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('tr');

    fragment.querySelector('.priest-full-name').textContent = priest.fullName || '-';
    fragment.querySelector('.priest-deleted-by').textContent = priest.deletedBy || '-';
    fragment.querySelector('.priest-deleted-at').textContent = formatDeletedAt(priest.deletedAt);

    const restoreBtn = fragment.querySelector('[data-action="restore"]');
    restoreBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(`Restore profile for ${priest.fullName}?`);
      if (!confirmed) return;

      try {
        await restorePriest(priest._id);
        row.remove();
        setMessage(`Restored ${priest.fullName}.`, 'ok');
      } catch (error) {
        setMessage(error.message || 'Unexpected error while restoring priest.', 'error');
      }
    });

    const permanentDeleteBtn = fragment.querySelector('[data-action="permanent-delete"]');
    permanentDeleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(
        `Permanently delete ${priest.fullName}? This cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await permanentlyDeletePriest(priest._id);
        row.remove();
        setMessage(`Permanently deleted ${priest.fullName}.`, 'ok');
      } catch (error) {
        setMessage(error.message || 'Unexpected error while deleting priest.', 'error');
      }
    });

    deletedPriestsBody.appendChild(row);
  }
}

async function loadDeletedPriests() {
  setMessage('Loading deleted priests...');

  try {
    const priests = await fetchDeletedPriests();
    renderDeletedPriests(priests);
    setMessage(`Loaded ${priests.length} deleted profile(s).`, 'ok');
  } catch (error) {
    setMessage(error.message || 'Unexpected error while loading deleted priests.', 'error');
  }
}

refreshDeletedPriestsBtn.addEventListener('click', loadDeletedPriests);
loadDeletedPriests();
