const fs = require('node:fs/promises');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const crypto = require('node:crypto');
const { createWriteStream } = require('node:fs');
const Priest = require('../models/priest.model');

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

function buildPriestFolderCandidates(priest, priestId) {
  const baseName = toSafeFolderName(priest.fullName) || `priest-${priestId}`;
  const saintName = toSafeFolderName(priest.saintName);
  const birthYear = priest.dateOfBirth ? new Date(priest.dateOfBirth).getUTCFullYear() : null;
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

  return candidates;
}

function toSafeFolderName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function folderExists(folderPath) {
  try {
    const stat = await fs.stat(folderPath);
    return stat.isDirectory();
  } catch (_error) {
    return false;
  }
}

function extractExistingPriestFolder(priest) {
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

  return null;
}

async function resolvePriestFolderName(uploadsRoot, priest, priestId) {
  const existingFolder = extractExistingPriestFolder(priest);
  if (existingFolder) {
    return { folderName: existingFolder, conflict: false, candidates: [] };
  }

  const candidates = buildPriestFolderCandidates(priest, priestId);

  for (const candidate of candidates) {
    const candidatePath = path.join(uploadsRoot, candidate);
    if (!(await folderExists(candidatePath))) {
      return { folderName: candidate, conflict: false, candidates };
    }
  }

  return { folderName: null, conflict: true, candidates };
}

async function saveStorageFolder(priestDoc, folderName) {
  if (!folderName) return;
  if (priestDoc.storageFolder === folderName) return;

  priestDoc.storageFolder = folderName;
  await priestDoc.save();
}

async function resolveFolderForUpload(uploadsRoot, priestDoc, priestId, folderNameInput) {
  if (priestDoc.storageFolder) {
    return { folderName: priestDoc.storageFolder, conflict: false, candidates: [] };
  }

  const inferredFolder = extractExistingPriestFolder(priestDoc);
  if (inferredFolder) {
    await saveStorageFolder(priestDoc, inferredFolder);
    return { folderName: inferredFolder, conflict: false, candidates: [] };
  }

  if (folderNameInput) {
    const manualFolderName = toSafeFolderName(folderNameInput);
    if (!manualFolderName) {
      return { folderName: null, conflict: false, invalid: true, candidates: [] };
    }

    const manualFolderPath = path.join(uploadsRoot, manualFolderName);
    if (await folderExists(manualFolderPath)) {
      return { folderName: null, conflict: true, candidates: [], manual: true };
    }

    await saveStorageFolder(priestDoc, manualFolderName);
    return { folderName: manualFolderName, conflict: false, candidates: [] };
  }

  const resolution = await resolvePriestFolderName(uploadsRoot, priestDoc, priestId);
  if (resolution.conflict) {
    return resolution;
  }

  await saveStorageFolder(priestDoc, resolution.folderName);
  return resolution;
}

async function findPriestFolderForListing(uploadsRoot, priest, priestId) {
  if (priest.storageFolder) {
    return priest.storageFolder;
  }

  const existingFolder = extractExistingPriestFolder(priest);
  if (existingFolder) {
    return existingFolder;
  }

  const candidates = buildPriestFolderCandidates(priest, priestId);
  for (const candidate of candidates) {
    const candidatePath = path.join(uploadsRoot, candidate);
    if (await folderExists(candidatePath)) {
      return candidate;
    }
  }

  return null;
}

function toSafeFileName(rawName) {
  const name = String(rawName || '')
    .replace(/[\\/]/g, '')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim();
  return name || null;
}

async function resolveUniqueFileName(uploadDir, originalName) {
  const safeName = toSafeFileName(originalName);
  if (!safeName) {
    const fallbackExt = path.extname(originalName || '') || '';
    return `${Date.now()}-${crypto.randomUUID()}${fallbackExt}`;
  }

  const targetPath = path.join(uploadDir, safeName);
  try {
    await fs.stat(targetPath);
  } catch (_error) {
    return safeName;
  }

  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  return `${base}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
}

async function uploadRoutes(app) {
  app.get('/uploads/profile-files', async function listProfileFiles(request, reply) {
    const priestId = request.query?.priestId;
    if (!priestId) {
      return reply.code(400).send({ message: 'priestId is required.' });
    }

    const uploadsRoot = path.join(__dirname, '../../public/uploads');
    const priestWithDetails = await Priest.findById(priestId)
      .select('fullName saintName dateOfBirth missions avatarUrl storageFolder')
      .lean();

    if (!priestWithDetails) {
      return reply.code(404).send({ message: 'Priest not found.' });
    }

    const priestFolderName = await findPriestFolderForListing(uploadsRoot, priestWithDetails, priestId);
    if (!priestFolderName) {
      return reply.send({ files: [] });
    }

    const folderPath = path.join(uploadsRoot, priestFolderName);
    if (!(await folderExists(folderPath))) {
      return reply.send({ files: [] });
    }

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const absolutePath = path.join(folderPath, entry.name);
      const stat = await fs.stat(absolutePath);
      files.push({
        fileName: entry.name,
        url: `/uploads/${priestFolderName}/${entry.name}`,
        size: stat.size,
        updatedAt: stat.mtime,
      });
    }

    files.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return reply.send({ files });
  });

  app.get('/uploads/avatar', async function listAvatarFiles(request, reply) {
    const priestId = request.query?.priestId;
    if (!priestId) {
      return reply.code(400).send({ message: 'priestId is required.' });
    }

    const uploadsRoot = path.join(__dirname, '../../public/uploads');
    const priestWithDetails = await Priest.findById(priestId)
      .select('fullName saintName dateOfBirth missions avatarUrl storageFolder')
      .lean();

    if (!priestWithDetails) {
      return reply.code(404).send({ message: 'Priest not found.' });
    }

    const priestFolderName = await findPriestFolderForListing(uploadsRoot, priestWithDetails, priestId);
    if (!priestFolderName) {
      return reply.send({ files: [] });
    }

    const folderPath = path.join(uploadsRoot, priestFolderName);
    if (!(await folderExists(folderPath))) {
      return reply.send({ files: [] });
    }

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => ALLOWED_IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .map((name) => ({
        fileName: name,
        url: `/uploads/${priestFolderName}/${name}`,
      }));

    return reply.send({ files });
  });

  app.post('/uploads/documents', async function uploadDocuments(request, reply) {
    if (!request.isMultipart()) {
      return reply.code(415).send({ message: 'Expected multipart/form-data request.' });
    }

    const priestId = request.query?.priestId;
    const folderNameInput = request.query?.folderName;
    if (!priestId) {
      return reply.code(400).send({ message: 'priestId is required.' });
    }

    const uploadsRoot = path.join(__dirname, '../../public/uploads');
    await fs.mkdir(uploadsRoot, { recursive: true });

    const priestWithDetails = await Priest.findById(priestId)
      .select('fullName saintName dateOfBirth missions avatarUrl storageFolder');

    if (!priestWithDetails) {
      return reply.code(404).send({ message: 'Priest not found.' });
    }

    const resolution = await resolveFolderForUpload(
      uploadsRoot,
      priestWithDetails,
      priestId,
      folderNameInput
    );

    if (resolution.invalid) {
      return reply.code(400).send({ message: 'Invalid folder name.' });
    }

    if (resolution.conflict) {
      return reply.code(409).send({
        code: 'FOLDER_NAME_CONFLICT',
        message: resolution.manual
          ? 'Folder name already exists. Please choose another name.'
          : 'Automatic folder naming is duplicated. Please enter a custom folder name.',
        candidates: resolution.candidates,
      });
    }

    const priestFolderName = resolution.folderName;

    const uploadDir = path.join(uploadsRoot, priestFolderName);
    await fs.mkdir(uploadDir, { recursive: true });

    const uploadedFiles = [];

    for await (const part of request.parts()) {
      if (part.type !== 'file' || !part.filename) {
        continue;
      }

      const extension = path.extname(part.filename).toLowerCase();
      if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
        return reply.code(400).send({
          message: `Unsupported file type: ${extension || 'unknown'}`,
        });
      }

      const savedName = await resolveUniqueFileName(uploadDir, part.filename);
      const savePath = path.join(uploadDir, savedName);

      await pipeline(part.file, createWriteStream(savePath));

      uploadedFiles.push({
        fileName: part.filename,
        url: `/uploads/${priestFolderName}/${savedName}`,
      });
    }

    if (uploadedFiles.length === 0) {
      return reply.code(400).send({ message: 'No files were uploaded.' });
    }

    return reply.code(201).send({ files: uploadedFiles });
  });

  app.post('/uploads/avatar', async function uploadAvatar(request, reply) {
    if (!request.isMultipart()) {
      return reply.code(415).send({ message: 'Expected multipart/form-data request.' });
    }

    const priestId = request.query?.priestId;
    const folderNameInput = request.query?.folderName;
    if (!priestId) {
      return reply.code(400).send({ message: 'priestId is required.' });
    }

    const uploadsRoot = path.join(__dirname, '../../public/uploads');
    await fs.mkdir(uploadsRoot, { recursive: true });

    const priestWithDetails = await Priest.findById(priestId)
      .select('fullName saintName dateOfBirth missions avatarUrl storageFolder');

    if (!priestWithDetails) {
      return reply.code(404).send({ message: 'Priest not found.' });
    }

    const resolution = await resolveFolderForUpload(
      uploadsRoot,
      priestWithDetails,
      priestId,
      folderNameInput
    );

    if (resolution.invalid) {
      return reply.code(400).send({ message: 'Invalid folder name.' });
    }

    if (resolution.conflict) {
      return reply.code(409).send({
        code: 'FOLDER_NAME_CONFLICT',
        message: resolution.manual
          ? 'Folder name already exists. Please choose another name.'
          : 'Automatic folder naming is duplicated. Please enter a custom folder name.',
        candidates: resolution.candidates,
      });
    }

    const priestFolderName = resolution.folderName;

    const uploadDir = path.join(uploadsRoot, priestFolderName);
    await fs.mkdir(uploadDir, { recursive: true });

    const part = await request.file();
    if (!part || !part.filename) {
      return reply.code(400).send({ message: 'No avatar file was uploaded.' });
    }

    const extension = path.extname(part.filename).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      return reply.code(400).send({
        message: `Unsupported image type: ${extension || 'unknown'}`,
      });
    }

    const savedName = await resolveUniqueFileName(uploadDir, part.filename);
    const savePath = path.join(uploadDir, savedName);

    await pipeline(part.file, createWriteStream(savePath));

    return reply.code(201).send({
      file: {
        fileName: part.filename,
        url: `/uploads/${priestFolderName}/${savedName}`,
      },
    });
  });

  app.delete('/uploads/documents', async function deleteDocument(request, reply) {
    const { priestId, fileUrl } = request.body || {};

    if (!priestId) {
      return reply.code(400).send({ message: 'priestId is required.' });
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      return reply.code(400).send({ message: 'fileUrl is required.' });
    }

    const priest = await Priest.findById(priestId).select('_id').lean();
    if (!priest) {
      return reply.code(404).send({ message: 'Priest not found.' });
    }

    if (!fileUrl.startsWith('/uploads/')) {
      return reply.code(400).send({ message: 'Invalid file URL.' });
    }

    const uploadsRoot = path.join(__dirname, '../../public/uploads');
    const relativePath = fileUrl.replace(/^\/uploads\//, '');
    const targetPath = path.resolve(uploadsRoot, relativePath);
    const resolvedUploadsRoot = path.resolve(uploadsRoot);

    if (!targetPath.startsWith(resolvedUploadsRoot)) {
      return reply.code(400).send({ message: 'Invalid file path.' });
    }

    try {
      await fs.unlink(targetPath);
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return reply.code(200).send({ deleted: false, message: 'File already removed.' });
      }

      request.log.error(error);
      return reply.code(500).send({ message: 'Failed to delete file.' });
    }
  });
}

module.exports = uploadRoutes;
