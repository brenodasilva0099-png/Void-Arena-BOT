require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

const PROJECT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : PROJECT_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'abyss-tournament-db.json');
const AUTHORIZATION = '2026-07-25-user-approved-team-dedup-v1';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalize(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEmpty(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function mergePreferPrimary(primary, secondary) {
  if (isEmpty(primary)) return clone(secondary);
  if (Array.isArray(primary)) return primary.length ? clone(primary) : clone(Array.isArray(secondary) ? secondary : primary);
  if (!isPlainObject(primary) || !isPlainObject(secondary)) return clone(primary);
  const merged = clone(primary) || {};
  for (const [key, value] of Object.entries(secondary)) {
    if (!(key in merged) || isEmpty(merged[key])) merged[key] = clone(value);
    else if (isPlainObject(merged[key]) && isPlainObject(value)) merged[key] = mergePreferPrimary(merged[key], value);
  }
  return merged;
}

function leadershipKeys(team = {}) {
  return new Set([
    team.ownerUserId, team.ownerDiscordId,
    team.directorUserId, team.directorDiscordId,
    team.captainUserId, team.captainDiscordId
  ].map((value) => String(value || '').trim()).filter(Boolean));
}

function sameClub(left = {}, right = {}) {
  if (left.id && right.id && String(left.id) === String(right.id)) return true;
  const leftName = normalize(left.name || left.teamName);
  const rightName = normalize(right.name || right.teamName);
  const leftTag = normalize(left.tag);
  const rightTag = normalize(right.tag);
  const sameName = Boolean(leftName && rightName && leftName === rightName);
  const sameTag = Boolean(leftTag && rightTag && leftTag === rightTag);
  if (sameName && sameTag) return true;
  const leftLeaders = leadershipKeys(left);
  const rightLeaders = leadershipKeys(right);
  const leadershipOverlap = Array.from(leftLeaders).some((key) => rightLeaders.has(key));
  return leadershipOverlap && (sameName || sameTag);
}

function imageValue(team = {}) {
  const candidates = [team.logo, team.logoUrl, team.logoURL, team.teamLogo, team.teamLogoUrl, team.badge, team.badgeUrl, team.escudo, team.image, team.imageUrl, team.avatar, team.icon, team.logoOriginal];
  for (const value of candidates) {
    const valid = validImage(value);
    if (valid) return valid;
  }
  return '';
}

function validImage(value = '') {
  if (value && typeof value === 'object') return validImage(value.url || value.src || value.href || value.data || value.base64 || '');
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || /^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw;
  const match = raw.match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([a-z0-9+/=]+)$/i);
  if (!match || match[2].length < 80 || match[2].length % 4 === 1) return '';
  try {
    return Buffer.from(match[2], 'base64').length >= 48 ? raw : '';
  } catch {
    return '';
  }
}

function timestamp(team = {}) {
  const time = new Date(team.updatedAt || team.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function richness(team = {}) {
  const roster = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : []),
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : [])
  ].length;
  const fields = Object.values(team || {}).filter((value) => !isEmpty(value)).length;
  return roster * 100 + fields;
}

function choosePrimary(group = []) {
  return group.slice().sort((a, b) => {
    const timeDiff = timestamp(b) - timestamp(a);
    if (timeDiff) return timeDiff;
    const logoDiff = Number(Boolean(imageValue(b))) - Number(Boolean(imageValue(a)));
    if (logoDiff) return logoDiff;
    return richness(b) - richness(a);
  })[0] || null;
}

function chooseLogo(group = []) {
  const candidates = group
    .map((team) => ({ team, logo: imageValue(team) }))
    .filter((entry) => entry.logo)
    .sort((a, b) => timestamp(b.team) - timestamp(a.team) || b.logo.length - a.logo.length);
  return candidates[0]?.logo || '';
}

function remapIds(value, idMap) {
  if (typeof value === 'string') return idMap.get(value) || value;
  if (Array.isArray(value)) return value.map((item) => remapIds(item, idMap));
  if (!isPlainObject(value)) return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) output[key] = remapIds(item, idMap);
  return output;
}

function logoMeta(logo = '') {
  const raw = String(logo || '');
  const type = raw.startsWith('data:image/') ? 'data-uri' : raw.startsWith('http') ? 'url' : raw.startsWith('/') ? 'local' : raw ? 'other' : 'missing';
  return {
    type,
    length: raw.length,
    hash: raw ? crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12) : ''
  };
}

async function main() {
  console.log(`[Teams/Dedupe] Autorização explícita: ${AUTHORIZATION}`);
  let raw;
  try {
    raw = await fs.readFile(DB_FILE, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.log('[Teams/Dedupe] Banco ainda não existe; nenhuma alteração realizada.');
      return;
    }
    throw error;
  }

  const database = JSON.parse(raw || '{}');
  const teams = Array.isArray(database.teams) ? database.teams : [];
  const visited = new Set();
  const groups = [];

  for (let index = 0; index < teams.length; index += 1) {
    if (visited.has(index)) continue;
    const group = [teams[index]];
    visited.add(index);
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (let other = 0; other < teams.length; other += 1) {
        if (visited.has(other)) continue;
        if (group.some((member) => sameClub(member, teams[other]))) {
          group.push(teams[other]);
          visited.add(other);
          expanded = true;
        }
      }
    }
    groups.push(group);
  }

  const idMap = new Map();
  const deduped = [];
  const mergedGroups = [];

  for (const group of groups) {
    const primary = choosePrimary(group);
    if (!primary) continue;
    let merged = clone(primary);
    for (const item of group) {
      if (item === primary) continue;
      merged = mergePreferPrimary(merged, item);
    }
    const selectedLogo = chooseLogo(group);
    merged.logo = selectedLogo || '';
    merged.id = primary.id || merged.id;
    merged.updatedAt = primary.updatedAt || merged.updatedAt || new Date().toISOString();
    deduped.push(merged);

    if (group.length > 1) {
      const oldIds = group.map((item) => String(item.id || '')).filter(Boolean);
      oldIds.forEach((id) => { if (id !== merged.id) idMap.set(id, merged.id); });
      mergedGroups.push({
        keptId: merged.id || '',
        removedIds: oldIds.filter((id) => id !== merged.id),
        name: merged.name || merged.teamName || '',
        tag: merged.tag || '',
        logo: logoMeta(merged.logo)
      });
    }
  }

  let candidateDatabase = { ...database, teams: deduped };
  if (idMap.size) candidateDatabase = remapIds(candidateDatabase, idMap);
  const changed = JSON.stringify(database) !== JSON.stringify(candidateDatabase);
  let nextDatabase = candidateDatabase;

  if (changed) {
    nextDatabase = {
      ...candidateDatabase,
      meta: {
        ...(isPlainObject(candidateDatabase.meta) ? candidateDatabase.meta : {}),
        updatedAt: new Date().toISOString(),
        teamIdentityRepair: {
          authorization: AUTHORIZATION,
          repairedAt: new Date().toISOString(),
          before: teams.length,
          after: deduped.length,
          mergedGroups
        }
      }
    };

    await fs.mkdir(DATA_DIR, { recursive: true });
    const safety = path.join(DATA_DIR, `abyss-tournament-db.before-team-dedup-${Date.now()}.json`);
    await fs.writeFile(safety, raw, 'utf8');
    const temp = `${DB_FILE}.team-dedup.tmp`;
    await fs.writeFile(temp, JSON.stringify(nextDatabase, null, 2), 'utf8');
    await fs.rename(temp, DB_FILE);
    console.log(`[Teams/Dedupe] Estado anterior preservado em ${safety}.`);
  }

  const novaRage = deduped
    .filter((team) => /nova rage|new rage/i.test(normalize(team.name || team.teamName)) || normalize(team.tag) === 'nr')
    .map((team) => ({ id: team.id || '', name: team.name || team.teamName || '', tag: team.tag || '', updatedAt: team.updatedAt || null, logo: logoMeta(imageValue(team)) }));

  console.log('[Teams/Dedupe] Consolidação concluída.', {
    changed,
    before: teams.length,
    after: deduped.length,
    mergedGroups,
    novaRage
  });

  if (changed) {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, { reason: 'team-dedup-and-logo-validation-2026-07-25' });
      console.log('[Teams/Dedupe] Snapshot pós-correção salvo.', {
        skipped: Boolean(manifest?.skipped),
        path: manifest?.backupPath || manifest?.latestPath || null,
        reason: manifest?.reason || null
      });
    } catch (error) {
      console.error('[Teams/Dedupe] Banco corrigido, mas o snapshot pós-correção falhou:', error.message);
    }
  }
}

main().catch((error) => {
  console.error('[Teams/Dedupe] Falha fatal:', error.message);
  process.exitCode = 1;
});