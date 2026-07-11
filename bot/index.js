require('dotenv').config();

const { createDiscordClient, startDiscordBot } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const { startEventDmSync } = require('./eventDmSync');
const { installVoidArenaDirectMessageRoutes } = require('./patch-voidarena-direct-messages');
const { installAutoMutationBackup } = require('./autoMutationBackup');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const { runDeployDatabaseGuard } = require('../server/deployDatabaseGuard');
const { installTeamDeletionGuard } = require('../server/teamDeletionGuard');
const { recoverUsersAndTeamsFromBackup } = require('../server/usersTeamsBackupRecovery');

installTeamDeletionGuard(storage);
installAutoMutationBackup(storage, githubBackups);

const client = createDiscordClient();
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);

installVoidArenaDirectMessageRoutes({ client, storage });

function startScheduledBackups() {
  const enabled = String(process.env.GITHUB_BACKUP_SCHEDULED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('Backups automaticos agendados: desativados.');
    return null;
  }

  const minutes = Math.max(5, Number(process.env.GITHUB_BACKUP_INTERVAL_MINUTES || 15) || 15);
  const intervalMs = minutes * 60 * 1000;

  async function run(reason = 'scheduled-auto-backup') {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, { reason });
      if (manifest?.skipped) console.log(`Backup automatico pulado: ${manifest.reason || manifest.message || 'sem motivo'}`);
      else console.log(`Backup automatico salvo: ${manifest.backupPath || manifest.savedAt || 'ok'}`);
    } catch (error) {
      console.error('Backup automatico falhou:', error.message);
    }
  }

  setTimeout(() => run('post-boot-auto-backup'), 90 * 1000).unref?.();
  const timer = setInterval(() => run('scheduled-auto-backup'), intervalMs);
  timer.unref?.();
  console.log(`Backups automaticos agendados a cada ${minutes} min.`);
  return timer;
}

async function boot() {
  try {
    const guard = await runDeployDatabaseGuard(storage);
    console.log('Deploy Guard do banco:', guard?.reason || 'ok');
  } catch (error) {
    console.error('Deploy Guard do banco falhou:', error.message);
  }

  try {
    const recovery = await recoverUsersAndTeamsFromBackup(storage);
    if (recovery?.restored) console.log(`Recuperacao users/teams: ${recovery.restoredUsers} usuario(s), ${recovery.restoredTeams} time(s).`);
    else console.log(`Recuperacao users/teams pulada: ${recovery?.reason || 'sem motivo'}.`);
  } catch (error) {
    console.error('Recuperacao users/teams falhou:', error.message);
  }

  startInternalApi({ client, port: INTERNAL_API_PORT });
  startDiscordBot(client);
  startScheduledBackups();
  startEventDmSync(client, storage);
}

boot();

process.on('unhandledRejection', (error) => console.error('Erro nao tratado no bot:', error));
process.on('uncaughtException', (error) => console.error('Excecao nao tratada:', error));
