const Priest = require('../../models/priest.model');

async function createPriest(payload) {
  return Priest.create(payload);
}

async function listPriests() {
  return Priest.find().sort({ createdAt: -1 }).lean();
}

async function getPriestById(priestId) {
  return Priest.findById(priestId).lean();
}

async function updatePriestProfile(priestId, payload) {
  return Priest.findByIdAndUpdate(priestId, payload, {
    new: true,
    runValidators: true,
    lean: true,
  });
}

async function deletePriest(priestId) {
  return Priest.findByIdAndDelete(priestId).lean();
}

module.exports = {
  createPriest,
  listPriests,
  getPriestById,
  updatePriestProfile,
  deletePriest,
};
