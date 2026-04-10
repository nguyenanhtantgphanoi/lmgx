const priestService = require('./priest.service');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const mammoth = require('mammoth');
const { parsePriestProfileFromDocxText } = require('./priest-docx-import');

function toSafeFolderName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function buildPriestFolderCandidates(priest, priestId) {
  const baseName = toSafeFolderName(priest?.fullName) || `priest-${priestId}`;
  const saintName = toSafeFolderName(priest?.saintName);
  const birthYear = priest?.dateOfBirth ? new Date(priest.dateOfBirth).getUTCFullYear() : null;
  const hasValidYear = Number.isInteger(birthYear) && birthYear > 0;

  const candidates = [baseName];

  if (saintName) {
    candidates.push(`${baseName}-${saintName}`);
  }

  if (saintName && hasValidYear) {
    candidates.push(`${baseName}-${saintName}-${birthYear}`);
  }

  if (!saintName && hasValidYear) {
    candidates.push(`${baseName}-${birthYear}`);
  }

  candidates.push(`priest-${priestId}`);
  return [...new Set(candidates)];
}

async function folderExists(folderPath) {
  try {
    const stat = await fs.stat(folderPath);
    return stat.isDirectory();
  } catch (_error) {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch (_error) {
    return false;
  }
}

function toSafeFileName(fileName, fallbackName = 'imported-profile.docx') {
  const baseName = path.basename(String(fileName || '').trim());
  if (!baseName) return fallbackName;

  const sanitized = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/[.\s]+$/g, '');

  return sanitized || fallbackName;
}

async function resolveImportFileName(uploadDir, originalName) {
  const preferredName = toSafeFileName(originalName, 'imported-profile.docx');
  const preferredPath = path.join(uploadDir, preferredName);

  if (!(await fileExists(preferredPath))) {
    return preferredName;
  }

  const extension = path.extname(preferredName) || '.docx';
  const stem = path.basename(preferredName, extension) || 'imported-profile';
  const fallbackName = `${stem}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;
  return fallbackName;
}

async function resolveImportFolderName(uploadsRoot, priest) {
  if (priest?.storageFolder) {
    return priest.storageFolder;
  }

  const candidates = buildPriestFolderCandidates(priest, priest?._id);
  for (const candidate of candidates) {
    if (!candidate) continue;
    const candidatePath = path.join(uploadsRoot, candidate);
    if (!(await folderExists(candidatePath))) {
      return candidate;
    }
  }

  return `priest-${priest?._id}`;
}

function inferStorageFolder(priest) {
  if (priest?.storageFolder) {
    return priest.storageFolder;
  }

  const avatarMatch = /^\/uploads\/([^/]+)\//.exec(String(priest?.avatarUrl || ''));
  if (avatarMatch && avatarMatch[1]) {
    return avatarMatch[1];
  }

  const missions = Array.isArray(priest?.missions) ? priest.missions : [];
  for (const mission of missions) {
    const docs = [];

    if (Array.isArray(mission.appointmentLetters)) {
      docs.push(...mission.appointmentLetters);
    }

    if (mission.appointmentLetter) {
      docs.push(mission.appointmentLetter);
    }

    for (const docUrl of docs) {
      const match = /^\/uploads\/([^/]+)\//.exec(String(docUrl || ''));
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return '';
}

async function deletePriestStorageFolder(folderName) {
  if (!folderName) {
    return;
  }

  const uploadsRoot = path.resolve(path.join(__dirname, '../../../public/uploads'));
  const targetPath = path.resolve(path.join(uploadsRoot, folderName));

  if (!targetPath.startsWith(uploadsRoot + path.sep)) {
    throw new Error('Invalid priest storage folder path.');
  }

  await fs.rm(targetPath, { recursive: true, force: true });
}

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

async function importPriestFromDocxHandler(request, reply) {
  if (!request.isMultipart()) {
    return reply.code(415).send({ message: 'Expected multipart/form-data request.' });
  }

  const part = await request.file();
  if (!part || !part.filename) {
    return reply.code(400).send({ message: 'No DOCX file uploaded.' });
  }

  const extension = path.extname(part.filename).toLowerCase();
  if (extension !== '.docx') {
    return reply.code(400).send({ message: 'Only .docx files are supported for import.' });
  }

  try {
    const buffer = await part.toBuffer();
    const extraction = await mammoth.extractRawText({ buffer });
    const payload = parsePriestProfileFromDocxText(extraction.value);

    if (!payload.fullName) {
      return reply.code(400).send({
        message: 'Cannot detect full name from DOCX. Add a line like "Họ và tên: ..."',
      });
    }

    const priest = await priestService.createPriest(payload);

    const uploadsRoot = path.resolve(path.join(__dirname, '../../../public/uploads'));
    await fs.mkdir(uploadsRoot, { recursive: true });

    const folderName = await resolveImportFolderName(uploadsRoot, priest);
    const uploadDir = path.join(uploadsRoot, folderName);
    await fs.mkdir(uploadDir, { recursive: true });

    const importedFileName = await resolveImportFileName(uploadDir, part.filename);
    const importedFilePath = path.join(uploadDir, importedFileName);
    await fs.writeFile(importedFilePath, buffer);

    if (priest.storageFolder !== folderName) {
      priest.storageFolder = folderName;
      await priest.save();
    }

    return reply.code(201).send({
      message: `Imported profile for ${priest.fullName}.`,
      priest,
    });
  } catch (error) {
    request.log.error(error);
    return sendPriestError(reply, error, 'Priest email must be unique.');
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
  const { username, password } = request.body || {};
  const validUsername = username === request.server.config.ADMIN_USERNAME;
  const validPassword =
    validUsername &&
    bcrypt.compareSync(password || '', request.server.config.ADMIN_PASSWORD_HASH);

  if (!validUsername || !validPassword) {
    return reply.code(401).send({ message: 'Re-authentication failed.' });
  }

  const priest = await priestService.getDeletedPriestById(request.params.id);

  if (!priest) {
    return reply.code(404).send({ message: 'Deleted priest not found' });
  }

  try {
    const folderName = inferStorageFolder(priest);
    await deletePriestStorageFolder(folderName);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: 'Failed to delete priest storage folder.' });
  }

  await priestService.permanentlyDeletePriest(request.params.id);

  return reply.code(204).send();
}

module.exports = {
  createPriestHandler,
  importPriestFromDocxHandler,
  listPriestsHandler,
  listDeletedPriestsHandler,
  getPriestByIdHandler,
  updatePriestProfileHandler,
  deletePriestHandler,
  restorePriestHandler,
  permanentlyDeletePriestHandler,
};
