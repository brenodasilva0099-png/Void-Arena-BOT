require('dotenv').config();

const CANONICAL_SITE_URL = 'https://hollownexus.com.br';
process.env.CANONICAL_SITE_URL = CANONICAL_SITE_URL;
process.env.PUBLIC_SITE_URL = CANONICAL_SITE_URL;
process.env.SITE_PUBLIC_URL = CANONICAL_SITE_URL;
process.env.SITE_URL = CANONICAL_SITE_URL;
process.env.APP_URL = CANONICAL_SITE_URL;
process.env.FRONTEND_URL = CANONICAL_SITE_URL;

const { createDiscordClient, startDiscordBot, registerDiscordHandlers } = require('./discordClient');
const { startInternalApi } = require('./internalApi');
const { startEventDmSync } = require('./eventDmSync');
const { installVoidArenaDirectMessageRoutes } = require('./patch-voidarena-direct-messages');
const { installAutoMutationBackup } = require('./autoMutationBackup');
const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const { installTeamDeletionGuard } = require('../server/teamDeletionGuard');

installTeamDeletionGuard(storage);
installAutoMutationBackup(storage, githubBackups);

const client = createDiscordClient();
registerDiscordHandlers(client);
const INTERNAL_API_PORT = Number(process.env.BOT_API_PORT || process.env.PORT || 3002);
const DISCORD_RETRY_DELAYS_MS = [0, 4_000, 10_000, 20_000, 40_000, 60_000];

installVoidArenaDirectMessageRoutes({ client, storage });

let internalApiServer = null;
let scheduledBackupTimer = null;
let discordWatchdogTimer = null;
let discordConnectPromise = null;
let lastDiscordError = '';

function ensureInternalApiStarted() {
  if (internalApiServer) return internalApiServer;
  internalApiServer = startInternalApi({ client, port: INTERNAL_API_PORT });
  return internalApiServer;
}

function tokenDiagnostic(error = null) {
  const configured = Boolean(String(process.env.DISCORD_TOKEN || '').trim());
  const message = String(error?.message || lastDiscordError || '').trim();
  const invalid = /invalid token|token.*invalid|incorrect login|401/i.test(message);
  return { configured, invalid, message };
}

async function connectDiscordWithRetry({ reason = 'boot', attempts = DISCORD_RETRY_DELAYS_MS.length } = {}) {
  if (client.isReady?.()) return true;
  if (discordConnectPromise) return discordConnectPromise;

  discordConnectPromise = (async () => {
    const diagnostic = tokenDiagnostic();
    console.log('[Discord/Connection] Preparando conexão.', {
      reason,
      tokenConfigured: diagnostic.configured,
      ready: Boolean(client.isReady?.())
    });

    if (!diagnostic.configured) {
      lastDiscordError = 'DISCORD_TOKEN não configurado no Render.';
      console.error('[Discord/Connection] DISCORD_TOKEN ausente. O serviço web ficará online, mas o BOT continuará offline no Discord.');
      return false;
    }

    const totalAttempts = Math.max(1, Math.min(attempts, DISCORD_RETRY_DELAYS_MS.length));
    for (let index = 0; index < totalAttempts; index += 1) {
      const delay = DISCORD_RETRY_DELAYS_MS[index] || 0;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (client.isReady?.()) return true;

      try {
        console.log(`[Discord/Connection] Tentativa ${index + 1}/${totalAttempts} (${reason}).`);
        await startDiscordBot(client);
        if (client.isReady?.()) {
          lastDiscordError = '';
          console.log('[Discord/Connection] BOT conectado e pronto no Discord.', {
            user: client.user?.tag || client.user?.id || 'desconhecido',
            guilds: client.guilds?.cache?.size || 0
          });
          return true;
        }
      } catch (error) {
        lastDiscordError = String(error?.message || error || 'Falha desconhecida');
        const current = tokenDiagnostic(error);
        console.error('[Discord/Connection] Falha de login.', {
          attempt: index + 1,
          tokenConfigured: current.configured,
          tokenRejected: current.invalid,
          message: current.message
        });
        if (current.invalid) break;
      }
    }

    const finalDiagnostic = tokenDiagnostic();
    console.error('[Discord/Connection] BOT permaneceu offline.', {
      tokenConfigured: finalDiagnostic.configured,
      tokenRejected: finalDiagnostic.invalid,
      message: finalDiagnostic.message || 'Discord não confirmou conexão.'
    });
    return false;
  })().finally(() => {
    discordConnectPromise = null;
  });

  return discordConnectPromise;
}

function startDiscordWatchdog() {
  if (discordWatchdogTimer) return discordWatchdogTimer;
  discordWatchdogTimer = setInterval(() => {
    if (client.isReady?.() || discordConnectPromise) return;
    connectDiscordWithRetry({ reason: 'watchdog', attempts: 2 }).catch((error) => {
      lastDiscordError = String(error?.message || error || 'Falha no watchdog');
      console.error('[Discord/Connection] Watchdog falhou:', lastDiscordError);
    });
  }, 30_000);
  discordWatchdogTimer.unref?.();
  console.log('[Discord/Connection] Watchdog de reconexão ativo a cada 30s.');
  return discordWatchdogTimer;
}

function startScheduledBackups() {
  if (scheduledBackupTimer) return scheduledBackupTimer;
  const enabled = String(process.env.GITHUB_BACKUP_SCHEDULED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[Backup] Backups automáticos agendados desativados.');
    return null;
  }

  const minutes = Math.max(5, Number(process.env.GITHUB_BACKUP_INTERVAL_MINUTES || 15) || 15);
  const intervalMs = minutes * 60 * 1000;

  async function run(reason = 'scheduled-auto-backup') {
    try {
      const manifest = await githubBackups.saveBackupToGitHub(storage, { reason });
      if (manifest?.skipped) {
        console.log(`[Backup] Snapshot não publicado: ${manifest.reason || manifest.message || 'proteção contra regressão'}`);
      } else {
        console.log(`[Backup] Snapshot salvo: ${manifest.backupPath || manifest.savedAt || 'ok'}`);
      }
    } catch (error) {
      console.error('[Backup] Falha ao salvar snapshot:', error.message);
    }
  }

  scheduledBackupTimer = setInterval(() => run('scheduled-auto-backup'), intervalMs);
  scheduledBackupTimer.unref?.();
  console.log(`[Backup] Agendado a cada ${minutes} min, com proteção contra regressão.`);
  return scheduledBackupTimer;
}

async function gracefulShutdown(signal) {
  console.log(`[BOT] ${signal} recebido. Encerrando sem importar, fundir ou reescrever registros.`);
  try {
    if (discordWatchdogTimer) clearInterval(discordWatchdogTimer);
    if (typeof storage.flushBackupAfterMutation === 'function') {
      await storage.flushBackupAfterMutation(`shutdown-${signal}`);
    }
  } catch (error) {
    console.error('[Backup] Falha ao concluir backup pendente no encerramento:', error.message);
  } finally {
    process.exit(0);
  }
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

async function boot() {
  console.log(`[Domain] BOT usando o domínio oficial do SITE: ${CANONICAL_SITE_URL}`);
  ensureInternalApiStarted();

  const status = await storage.readDatabaseStatus().catch((error) => ({ error: error.message }));
  console.log('[Banco] Boot somente leitura; nenhuma restauração, merge ou remapeamento automático foi executado.', status);

  await connectDiscordWithRetry({ reason: 'boot' });
  startDiscordWatchdog();
  startScheduledBackups();
  startEventDmSync(client, storage);
}

boot().catch((error) => {
  console.error('Falha fatal ao iniciar o BOT:', error);
  process.exitCode = 1;
});

process.on('unhandledRejection', (error) => console.error('Erro não tratado no bot:', error));
process.on('uncaughtException', (error) => console.error('Exceção não tratada:', error));
