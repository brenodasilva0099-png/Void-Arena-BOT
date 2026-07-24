const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'githubBackups.js');
if (!fs.existsSync(file)) process.exit(0);

let src = fs.readFileSync(file, 'utf8');
let changed = false;

const oldConfig = `const DEFAULT_BRANCH = 'main';
const DEFAULT_BACKUP_REPO = 'brenodasilva0099-png/Void-Arena-BACKUPS';

function getConfig() {
  return {
    token: process.env.GITHUB_BACKUP_TOKEN || process.env.GITHUB_TOKEN || '',
    repo: process.env.GITHUB_BACKUP_REPO || DEFAULT_BACKUP_REPO,
    branch: process.env.GITHUB_BACKUP_BRANCH || DEFAULT_BRANCH,
    prefix: String(process.env.GITHUB_BACKUP_PREFIX || 'void-arena').replace(/[^\\w.-]+/g, '-'),
    autoRestore: String(process.env.GITHUB_BACKUP_AUTO_RESTORE || '').toLowerCase() === 'true'
  };
}`;

const newConfig = `const DEFAULT_BRANCH = 'main';
const DEFAULT_BACKUP_REPO = 'brenodasilva0099-png/Void-Arena-BACKUPS';

function cleanBackupToken(value = '') {
  let token = String(value || '').trim();
  token = token.replace(/^Bearer\\s+/i, '').trim();
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }
  return token;
}

function backupTokenCandidates() {
  return Array.from(new Set([
    process.env.GITHUB_BACKUP_TOKEN,
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN
  ].map(cleanBackupToken).filter(Boolean)));
}

function getConfig() {
  const tokens = backupTokenCandidates();
  return {
    token: tokens[0] || '',
    tokens,
    repo: process.env.GITHUB_BACKUP_REPO || DEFAULT_BACKUP_REPO,
    branch: process.env.GITHUB_BACKUP_BRANCH || DEFAULT_BRANCH,
    prefix: String(process.env.GITHUB_BACKUP_PREFIX || 'void-arena').replace(/[^\\w.-]+/g, '-'),
    autoRestore: String(process.env.GITHUB_BACKUP_AUTO_RESTORE || '').toLowerCase() === 'true'
  };
}`;

if (!src.includes('function backupTokenCandidates()')) {
  if (!src.includes(oldConfig)) throw new Error('Bloco de configuração do backup não encontrado para atualização segura.');
  src = src.replace(oldConfig, newConfig);
  changed = true;
}

const oldRequest = `async function githubRequest(config, pathname, options = {}) {
  const response = await fetch(\`https://api.github.com/repos/\${config.repo}\${pathname}\`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: \`Bearer \${config.token}\`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || \`GitHub API falhou (\${response.status})\`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}`;

const newRequest = `async function githubRequest(config, pathname, options = {}) {
  const tokens = Array.isArray(config.tokens) && config.tokens.length
    ? config.tokens
    : [cleanBackupToken(config.token)].filter(Boolean);

  if (!tokens.length) throw new Error('GITHUB_BACKUP_TOKEN/GITHUB_TOKEN não configurado.');

  let lastAuthError = null;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const response = await fetch(\`https://api.github.com/repos/\${config.repo}\${pathname}\`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: \`Bearer \${token}\`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;

    const error = new Error(data?.message || \`GitHub API falhou (\${response.status})\`);
    error.status = response.status;
    error.data = data;

    if ([401, 403].includes(response.status)) {
      lastAuthError = error;
      console.warn(\`[Backup] Credencial GitHub \${index + 1}/\${tokens.length} recusada; tentando próxima credencial disponível.\`);
      continue;
    }
    throw error;
  }

  const error = new Error('Credenciais do backup recusadas pelo GitHub. Gere um token válido com acesso ao repositório privado Void-Arena-BACKUPS.');
  error.status = lastAuthError?.status || 401;
  error.cause = lastAuthError;
  throw error;
}`;

if (!src.includes('Credenciais do backup recusadas pelo GitHub')) {
  if (!src.includes(oldRequest)) throw new Error('Função githubRequest não encontrada para atualização segura.');
  src = src.replace(oldRequest, newRequest);
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
new Function(fs.readFileSync(file, 'utf8'));
console.log(changed
  ? '[Backup/Auth] Tokens limpos e credenciais alternativas habilitadas sem expor segredos.'
  : '[Backup/Auth] Tratamento seguro de credenciais já estava aplicado.');