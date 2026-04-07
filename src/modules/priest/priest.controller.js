const priestService = require('./priest.service');

function sendPriestError(reply, error, duplicateMessage) {
  if (error && error.code === 11000) {
    return reply.code(409).send({
      message: duplicateMessage,
      details: error.keyValue || null,
    });
  }

  if (error && error.name === 'ValidationError') {
    return reply.code(400).send({
      message: 'Invalid priest data.',
      details: error.message,
    });
  }

  return reply.code(500).send({ message: 'Failed to save priest.' });
}

async function createPriestHandler(request, reply) {
  try {
    const priest = await priestService.createPriest(request.body);
    return reply.code(201).send(priest);
  } catch (error) {
    request.log.error(error);
    return sendPriestError(
      reply,
      error,
      'Priest email must be unique. Remove the old email index if email is now optional.'
    );
  }
}

async function listPriestsHandler(_request, reply) {
  const priests = await priestService.listPriests();
  return reply.send(priests);
}

async function listDeletedPriestsHandler(_request, reply) {
  const priests = await priestService.listDeletedPriests();
  return reply.send(priests);
}

async function getPriestByIdHandler(request, reply) {
  const priest = await priestService.getPriestById(request.params.id);

  if (!priest) {
    return reply.code(404).send({ message: 'Priest not found' });
  }

  return reply.send(priest);
}

async function updatePriestProfileHandler(request, reply) {
  let priest;

  try {
    priest = await priestService.updatePriestProfile(request.params.id, request.body);
  } catch (error) {
    request.log.error(error);
    return sendPriestError(reply, error, 'Priest email must be unique.');
  }

  if (!priest) {
    return reply.code(404).send({ message: 'Priest not found' });
  }

  return reply.send(priest);
}

async function deletePriestHandler(request, reply) {
  const deletedBy = request.session?.get('username') || '';
  const priest = await priestService.deletePriest(request.params.id, deletedBy);

  if (!priest) {
    return reply.code(404).send({ message: 'Priest not found' });
  }

  return reply.code(204).send();
}

async function restorePriestHandler(request, reply) {
  const priest = await priestService.restorePriest(request.params.id);

  if (!priest) {
    return reply.code(404).send({ message: 'Deleted priest not found' });
  }

  return reply.send(priest);
}

async function permanentlyDeletePriestHandler(request, reply) {
  const priest = await priestService.permanentlyDeletePriest(request.params.id);

  if (!priest) {
    return reply.code(404).send({ message: 'Deleted priest not found' });
  }

  return reply.code(204).send();
}

module.exports = {
  createPriestHandler,
  listPriestsHandler,
  listDeletedPriestsHandler,
  getPriestByIdHandler,
  updatePriestProfileHandler,
  deletePriestHandler,
  restorePriestHandler,
  permanentlyDeletePriestHandler,
};
