const DEFAULT_BRANCH = 'main';

function getConfig() {
  return {
    token: process.env.GITHUB_BACKUP_TOKEN || process.env.GITHUB_TOKEN || '',
    repo: process.env.GITHUB_BACKUP_REPO || '',
    branch: process.env.GITHUB_BACKUP_BRANCH || DEFAULT_BRANCH,
    prefix: String(process.env.GITHUB_BACKUP_PREFIX || 'void-arena').replace(/[^\w.-]+/g, '-'),
    autoRestore: String(process.env.GITHUB_BACKUP_AUTO_RESTORE || '').toLowerCase() === 'true'
  };
}

function requireConfig() {
  const config = getConfig();
  if (!config.token) throw new Error('GITHUB_BACKUP_TOKEN não configurado.');
  if (!config.repo || !config.repo.includes('/')) throw new Error('GITHUB_BACKUP_REPO inválido. Use owner/repo.');
  return config;
}

function encodeBase64Utf8(value) { return Buffer.from(String(value), 'utf8').toString('base64'); }
function decodeBase64Utf8(value) { return Buffer.from(String(value || ''), 'base64').toString('utf8'); }

async function githubRequest(config, pathname, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${config.repo}${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API falhou (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function readGithubFile(config, filePath) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  try { return await githubRequest(config, `/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`, { method: 'GET' }); }
  catch (error) { if (error.status === 404) return null; throw error; }
}

async function putGithubFile(config, filePath, content, message) {
  const existing = await readGithubFile(config, filePath);
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  return githubRequest(config, `/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify({ message, branch: config.branch, content: encodeBase64Utf8(content), ...(existing?.sha ? { sha: existing.sha } : {}) })
  });
}

function monthFolder(date = new Date()) { return date.toISOString().slice(0, 7); }
function backupFileName(prefix, date = new Date()) { return `${prefix}-backup-${date.toISOString().replace(/[:.]/g, '-')}.json`; }

const REGRESSION_KEYS = [
  'users',
  'teams',
  'events',
  'playerApplications',
  'trainingSubmissions',
  'eventRegistrationRequests',
  'teamChats'
];

function summaryValue(summary = {}, key = '') {
  return Number(summary?.[key] || 0) || 0;
}

function summaryWeight(summary = {}) {
  return REGRESSION_KEYS.reduce((sum, key) => sum + summaryValue(summary, key), 0);
}

function reasonAllowsRegression(reason = '') {
  // Nunca aceite regressão apenas porque uma função comum gravou o banco.
  // Reduções só podem atualizar o latest quando houver uma operação destrutiva
  // explicitamente aprovada e identificada por este prefixo.
  return String(reason || '').toLowerCase().startsWith('approved-destructive:');
}

function regressionDetails(nextSummary = {}, latestSummary = {}) {
  return REGRESSION_KEYS
    .map((key) => ({ key, next: summaryValue(nextSummary, key), latest: summaryValue(latestSummary, key) }))
    .filter((item) => item.latest > item.next);
}

function looksDangerouslyEmpty(backup = {}, latest = null) {
  const nextSummary = backup.summary || {};
  const latestSummary = latest?.summary || {};
  return summaryWeight(nextSummary) === 0 && summaryWeight(latestSummary) > 0;
}

function looksLikeDataRegression(backup = {}, latest = null, reason = '') {
  if (!latest || reasonAllowsRegression(reason)) return false;
  return regressionDetails(backup.summary || {}, latest.summary || {}).length > 0;
}

async function saveBackupToGitHub(storage, options = {}) {
  const config = requireConfig();
  const backup = await storage.exportDatabaseBackup();
  const now = new Date();
  const reason = options.reason || 'manual';

  if (!options.force) {
    const latest = await fetchLatestBackupFromGitHub().catch(() => null);
    if (latest && looksDangerouslyEmpty(backup, latest)) {
      return {
        success: true,
        skipped: true,
        reason: 'dangerously_empty_backup_blocked',
        message: 'Snapshot atual está vazio. A cópia principal foi preservada.',
        attemptedSummary: backup.summary || {},
        latestSummary: latest?.summary || {},
        savedAt: now.toISOString()
      };
    }

    if (latest && looksLikeDataRegression(backup, latest, reason)) {
      return {
        success: true,
        skipped: true,
        reason: 'regressive_backup_blocked',
        message: 'Snapshot atual possui menos registros. A cópia principal não foi substituída.',
        attemptedSummary: backup.summary || {},
        latestSummary: latest?.summary || {},
        regression: regressionDetails(backup.summary || {}, latest.summary || {}),
        savedAt: now.toISOString()
      };
    }
  }

  const backupPath = `backups/${monthFolder(now)}/${backupFileName(config.prefix, now)}`;
  const latestPath = `latest/${config.prefix}-backup-latest.json`;
  const manifestPath = 'latest/manifest.json';

  const manifest = {
    success: true,
    type: 'void-arena-backup-manifest',
    savedAt: now.toISOString(),
    backupPath,
    latestPath,
    repo: config.repo,
    branch: config.branch,
    summary: backup.summary || {},
    reason
  };

  const backupContent = JSON.stringify({ ...backup, githubBackup: { savedAt: manifest.savedAt, path: backupPath, reason: manifest.reason } }, null, 2);
  await putGithubFile(config, backupPath, backupContent, `backup: save Void Arena database ${manifest.savedAt}`);
  await putGithubFile(config, latestPath, backupContent, 'backup: update latest Void Arena database');
  await putGithubFile(config, manifestPath, JSON.stringify(manifest, null, 2), 'backup: update latest manifest');
  return manifest;
}

async function fetchLatestBackupFromGitHub() {
  const config = requireConfig();
  const latestPath = `latest/${config.prefix}-backup-latest.json`;
  const file = await readGithubFile(config, latestPath);
  if (!file?.content) throw new Error(`Backup latest não encontrado em ${latestPath}.`);
  return JSON.parse(decodeBase64Utf8(file.content));
}

async function restoreLatestBackupFromGitHub(storage) {
  const backup = await fetchLatestBackupFromGitHub();
  const result = await storage.importDatabaseBackup(backup);
  return { success: true, restoredFromGithub: true, backupExportedAt: backup.exportedAt || null, summary: backup.summary || null, result };
}

function isEffectivelyEmpty(status = {}) {
  return REGRESSION_KEYS.reduce((sum, key) => sum + Number(status?.[key] || 0), 0) === 0 && Number(status.messages || 0) === 0 && Number(status.bracketSlots || 0) === 0;
}

async function autoRestoreLatestBackup(storage) {
  const config = getConfig();
  if (!config.autoRestore || !config.token || !config.repo) return { success: true, skipped: true, reason: 'auto_restore_disabled_or_not_configured' };
  const status = await storage.readDatabaseStatus();
  const latest = await fetchLatestBackupFromGitHub().catch(() => null);
  if (isEffectivelyEmpty(status)) return restoreLatestBackupFromGitHub(storage);
  return { success: true, skipped: true, reason: 'database_not_empty', status, latestSummary: latest?.summary || null, currentUsers: Number(status.users || 0), currentTeams: Number(status.teams || 0), latestTeams: Number(latest?.summary?.teams || 0) };
}

async function listGithubDirectory(config, dirPath) {
  const encodedPath = dirPath.split('/').map(encodeURIComponent).join('/');
  try {
    const data = await githubRequest(config, `/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`, { method: 'GET' });
    return Array.isArray(data) ? data : [];
  } catch (error) { if (error.status === 404) return []; throw error; }
}

async function findGithubBackupFile(config, targetPath) {
  const target = String(targetPath || '').trim();
  const targetName = target.split('/').pop();
  const monthDirs = await listGithubDirectory(config, 'backups');
  const sortedMonthDirs = monthDirs.filter((item) => item.type === 'dir').sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
  for (const dir of sortedMonthDirs) {
    const entries = await listGithubDirectory(config, dir.path);
    const found = entries.find((item) => item.type === 'file' && item.name.endsWith('.json') && (item.path === target || item.name === targetName));
    if (found) return found;
  }
  return null;
}

async function readGithubJsonFileBySha(config, fileInfo) {
  if (!fileInfo?.sha) throw new Error('Arquivo de backup encontrado, mas sem SHA.');
  const blob = await githubRequest(config, `/git/blobs/${fileInfo.sha}`, { method: 'GET' });
  if (!blob?.content) throw new Error(`Blob vazio para backup: ${fileInfo.path || fileInfo.name}`);
  return JSON.parse(decodeBase64Utf8(blob.content));
}

async function listBackupsFromGitHub(options = {}) {
  const config = requireConfig();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 25)));
  const monthDirs = await listGithubDirectory(config, 'backups');
  const files = [];
  const sortedMonthDirs = monthDirs.filter((item) => item.type === 'dir').sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''))).slice(0, 8);
  for (const dir of sortedMonthDirs) {
    const entries = await listGithubDirectory(config, dir.path);
    files.push(...entries.filter((item) => item.type === 'file' && item.name.endsWith('.json')));
  }
  const backups = [];
  for (const file of files.sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''))).slice(0, limit)) {
    const content = await fetchBackupFromGitHubPath(file.path).catch(() => null);
    if (!content) continue;
    backups.push({ path: file.path, name: file.name, savedAt: content.githubBackup?.savedAt || content.exportedAt || null, exportedAt: content.exportedAt || null, reason: content.githubBackup?.reason || '', summary: content.summary || {} });
  }
  return backups.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());
}

async function fetchBackupFromGitHubPath(filePath) {
  const config = requireConfig();
  const normalizedPath = String(filePath || '').trim();
  try {
    const file = await readGithubFile(config, normalizedPath);
    if (file?.content) return JSON.parse(decodeBase64Utf8(file.content));
  } catch (error) { console.warn(`⚠️ Backup não abriu pelo caminho exato (${normalizedPath}):`, error.message); }
  const found = await findGithubBackupFile(config, normalizedPath);
  if (!found) throw new Error(`Backup não encontrado: ${normalizedPath}`);
  return readGithubJsonFileBySha(config, found);
}

async function restoreBackupFromGitHubPath(storage, filePath) {
  const backup = await fetchBackupFromGitHubPath(filePath);
  const result = await storage.importDatabaseBackup(backup);
  return { success: true, restoredFromGithub: true, path: filePath, backupExportedAt: backup.exportedAt || null, result };
}

module.exports = { restoreBackupFromGitHubPath, fetchBackupFromGitHubPath, listBackupsFromGitHub, getConfig, saveBackupToGitHub, fetchLatestBackupFromGitHub, restoreLatestBackupFromGitHub, autoRestoreLatestBackup, regressionDetails, summaryWeight };
