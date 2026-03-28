const usersBody = document.getElementById('usersBody');
const messageEl = document.getElementById('message');
const refreshBtn = document.getElementById('refreshBtn');
const createUserForm = document.getElementById('createUserForm');
const userRowTemplate = document.getElementById('userRowTemplate');
const editModal = document.getElementById('editModal');
const editUserForm = document.getElementById('editUserForm');
const editNameInput = document.getElementById('editName');
const editEmailInput = document.getElementById('editEmail');
const editPasswordInput = document.getElementById('editPassword');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let currentEditingUserId = null;

function showMessage(text, type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function openEditModal(user) {
  currentEditingUserId = user._id;
  editNameInput.value = user.name;
  editEmailInput.value = user.email;
  editPasswordInput.value = '';
  editModal.showModal();
}

function closeEditModal() {
  currentEditingUserId = null;
  editUserForm.reset();
  editModal.close();
}

async function loadUsers() {
  showMessage('Loading users...');

  try {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error('Failed to load users');
    }

    const users = await response.json();
    renderUsers(users);
    showMessage(`Loaded ${users.length} user(s).`, 'ok');
  } catch (error) {
    showMessage(error.message || 'Unexpected error while loading users.', 'error');
  }
}

async function createUser(payload) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create user');
  }

  return response.json();
}

async function updateUser(userId, payload) {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update user profile');
  }

  return response.json();
}

async function deleteUser(userId) {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }
}

function renderUsers(users) {
  usersBody.innerHTML = '';

  if (!users.length) {
    usersBody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
    return;
  }

  for (const user of users) {
    const fragment = userRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('tr');
    const nameEl = fragment.querySelector('.user-name');
    const emailEl = fragment.querySelector('.user-email');
    const editBtn = fragment.querySelector('.btn-edit');
    const deleteBtn = fragment.querySelector('.btn-delete');

    nameEl.textContent = user.name;
    emailEl.textContent = user.email;

    editBtn.addEventListener('click', () => {
      openEditModal(user);
    });

    deleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete ${user.name}?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteUser(user._id);
        row.remove();
        showMessage(`Deleted ${user.name}.`, 'ok');
      } catch (error) {
        showMessage(error.message || 'Unexpected error while deleting user.', 'error');
      }
    });

    usersBody.appendChild(row);
  }
}

createUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const nameInput = createUserForm.elements.namedItem('name');
  const emailInput = createUserForm.elements.namedItem('email');
  const passwordInput = createUserForm.elements.namedItem('password');
  const payload = {
    name: String(nameInput.value || '').trim(),
    email: String(emailInput.value || '').trim(),
    password: String(passwordInput.value || ''),
  };

  try {
    const user = await createUser(payload);
    createUserForm.reset();
    showMessage(`Created ${user.name}.`, 'ok');
    await loadUsers();
  } catch (error) {
    showMessage(error.message || 'Unexpected error while creating user.', 'error');
  }
});

editUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentEditingUserId) {
    return;
  }

  const payload = {
    name: String(editNameInput.value || '').trim(),
    email: String(editEmailInput.value || '').trim(),
  };

  const newPassword = String(editPasswordInput.value || '').trim();
  if (newPassword) {
    payload.password = newPassword;
  }

  try {
    const updatedUser = await updateUser(currentEditingUserId, payload);
    closeEditModal();
    showMessage(`Updated ${updatedUser.name}.`, 'ok');
    await loadUsers();
  } catch (error) {
    showMessage(error.message || 'Unexpected error while updating user.', 'error');
  }
});

cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('cancel', () => {
  currentEditingUserId = null;
});

refreshBtn.addEventListener('click', loadUsers);
loadUsers();
