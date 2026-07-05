const fs = require('node:fs');
const path = require('node:path');

function patchStorage() {
  const file = path.join(__dirname, 'placarStorage.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');

  const oldRanks = /const RANKS = \[[\s\S]*?\n\];/;
  const newRanks = `const RANKS = [
  { key: 'bronze', name: 'Bronze', emoji: '🥉', min: 0 },
  { key: 'prata', name: 'Prata', emoji: '🥈', min: 25 },
  { key: 'ouro', name: 'Ouro', emoji: '🥇', min: 60 },
  { key: 'platina', name: 'Platina', emoji: '💠', min: 100 },
  { key: 'diamante', name: 'Diamante', emoji: '💎', min: 160 },
  { key: 'mestre', name: 'Mestre', emoji: '👑', min: 230 },
  { key: 'abyssal', name: 'Abyssal', emoji: '⚜️', min: 320 }
];`;
  if (!src.includes("min: 25 },") || src.includes("min: 100 },\n  { key: 'ouro'")) {
    src = src.replace(oldRanks, newRanks);
  }

  const oldRule = /pointsRule: \{\n\s*win: [\s\S]*?\n\s*noShow: -?\d+(?:\.\d+)?\n\s*\}/;
  const newRule = `pointsRule: {
      win: 3,
      draw: 1,
      loss: 0,
      participation: 2,
      goal: 0.5,
      assist: 0.5,
      defense: 0.5,
      mvp: 1,
      cleanSheet: 1,
      noShow: -1
    }`;
  src = src.replace(oldRule, newRule);

  src = src.replace(
    "const pointsRule = { ...base.pointsRule, ...(raw.pointsRule && typeof raw.pointsRule === 'object' ? raw.pointsRule : {}) };",
    "const pointsRule = { ...base.pointsRule, ...(process.env.PLACAR_KEEP_CUSTOM_POINTS === '1' && raw.pointsRule && typeof raw.pointsRule === 'object' ? raw.pointsRule : {}) };"
  );

  fs.writeFileSync(file, src, 'utf8');
}

function patchSystem() {
  const file = path.join(__dirname, 'placarSystem.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('PLACAR_RANK_ROLE_IDS')) {
    src = src.replace(
      "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();",
      "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();\nconst PLACAR_RANK_ROLE_IDS = {\n  abyssal: '1494779368969470083',\n  mestre: '1494779378087886928',\n  diamante: '1494779977743339582',\n  platina: '1494780148212568090',\n  ouro: '1494780420447928422',\n  prata: '1494780533572632586',\n  bronze: '1494780591303037019'\n};"
    );
  }

  const replacement = `async function updateRankRoles(guild, playerIds = [], mode = '3v3') {
  const leaderboard = await placar.getLeaderboard(mode);
  const byId = new Map(leaderboard.players.map((p) => [p.discordId, p]));
  const allRankRoleIds = Object.values(PLACAR_RANK_ROLE_IDS).filter(Boolean);
  for (const id of playerIds) {
    const player = byId.get(id);
    if (!player) continue;
    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) continue;
    const targetId = PLACAR_RANK_ROLE_IDS[player.rankKey];
    const removeIds = allRankRoleIds.filter((roleId) => roleId !== targetId && member.roles.cache.has(roleId));
    if (removeIds.length) await member.roles.remove(removeIds, 'Void Arena Placar: atualização de patente').catch(() => null);
    if (targetId && !member.roles.cache.has(targetId)) await member.roles.add(targetId, 'Void Arena Placar: atualização de patente').catch(() => null);
  }
}`;
  src = src.replace(/async function updateRankRoles\(guild, playerIds = \[\], mode = '3v3'\) \{[\s\S]*?\n\}/, replacement);
  fs.writeFileSync(file, src, 'utf8');
}

patchStorage();
patchSystem();
console.log('Patch aplicado: pontuação VAP e cargos de patente do Placar.');
