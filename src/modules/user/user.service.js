const User = require('../../models/user.model');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete plain.password;
  return plain;
}

async function createUser(payload) {
  const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const user = await User.create({
    ...payload,
    password: hashedPassword,
  });
  return sanitizeUser(user);
}

async function listUsers() {
  const users = await User.find().sort({ createdAt: -1 }).select('name email createdAt updatedAt').lean();
  return users.map(sanitizeUser);
}

async function updateUserProfile(userId, payload) {
  const updatePayload = { ...payload };

  if (updatePayload.password) {
    updatePayload.password = await bcrypt.hash(updatePayload.password, SALT_ROUNDS);
  }

  const user = await User.findByIdAndUpdate(userId, updatePayload, {
    new: true,
    runValidators: true,
  });
  return sanitizeUser(user);
}

async function deleteUser(userId) {
  const user = await User.findByIdAndDelete(userId);
  return user;
}

module.exports = {
  createUser,
  listUsers,
  updateUserProfile,
  deleteUser,
};
