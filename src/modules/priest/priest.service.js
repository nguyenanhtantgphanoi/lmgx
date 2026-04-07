const Priest = require('../../models/priest.model');

async function createPriest(payload) {
  return Priest.create(payload);
}

async function listPriests() {
  return Priest.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
}

async function listDeletedPriests() {
  return Priest.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
}

async function getPriestById(priestId) {
  return Priest.findOne({ _id: priestId, deletedAt: null }).lean();
}

async function updatePriestProfile(priestId, payload) {
  return Priest.findOneAndUpdate({ _id: priestId, deletedAt: null }, payload, {
    new: true,
    runValidators: true,
    lean: true,
  });
}

async function deletePriest(priestId, deletedBy) {
  return Priest.findOneAndUpdate(
    { _id: priestId, deletedAt: null },
    {
      deletedAt: new Date(),
      deletedBy: deletedBy || '',
    },
    {
      new: true,
      lean: true,
    }
  );
}

async function restorePriest(priestId) {
  return Priest.findOneAndUpdate(
    { _id: priestId, deletedAt: { $ne: null } },
    {
      deletedAt: null,
      deletedBy: '',
    },
    {
      new: true,
      lean: true,
    }
  );
}

async function permanentlyDeletePriest(priestId) {
  return Priest.findOneAndDelete({ _id: priestId, deletedAt: { $ne: null } }).lean();
}

module.exports = {
  createPriest,
  listPriests,
  listDeletedPriests,
  getPriestById,
  updatePriestProfile,
  deletePriest,
  restorePriest,
  permanentlyDeletePriest,
};
