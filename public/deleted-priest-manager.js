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

function askReauthCredentials(fullName) {
  const username = window.prompt(
    `Re-authentication required to permanently delete ${fullName}.\nEnter admin username:`
  );
  if (!username || !username.trim()) {
    return null;
  }

  const password = window.prompt('Enter admin password:');
  if (!password) {
    return null;
  }

  return {
    username: username.trim(),
    password,
  };
}

async function permanentlyDeletePriest(priestId, credentials) {
  const response = await fetch(`/api/priests/${priestId}/permanent`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
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

      const credentials = askReauthCredentials(priest.fullName || 'this profile');
      if (!credentials) {
        setMessage('Re-authentication canceled.', 'error');
        return;
      }

      try {
        await permanentlyDeletePriest(priest._id, credentials);
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
