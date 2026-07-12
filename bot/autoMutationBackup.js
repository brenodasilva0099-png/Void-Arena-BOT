const MUTATING_METHODS = [
  'saveUser',
  'saveTeam',
  'deleteTeam',
  'writeBracket',
  'saveTournamentEvent',
  'registerTeamInEvent',
  'writeTournamentSettings',
  'saveChatMessage',
  'updateChatMessage',
  'mergeChatMessageDiscordData',
  'writeChatBridgeSettings',
  'writeStatsBridgeSettings',
  'findOrCreateTeamChat',
  'findOrCreateDirectChat',
  'saveTeamChatMessage',
  'updateTeamChatMessage',
  'saveTrainingSubmission',
  'updateTrainingSubmissionStatus',
  'addTrainingSubmissionComment',
  'writeRolePermissions',
  'createEventRegistrationRequest',
  'attachValidationMessageToRegistrationRequest',
  'submitEventRegistrationProof',
  'approveEventRegistrationRequest',
  'rejectEventRegistrationRequest',
  'savePlayerApplication',
  'updatePlayerApplicationStatus',
  'addPlayerApplicationComment',
  'importDatabaseBackup'
];

function installAutoMutationBackup(storage, githubBackups, options = {}) {
  if (!storage || !githubBackups || storage.__voidArenaAutoMutationBackupInstalled) return storage;
  storage.__voidArenaAutoMutationBackupInstalled = true;

  const enabled = String(process.env.GITHUB_BACKUP_ON_MUTATION || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[Backup] Backup apos mutacao: desativado.');
    return storage;
  }

  const debounceMs = Math.max(1000, Number(process.env.GITHUB_BACKUP_ON_MUTATION_DEBOUNCE_MS || options.debounceMs || 2500) || 2500);
  let timer = null;
  let pendingReasons = new Set();
  let running = false;
  let rerunAfterCurrent = false;
  let lastFlush = Promise.resolve();

  async function flush(forceReason = '') {
    if (running) {
      rerunAfterCurrent = true;
      return lastFlush;
    }

    running = true;
    clearTimeout(timer);
    timer = null;
    const reasons = Array.from(pendingReasons);
    if (forceReason) reasons.push(forceReason);
    pendingReasons = new Set();

    lastFlush = (async () => {
      try {
        const reason = `mutation:${reasons.slice(-8).join(',') || 'unknown'}`;
        const manifest = await githubBackups.saveBackupToGitHub(storage, { reason });
        if (manifest?.skipped) {
          console.log(`[Backup] Snapshot pos-mutacao pulado: ${manifest.reason || manifest.message || 'sem motivo'}`);
        } else {
          console.log(`[Backup] Snapshot pos-mutacao salvo: ${manifest.backupPath || manifest.savedAt || 'ok'}`);
        }
        return manifest;
      } catch (error) {
        console.error('[Backup] Snapshot pos-mutacao falhou:', error.message);
        return { success: false, error: error.message };
      } finally {
        running = false;
        if (rerunAfterCurrent || pendingReasons.size) {
          rerunAfterCurrent = false;
          schedule('rerun');
        }
      }
    })();

    return lastFlush;
  }

  function schedule(reason = 'mutation') {
    pendingReasons.add(String(reason || 'mutation'));
    clearTimeout(timer);
    timer = setTimeout(() => flush(), debounceMs);
    timer.unref?.();
  }

  async function flushNow(reason = 'manual-flush') {
    pendingReasons.add(String(reason || 'manual-flush'));
    return flush(reason);
  }

  for (const method of MUTATING_METHODS) {
    if (typeof storage[method] !== 'function') continue;
    const original = storage[method].bind(storage);
    storage[method] = async (...args) => {
      const result = await original(...args);
      schedule(method);
      return result;
    };
  }

  storage.scheduleBackupAfterMutation = schedule;
  storage.flushBackupAfterMutation = flushNow;
  console.log(`[Backup] Backup automatico apos mutacoes ativo com debounce de ${debounceMs}ms.`);
  return storage;
}

module.exports = { installAutoMutationBackup };