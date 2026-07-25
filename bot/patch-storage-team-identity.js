const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'storage.js');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
let changed = false;

const oldBlock = `async function saveTeam(team) {
  return updateDatabase((db) => {
    const index = db.teams.findIndex((item) => item.id === team.id);

    if (index >= 0) db.teams[index] = team;
    else db.teams.push(team);

    return team;
  });
}`;

const newBlock = `function normalizeTeamIdentityValue(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function teamLeadershipKeys(team = {}) {
  return new Set([
    team.ownerUserId, team.ownerDiscordId,
    team.directorUserId, team.directorDiscordId,
    team.captainUserId, team.captainDiscordId
  ].map((value) => String(value || '').trim()).filter(Boolean));
}

function teamsRepresentSameClub(left = {}, right = {}) {
  if (left.id && right.id && String(left.id) === String(right.id)) return true;
  const leftName = normalizeTeamIdentityValue(left.name || left.teamName);
  const rightName = normalizeTeamIdentityValue(right.name || right.teamName);
  const leftTag = normalizeTeamIdentityValue(left.tag);
  const rightTag = normalizeTeamIdentityValue(right.tag);
  const sameName = Boolean(leftName && rightName && leftName === rightName);
  const sameTag = Boolean(leftTag && rightTag && leftTag === rightTag);
  if (sameName && sameTag) return true;

  const leftLeaders = teamLeadershipKeys(left);
  const rightLeaders = teamLeadershipKeys(right);
  const leadershipOverlap = Array.from(leftLeaders).some((key) => rightLeaders.has(key));
  return leadershipOverlap && (sameName || sameTag);
}

function validStoredTeamImage(value = '') {
  if (value && typeof value === 'object') return validStoredTeamImage(value.url || value.src || value.href || value.data || value.base64 || '');
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\\/\\//i.test(raw) || /^\\/(assets|uploads|images|img|public)\\//i.test(raw)) return raw;
  const match = raw.match(/^data:image\\/(png|jpe?g|webp|gif|svg\\+xml);base64,([a-z0-9+/=]+)$/i);
  if (!match || match[2].length < 80 || match[2].length % 4 === 1) return '';
  try {
    return Buffer.from(match[2], 'base64').length >= 48 ? raw : '';
  } catch {
    return '';
  }
}

async function saveTeam(team) {
  return updateDatabase((db) => {
    db.teams = Array.isArray(db.teams) ? db.teams : [];
    const index = db.teams.findIndex((item) => teamsRepresentSameClub(item, team));

    if (index >= 0) {
      const current = db.teams[index] || {};
      const incomingLogo = validStoredTeamImage(team.logo || team.logoUrl || team.logoURL || team.teamLogo || team.badge || team.escudo || team.image || team.avatar || '');
      const currentLogo = validStoredTeamImage(current.logo || current.logoUrl || current.logoURL || current.teamLogo || current.badge || current.escudo || current.image || current.avatar || '');
      db.teams[index] = {
        ...current,
        ...team,
        id: current.id || team.id,
        logo: incomingLogo || currentLogo || '',
        updatedAt: team.updatedAt || new Date().toISOString()
      };
      return db.teams[index];
    }

    db.teams.push({ ...team, logo: validStoredTeamImage(team.logo || team.logoUrl || team.logoURL || team.teamLogo || team.badge || team.escudo || team.image || team.avatar || '') || '' });
    return db.teams[db.teams.length - 1];
  });
}`;

if (!source.includes('function teamsRepresentSameClub(left = {}, right = {})')) {
  if (!source.includes(oldBlock)) throw new Error('Bloco saveTeam esperado não foi encontrado.');
  source = source.replace(oldBlock, newBlock);
  changed = true;
}

fs.writeFileSync(file, source, 'utf8');
const finalSource = fs.readFileSync(file, 'utf8');
new Function(finalSource);
for (const marker of ['teamsRepresentSameClub', 'leadershipOverlap && (sameName || sameTag)', 'id: current.id || team.id', 'validStoredTeamImage']) {
  if (!finalSource.includes(marker)) throw new Error(`Proteção de identidade de time ausente: ${marker}`);
}
console.log(changed
  ? '[Teams/Identity] saveTeam agora reutiliza o registro canônico e rejeita logos armazenadas inválidas.'
  : '[Teams/Identity] Proteção contra duplicação de times já estava aplicada.');