const userService = require('./user.service');

async function createUserHandler(request, reply) {
  const user = await userService.createUser(request.body);
  return reply.code(201).send(user);
}

async function listUsersHandler(_request, reply) {
  const users = await userService.listUsers();
  return reply.send(users);
}

async function updateUserProfileHandler(request, reply) {
  const user = await userService.updateUserProfile(request.params.id, request.body);

  if (!user) {
    return reply.code(404).send({ message: 'User not found' });
  }

  return reply.send(user);
}

async function deleteUserHandler(request, reply) {
  const user = await userService.deleteUser(request.params.id);

  if (!user) {
    return reply.code(404).send({ message: 'User not found' });
  }

  return reply.code(204).send();
}

module.exports = {
  createUserHandler,
  listUsersHandler,
  updateUserProfileHandler,
  deleteUserHandler,
};
