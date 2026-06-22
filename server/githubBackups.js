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

function encodeBase64Utf8(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function decodeBase64Utf8(value) {
  return Buffer.from(String(value || ''), 'base64').toString('utf8');
}

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
    const message = data?.message || `GitHub API falhou (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function readGithubFile(config, filePath) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');

  try {
    return await githubRequest(config, `/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`, {
      method: 'GET'
    });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function putGithubFile(config, filePath, content, message) {
  const existing = await readGithubFile(config, filePath);
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');

  return githubRequest(config, `/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      branch: config.branch,
      content: encodeBase64Utf8(content),
      ...(existing?.sha ? { sha: existing.sha } : {})
    })
  });
}

function monthFolder(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function backupFileName(prefix, date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  return `${prefix}-backup-${stamp}.json`;
}

async function saveBackupToGitHub(storage, options = {}) {
  const config = requireConfig();
  const backup = await storage.exportDatabaseBackup();
  const now = new Date();

  if (!options.force) {
    const nextTeams = Number(backup.summary?.teams || 0);
    const nextUsers = Number(backup.summary?.users || 0);

    const latest = await fetchLatestBackupFromGitHub().catch(() => null);
    const latestTeams = Number(latest?.summary?.teams || 0);
    const latestUsers = Number(latest?.summary?.users || 0);

    if (nextTeams < latestTeams && latestTeams > 0) {
      return {
        success: true,
        skipped: true,
        reason: 'empty_backup_blocked',
        message: 'Backup atual tem 0 times e o latest do GitHub tem times. Não vou sobrescrever backup bom com banco vazio.',
        attemptedSummary: backup.summary || {},
        latestSummary: latest?.summary || {},
        savedAt: now.toISOString()
      };
    }

    if (nextTeams === 0 && nextUsers <= latestUsers && latestTeams > 0) {
      return {
        success: true,
        skipped: true,
        reason: 'unsafe_backup_blocked',
        message: 'Backup atual parece incompleto. Latest preservado.',
        attemptedSummary: backup.summary || {},
        latestSummary: latest?.summary || {},
        savedAt: now.toISOString()
      };
    }
  }

  const backupPath = `backups/${monthFolder(now)}/${backupFileName(config.prefix, now)}`;
  const latestPath = `latest/${config.prefix}-backup-latest.json`;
  const manifestPath = `latest/manifest.json`;

  const manifest = {
    success: true,
    type: 'void-arena-backup-manifest',
    savedAt: now.toISOString(),
    backupPath,
    latestPath,
    repo: config.repo,
    branch: config.branch,
    summary: backup.summary || {},
    reason: options.reason || 'manual'
  };

  const backupContent = JSON.stringify({
    ...backup,
    githubBackup: {
      savedAt: manifest.savedAt,
      path: backupPath,
      reason: manifest.reason
    }
  }, null, 2);

  await putGithubFile(
    config,
    backupPath,
    backupContent,
    `backup: save Void Arena database ${manifest.savedAt}`
  );

  await putGithubFile(
    config,
    latestPath,
    backupContent,
    `backup: update latest Void Arena database`
  );

  await putGithubFile(
    config,
    manifestPath,
    JSON.stringify(manifest, null, 2),
    `backup: update latest manifest`
  );

  return manifest;
}

async function fetchLatestBackupFromGitHub() {
  const config = requireConfig();
  const latestPath = `latest/${config.prefix}-backup-latest.json`;
  const file = await readGithubFile(config, latestPath);

  if (!file?.content) {
    throw new Error(`Backup latest não encontrado em ${latestPath}.`);
  }

  return JSON.parse(decodeBase64Utf8(file.content));
}

async function restoreLatestBackupFromGitHub(storage) {
  const backup = await fetchLatestBackupFromGitHub();
  const result = await storage.importDatabaseBackup(backup);

  return {
    success: true,
    restoredFromGithub: true,
    backupExportedAt: backup.exportedAt || null,
    result
  };
}

function isEffectivelyEmpty(status = {}) {
  return (
    Number(status.users || 0) === 0 &&
    Number(status.teams || 0) === 0 &&
    Number(status.messages || 0) === 0 &&
    Number(status.teamChats || 0) === 0 &&
    Number(status.bracketSlots || 0) === 0
  );
}

async function autoRestoreLatestBackup(storage) {
  const config = getConfig();
  if (!config.autoRestore || !config.token || !config.repo) {
    return { success: true, skipped: true, reason: 'auto_restore_disabled_or_not_configured' };
  }

  const status = await storage.readDatabaseStatus();
  const latest = await fetchLatestBackupFromGitHub().catch(() => null);

  const currentTeams = Number(status.teams || 0);
  const currentUsers = Number(status.users || 0);
  const latestTeams = Number(latest?.summary?.teams || 0);

  if (isEffectivelyEmpty(status)) {
    return restoreLatestBackupFromGitHub(storage);
  }

  if (latestTeams > currentTeams) {
    return restoreLatestBackupFromGitHub(storage);
  }

  return {
    success: true,
    skipped: true,
    reason: 'database_not_empty',
    status,
    latestSummary: latest?.summary || null,
    currentUsers,
    currentTeams,
    latestTeams
  };
}


async function listGithubDirectory(config, dirPath) {
  const encodedPath = dirPath.split('/').map(encodeURIComponent).join('/');

  try {
    const data = await githubRequest(config, `/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`, {
      method: 'GET'
    });

    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
}

async function listBackupsFromGitHub(options = {}) {
  const config = requireConfig();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 25)));
  const monthDirs = await listGithubDirectory(config, 'backups');

  const files = [];

  const sortedMonthDirs = monthDirs
    .filter((item) => item.type === 'dir')
    .sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')))
    .slice(0, 8);

  for (const dir of sortedMonthDirs) {
    const entries = await listGithubDirectory(config, dir.path);
    files.push(...entries.filter((item) => item.type === 'file' && item.name.endsWith('.json')));
  }

  const sortedFiles = files
    .sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')))
    .slice(0, limit);

  const backups = [];

  for (const file of sortedFiles) {
    const content = await fetchBackupFromGitHubPath(file.path).catch(() => null);
    if (!content) continue;

    backups.push({
      path: file.path,
      name: file.name,
      savedAt: content.githubBackup?.savedAt || content.exportedAt || null,
      exportedAt: content.exportedAt || null,
      reason: content.githubBackup?.reason || '',
      summary: content.summary || {}
    });
  }

  return backups.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());
}

async function fetchBackupFromGitHubPath(filePath) {
  const config = requireConfig();
  const file = await readGithubFile(config, filePath);

  if (!file?.content) {
    throw new Error(`Backup não encontrado: ${filePath}`);
  }

  return JSON.parse(decodeBase64Utf8(file.content));
}

async function restoreBackupFromGitHubPath(storage, filePath) {
  const backup = await fetchBackupFromGitHubPath(filePath);
  const result = await storage.importDatabaseBackup(backup);

  return {
    success: true,
    restoredFromGithub: true,
    path: filePath,
    backupExportedAt: backup.exportedAt || null,
    result
  };
}

module.exports = {
  restoreBackupFromGitHubPath,
  fetchBackupFromGitHubPath,
  listBackupsFromGitHub,
  getConfig,
  saveBackupToGitHub,
  fetchLatestBackupFromGitHub,
  restoreLatestBackupFromGitHub,
  autoRestoreLatestBackup
};
