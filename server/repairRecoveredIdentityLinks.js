const githubBackups = require('./githubBackups');
const { parseBackupDatabase } = require('./usersTeamsBackupRecovery');

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function mergeFillMissing(current = {}, recovered = {}) {
  if (Array.isArray(current) || Array.isArray(recovered)) {
    const values = [...(Array.isArray(current) ? current : []), ...(Array.isArray(recovered) ? recovered : [])];
    const seen = new Set();
    return values.filter((item) => {
      const key = isObject(item) ? JSON.stringify(item) : String(item ?? '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (!isObject(current) && !isObject(recovered)) {
    return hasValue(current) ? current : recovered;
  }

  const output = { ...(isObject(recovered) ? recovered : {}), ...(isObject(current) ? current : {}) };
  const keys = new Set([...Object.keys(recovered || {}), ...Object.keys(current || {})]);

  keys.forEach((key) => {
    const currentValue = current?.[key];
    const recoveredValue = recovered?.[key];
    if (Array.isArray(currentValue) || Array.isArray(recoveredValue)) {
      output[key] = mergeFillMissing(currentValue, recoveredValue);
    } else if (isObject(currentValue) || isObject(recoveredValue)) {
      output[key] = mergeFillMissing(currentValue || {}, recoveredValue || {});
    } else {
      output[key] = hasValue(currentValue) ? currentValue : recoveredValue;
    }
  });

  return output;
}

function discordIdOf(user = {}) {
  return String(user.discordId || user.discord?.id || '').trim();
}

function shouldRemapKey(key = '') {
  return key === 'userId' || key.endsWith('UserId') || [
    'ownerId',
    'captainId',
    'directorId',
    'responsibleId',
    'createdBy',
    'updatedBy'
  ].includes(key);
}

function remapReferences(value, idMap, parentKey = '') {
  if (Array.isArray(value)) return value.map((item) => remapReferences(item, idMap, parentKey));
  if (!isObject(value)) {
    if (typeof value === 'string' && shouldRemapKey(parentKey) && idMap.has(value)) return idMap.get(value);
    return value;
  }

  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === 'string' && shouldRemapKey(key) && idMap.has(item)) {
      output[key] = idMap.get(item);
    } else {
      output[key] = remapReferences(item, idMap, key);
    }
  });
  return output;
}

async function repairRecoveredIdentityLinks(storage) {
  const config = githubBackups.getConfig();
  if (!config.token) {
    return { success: false, skipped: true, retryRequired: true, reason: 'github_backup_token_missing' };
  }

  const [currentBackup, latestBackup] = await Promise.all([
    storage.exportDatabaseBackup(),
    githubBackups.fetchLatestBackupFromGitHub()
  ]);
  const currentDatabase = parseBackupDatabase(currentBackup) || {};
  const recoveredDatabase = parseBackupDatabase(latestBackup) || {};
  const currentUsers = Array.isArray(currentDatabase.users) ? currentDatabase.users : [];
  const recoveredUsers = Array.isArray(recoveredDatabase.users) ? recoveredDatabase.users : [];
  const recoveredByDiscord = new Map(
    recoveredUsers.map((user) => [discordIdOf(user), user]).filter(([discordId]) => discordId)
  );

  const idMap = new Map();
  let mergedProfiles = 0;

  const users = currentUsers.map((currentUser) => {
    const discordId = discordIdOf(currentUser);
    const recoveredUser = discordId ? recoveredByDiscord.get(discordId) : null;
    if (!recoveredUser) return currentUser;

    const currentId = String(currentUser.id || '').trim();
    const recoveredId = String(recoveredUser.id || '').trim();
    if (currentId && recoveredId && currentId !== recoveredId) idMap.set(recoveredId, currentId);

    const merged = mergeFillMissing(currentUser, recoveredUser);
    merged.id = currentUser.id || recoveredUser.id;
    merged.discordId = currentUser.discordId || recoveredUser.discordId || discordId;
    merged.provider = currentUser.provider || recoveredUser.provider || 'discord';
    merged.createdAt = recoveredUser.createdAt || currentUser.createdAt;
    merged.updatedAt = currentUser.updatedAt || recoveredUser.updatedAt || new Date().toISOString();

    if (JSON.stringify(merged) !== JSON.stringify(currentUser)) mergedProfiles += 1;
    return merged;
  });

  let nextDatabase = { ...currentDatabase, users };
  if (idMap.size) nextDatabase = remapReferences(nextDatabase, idMap);

  const changed = mergedProfiles > 0 || idMap.size > 0;
  if (!changed) {
    return {
      success: true,
      skipped: true,
      reason: 'identity_links_already_consistent',
      mergedProfiles: 0,
      remappedUserIds: 0
    };
  }

  nextDatabase.meta = {
    ...(nextDatabase.meta || {}),
    recoveredIdentityLinksAt: new Date().toISOString(),
    recoveredIdentityLinksPolicy: 'keep-current-session-id-fill-profile-and-remap-old-user-references'
  };

  const imported = await storage.importDatabaseBackup({
    type: 'void-arena-database-backup',
    version: 1,
    allowRegisteredDataRestore: true,
    database: nextDatabase,
    exportedAt: new Date().toISOString(),
    meta: nextDatabase.meta
  });

  return {
    success: true,
    repaired: true,
    reason: 'recovered_profiles_and_user_references_relinked',
    mergedProfiles,
    remappedUserIds: idMap.size,
    imported
  };
}

module.exports = { repairRecoveredIdentityLinks, mergeFillMissing, remapReferences };
