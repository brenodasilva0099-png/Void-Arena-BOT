require('dotenv').config();

const storage = require('../server/storage');

const AUTHORIZATION = '2026-07-29-user-requested-the-creator-and-hollow-roster-cleanup-v1';
const THE_CREATOR_ID = 'team_1783131181080_5566b289';
const HOLLOW_NEXUS_ID = 'team_1783217744017_e57daeeb';
const PLAYER_USER_ID = '6c727eb4-11c4-4975-b352-79064be4e0f5';
const PLAYER_DISPLAY_NAME = '❆𝐩𝓱ᵢzₓ֍';

function clean(value = '') {
  return String(value || '').trim();
}

function comparable(value = '') {
  return clean(value)
    .normalize('NFKD')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function userDisplayNames(user = {}) {
  return [
    user.name,
    user.username,
    user.profile?.username,
    user.profile?.displayName,
    PLAYER_DISPLAY_NAME
  ].map(clean).filter(Boolean);
}

function removePlayerFromRoster(team = {}, targetUser = {}) {
  const targetIds = new Set([
    PLAYER_USER_ID,
    targetUser.id,
    targetUser.discordId
  ].map(clean).filter(Boolean));
  const targetNames = new Set(userDisplayNames(targetUser).map(comparable).filter(Boolean));
  const next = {
    ...team,
    playerAccounts: { ...(team.playerAccounts || {}) }
  };
  const removed = [];

  function matches(values = []) {
    return values.some((value) => {
      const raw = clean(value);
      if (!raw) return false;
      return targetIds.has(raw) || targetNames.has(comparable(raw));
    });
  }

  function filterSlot(detailKey, namesKey, accountKey) {
    const details = Array.isArray(team[detailKey]) ? team[detailKey] : [];
    const names = Array.isArray(team[namesKey]) ? team[namesKey] : [];
    const accounts = Array.isArray(team.playerAccounts?.[accountKey])
      ? team.playerAccounts[accountKey]
      : [];
    const length = Math.max(details.length, names.length, accounts.length);
    const keepIndexes = [];

    for (let index = 0; index < length; index += 1) {
      const detail = details[index] && typeof details[index] === 'object'
        ? details[index]
        : {};
      const values = [
        detail.id,
        detail.userId,
        detail.discordId,
        detail.account,
        detail.name,
        detail.playerName,
        names[index],
        accounts[index]
      ];
      if (matches(values)) {
        removed.push({
          slot: accountKey,
          id: clean(detail.userId || detail.id || PLAYER_USER_ID),
          discordId: clean(detail.discordId || accounts[index]),
          name: clean(detail.name || detail.playerName || names[index] || PLAYER_DISPLAY_NAME)
        });
      } else {
        keepIndexes.push(index);
      }
    }

    next[detailKey] = keepIndexes.map((index) => details[index]).filter((item) => item !== undefined);
    next[namesKey] = keepIndexes.map((index) => names[index]).filter((item) => item !== undefined);
    next.playerAccounts[accountKey] = keepIndexes.map((index) => accounts[index]).filter((item) => item !== undefined);
  }

  filterSlot('playerDetails', 'players', 'players');
  filterSlot('reserveDetails', 'reserves', 'reserves');
  next.updatedAt = new Date().toISOString();
  return { team: next, removed };
}

async function main() {
  console.log(`[Requested Cleanup] Autorização explícita: ${AUTHORIZATION}`);

  const deleted = await storage.deleteTeam(THE_CREATOR_ID, {
    name: 'The Creator',
    tag: 'FRX',
    reason: AUTHORIZATION
  });

  const [teams, users] = await Promise.all([
    storage.readTeams(),
    storage.readUsers()
  ]);
  const hollowNexus = teams.find((team) => String(team?.id || '') === HOLLOW_NEXUS_ID);
  const targetUser = users.find((user) => String(user?.id || '') === PLAYER_USER_ID) || {};
  let removedMembers = [];

  if (hollowNexus) {
    const result = removePlayerFromRoster(hollowNexus, targetUser);
    removedMembers = result.removed;
    if (removedMembers.length) await storage.saveTeam(result.team);
  }

  console.log('[Requested Cleanup] Concluído.', {
    theCreatorId: THE_CREATOR_ID,
    theCreatorRemovedNow: deleted,
    theCreatorTombstoned: true,
    hollowNexusFound: Boolean(hollowNexus),
    playerUserId: PLAYER_USER_ID,
    rosterEntriesRemoved: removedMembers.length,
    removedMembers
  });
}

main().catch((error) => {
  console.error('[Requested Cleanup] Falha fatal:', error.message);
  process.exitCode = 1;
});
