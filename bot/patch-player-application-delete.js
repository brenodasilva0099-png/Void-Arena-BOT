const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'internalApi.js');
if (!fs.existsSync(file)) {
  console.log('[Formularios] internalApi.js nao encontrado para patch de exclusao.');
  process.exit(0);
}

let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("const zlib = require('node:zlib');")) {
  src = src.replace("const express = require('express');", "const express = require('express');\nconst zlib = require('node:zlib');");
  changed = true;
}

if (!src.includes('function parseDatabaseBackupForFormDelete')) {
  const helper = `
function parseDatabaseBackupForFormDelete(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup.database) {
    const buffer = Buffer.from(String(backup.database || ''), 'base64');
    return JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
  }
  if (backup?.database && typeof backup.database === 'object') return backup.database;
  return backup && typeof backup === 'object' ? backup : null;
}

async function deletePlayerApplicationAndBackup(applicationId = '') {
  const safeId = String(applicationId || '').trim();
  if (!safeId) throw new Error('Formulario invalido.');

  const backup = await storage.exportDatabaseBackup();
  const database = parseDatabaseBackupForFormDelete(backup);
  if (!database || typeof database !== 'object') throw new Error('Banco atual indisponivel.');

  const applications = Array.isArray(database.playerApplications) ? database.playerApplications : [];
  const before = applications.length;
  const removed = applications.find((item) => String(item?.id || '') === safeId) || null;
  database.playerApplications = applications.filter((item) => String(item?.id || '') !== safeId);

  if (database.playerApplications.length === before) {
    throw new Error('Formulario nao encontrado.');
  }

  database.settings = database.settings && typeof database.settings === 'object' ? database.settings : {};
  const deletedIds = new Set([
    ...(Array.isArray(database.deletedPlayerApplicationIds) ? database.deletedPlayerApplicationIds : []),
    ...(Array.isArray(database.settings.deletedPlayerApplicationIds) ? database.settings.deletedPlayerApplicationIds : []),
    ...(Array.isArray(database.settings.forms?.deletedPlayerApplicationIds) ? database.settings.forms.deletedPlayerApplicationIds : [])
  ].map((item) => String(typeof item === 'string' ? item : item?.id || item?.applicationId || '').trim()).filter(Boolean));
  deletedIds.add(safeId);

  const deletedPlayerApplicationIds = Array.from(deletedIds);
  database.deletedPlayerApplicationIds = deletedPlayerApplicationIds;
  database.settings.deletedPlayerApplicationIds = deletedPlayerApplicationIds;
  database.settings.forms = {
    ...(database.settings.forms || {}),
    deletedPlayerApplicationIds,
    lastDeletedPlayerApplicationAt: new Date().toISOString()
  };
  database.meta = {
    ...(database.meta || {}),
    playerApplicationDeletedAt: new Date().toISOString(),
    playerApplicationDeletionPolicy: 'manual-delete-prevents-backup-resurrection'
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    database,
    exportedAt: new Date().toISOString()
  });

  const savedBackup = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'player-application-deleted-current-state'
  }).catch((error) => ({ success: false, message: error.message }));

  return {
    success: true,
    deleted: true,
    id: safeId,
    application: removed,
    summary: imported.summary || null,
    backupAfterDelete: savedBackup
  };
}
`;
  src = src.replace('\nfunction startInternalApi({ client, port = 3002 } = {}) {', `${helper}\nfunction startInternalApi({ client, port = 3002 } = {}) {`);
  changed = true;
}

if (!src.includes("app.delete('/internal/player-applications/:id'")) {
  const route = `
  app.delete('/internal/player-applications/:id', async (req, res) => {
    try {
      const result = await deletePlayerApplicationAndBackup(req.params.id);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

`;
  const marker = "  app.post('/internal/player-applications/:id/comment', async (req, res) => {";
  const idx = src.indexOf(marker);
  if (idx >= 0) {
    src = src.slice(0, idx) + route + src.slice(idx);
    changed = true;
  } else {
    console.log('[Formularios] Marcador da rota de comentarios nao encontrado; rota DELETE nao inserida.');
  }
}

if (changed) {
  fs.writeFileSync(file, src, 'utf8');
  console.log('[Formularios] Patch de exclusao de formulario aplicado.');
} else {
  console.log('[Formularios] Patch de exclusao de formulario ja estava aplicado.');
}
