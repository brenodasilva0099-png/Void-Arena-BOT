require('dotenv').config();

const zlib = require('node:zlib');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

const AUTHORIZATION = '2026-07-25-user-approved-recover-skzada-v1';
const TARGET_NAME = 'skzada';
const TARGET_DATE_PREFIX = '2026-07-24';
const TARGET_PRIMARY = 'goleiro';
const TARGET_SECONDARY = 'goleiro';
const TARGET_STYLE = 'defensivo';

function clean(value = '') {
  return String(value || '').trim();
}

function lower(value = '') {
  return clean(value).toLowerCase();
}

function decodeBackupDatabase(backup = {}) {
  if (backup?.type === 'void-arena-database-backup' && backup?.format === 'gzip-base64-json' && backup?.database) {
    return JSON.parse(zlib.gunzipSync(Buffer.from(String(backup.database), 'base64')).toString('utf8'));
  }
  if (backup?.database && typeof backup.database === 'object') return backup.database;
  return backup && typeof backup === 'object' ? backup : {};
}

function matchesTarget(application = {}) {
  const names = [application.userName, application.name, application.discordTag].map(lower);
  if (!names.some((name) => name === TARGET_NAME || name.startsWith(`${TARGET_NAME}#`))) return false;
  if (lower(application.primaryPosition) !== TARGET_PRIMARY) return false;
  if (lower(application.secondaryPosition) !== TARGET_SECONDARY) return false;
  if (lower(application.playStyle) !== TARGET_STYLE) return false;
  const createdAt = clean(application.createdAt);
  return !createdAt || createdAt.startsWith(TARGET_DATE_PREFIX);
}

function isComplete(application = {}) {
  return [
    'realNameSteamCode',
    'age',
    'primaryPosition',
    'secondaryPosition',
    'playStyle',
    'experienceHours',
    'availability',
    'strengths',
    'weaknesses',
    'reason'
  ].every((key) => clean(application[key]));
}

function scoreCandidate(application = {}) {
  let score = isComplete(application) ? 1000 : 0;
  if (lower(application.source) === 'site') score += 100;
  if (clean(application.discordId)) score += 30;
  if (clean(application.userId)) score += 20;
  if (clean(application.createdAt).startsWith(TARGET_DATE_PREFIX)) score += 50;
  score += Math.min(20, Object.values(application).filter((value) => clean(value)).length);
  return score;
}

async function findInBackups() {
  const refs = [];
  try {
    refs.push({ path: 'latest/void-arena-backup-latest.json', isLatest: true });
  } catch {}

  const historical = await githubBackups.listBackupsFromGitHub({ limit: 100 }).catch((error) => {
    console.warn('[Formularios/Recovery] Histórico de backups indisponível:', error.message);
    return [];
  });
  refs.push(...historical);

  const seen = new Set();
  const matches = [];
  for (const ref of refs) {
    const path = clean(ref.path || ref.backupPath);
    if (!path || seen.has(path)) continue;
    seen.add(path);

    const backup = await githubBackups.fetchBackupFromGitHubPath(path).catch((error) => {
      console.warn(`[Formularios/Recovery] Snapshot ignorado (${path}):`, error.message);
      return null;
    });
    if (!backup) continue;

    let database = null;
    try {
      database = decodeBackupDatabase(backup);
    } catch (error) {
      console.warn(`[Formularios/Recovery] Snapshot inválido (${path}):`, error.message);
      continue;
    }

    const applications = Array.isArray(database?.playerApplications) ? database.playerApplications : [];
    for (const application of applications.filter(matchesTarget)) {
      matches.push({
        application,
        path,
        exportedAt: backup.exportedAt || null,
        score: scoreCandidate(application)
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score || new Date(b.application.createdAt || 0) - new Date(a.application.createdAt || 0))[0] || null;
}

function parseApplicationEmbed(message = {}) {
  const embeds = Array.isArray(message.embeds) ? message.embeds : [];
  for (const embed of embeds) {
    const title = clean(embed.title);
    const description = clean(embed.description);
    if (!/nova inscri[cç][aã]o hollow nexus/i.test(title)) continue;
    if (!/\*\*Jogador:\*\*\s*SKzada\b/i.test(description)) continue;

    const player = description.match(/\*\*Jogador:\*\*\s*([^\n]+)/i)?.[1]?.trim() || 'SKzada';
    const positions = description.match(/\*\*Posi[cç][aã]o:\*\*\s*([^\n/]+)\s*\/\s*([^\n]+)/i);
    const style = description.match(/\*\*Estilo:\*\*\s*([^\n]+)/i)?.[1]?.trim() || 'Defensivo';
    const source = description.match(/\*\*Origem:\*\*\s*([^\n]+)/i)?.[1]?.trim() || 'site';

    return {
      message,
      application: {
        source: lower(source) === 'discord' ? 'discord' : 'site',
        userName: player,
        primaryPosition: positions?.[1]?.trim() || 'Goleiro',
        secondaryPosition: positions?.[2]?.trim() || 'Goleiro',
        playStyle: style,
        status: 'pending',
        notes: 'Recuperação parcial: o histórico do Discord comprovou nome, posições, estilo, origem e horário; as respostas textuais completas não estavam disponíveis.',
        createdAt: message.timestamp || new Date().toISOString(),
        updatedAt: message.edited_timestamp || message.timestamp || new Date().toISOString(),
        recovery: {
          mode: 'partial-from-discord-log',
          incomplete: true,
          source: 'Discord application log',
          note: 'Solicite ao jogador que confirme ou reenvie os campos não recuperados.',
          discordMessageId: clean(message.id),
          discordChannelId: clean(message.channel_id),
          recoveredAt: new Date().toISOString()
        }
      }
    };
  }
  return null;
}

async function discordRequest(pathname) {
  const token = clean(process.env.DISCORD_TOKEN);
  if (!token) throw new Error('DISCORD_TOKEN não configurado para consultar o histórico.');
  const response = await fetch(`https://discord.com/api/v10${pathname}`, {
    headers: { Authorization: `Bot ${token}` }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Discord API falhou (${response.status}).`);
  return data;
}

async function resolveApplicationLogChannelId() {
  const configured = clean(process.env.APPLICATION_LOG_CHANNEL_ID || process.env.TRAINING_LOG_CHANNEL_ID);
  if (configured) return configured;

  const guilds = await discordRequest('/users/@me/guilds');
  for (const guild of Array.isArray(guilds) ? guilds : []) {
    const channels = await discordRequest(`/guilds/${encodeURIComponent(guild.id)}/channels`).catch(() => []);
    const candidate = (Array.isArray(channels) ? channels : []).find((channel) => {
      const name = lower(channel.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return [0, 5].includes(Number(channel.type)) && (name.includes('formulario') || name.includes('inscricao'));
    });
    if (candidate?.id) return candidate.id;
  }
  return '';
}

async function findInDiscordHistory() {
  const channelId = await resolveApplicationLogChannelId();
  if (!channelId) return null;
  const messages = await discordRequest(`/channels/${encodeURIComponent(channelId)}/messages?limit=100`);
  for (const message of Array.isArray(messages) ? messages : []) {
    const parsed = parseApplicationEmbed(message);
    if (parsed) return parsed;
  }
  return null;
}

async function publishRecoveryBackup() {
  const manifest = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'approved-recovery:player-application-SKzada'
  });
  if (manifest?.skipped) throw new Error(`Backup da recuperação foi bloqueado: ${manifest.reason || manifest.message}`);
  return manifest;
}

async function main() {
  console.log(`[Formularios/Recovery] Autorização explícita: ${AUTHORIZATION}`);

  const current = await storage.readPlayerApplications({ limit: 500 });
  const existing = current.find(matchesTarget);
  if (existing) {
    console.log('[Formularios/Recovery] Inscrição do SKzada já está no banco; nenhuma alteração realizada.', {
      id: existing.id,
      recovery: existing.recovery?.mode || null
    });
    return;
  }

  const backupMatch = await findInBackups();
  if (backupMatch?.application && isComplete(backupMatch.application)) {
    const result = await storage.recoverPlayerApplication({
      ...backupMatch.application,
      recovery: {
        mode: 'full-from-github-backup',
        incomplete: false,
        source: backupMatch.path,
        note: `Registro completo recuperado do snapshot exportado em ${backupMatch.exportedAt || 'data desconhecida'}.`,
        recoveredAt: new Date().toISOString()
      }
    });
    const manifest = await publishRecoveryBackup();
    console.log('[Formularios/Recovery] Inscrição completa do SKzada restaurada.', {
      id: result.application.id,
      alreadyPresent: result.alreadyPresent,
      source: backupMatch.path,
      backupPath: manifest.backupPath
    });
    return;
  }

  const discordMatch = await findInDiscordHistory();
  if (!discordMatch?.application) {
    console.warn('[Formularios/Recovery] Nenhum registro completo em backup e nenhum log do SKzada encontrado no Discord. Banco não alterado.');
    return;
  }

  const result = await storage.recoverPlayerApplication(discordMatch.application);
  const manifest = await publishRecoveryBackup();
  console.log('[Formularios/Recovery] Inscrição parcial do SKzada recuperada a partir do histórico do Discord.', {
    id: result.application.id,
    alreadyPresent: result.alreadyPresent,
    discordMessageId: result.application.recovery?.discordMessageId || null,
    backupPath: manifest.backupPath
  });
}

main().catch((error) => {
  console.error('[Formularios/Recovery] Falha fatal:', error.message);
  process.exitCode = 1;
});