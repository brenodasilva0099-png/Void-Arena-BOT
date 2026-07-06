const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'storage.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('function normalizeBracketGroups')) {
  const helper = [
    '',
    'function normalizeBracketGroups(rawGroups = []) {',
    '  if (!Array.isArray(rawGroups)) return [];',
    '  return rawGroups.map((group, index) => ({',
    '    name: String(group?.name || `Grupo ${String.fromCharCode(65 + index)}`).trim().slice(0, 40),',
    '    teams: (Array.isArray(group?.teams) ? group.teams : Array.isArray(group?.teamIds) ? group.teamIds : [])',
    '      .map((item) => typeof item === "string" ? item : item?.id)',
    '      .map((id) => String(id || "").trim())',
    '      .filter(Boolean)',
    '  })).filter((group) => group.teams.length);',
    '}',
    '',
    'function normalizeGroupStandings(raw = {}) {',
    '  if (!raw || typeof raw !== "object") return {};',
    '  const output = {};',
    '  Object.entries(raw).forEach(([teamId, item]) => {',
    '    const id = String(teamId || "").trim();',
    '    if (!id) return;',
    '    output[id] = {',
    '      played: Math.max(0, Number(item?.played || item?.j || 0) || 0),',
    '      wins: Math.max(0, Number(item?.wins || item?.v || 0) || 0),',
    '      draws: Math.max(0, Number(item?.draws || item?.e || 0) || 0),',
    '      losses: Math.max(0, Number(item?.losses || item?.d || 0) || 0),',
    '      goalsFor: Math.max(0, Number(item?.goalsFor || item?.gp || 0) || 0),',
    '      goalsAgainst: Math.max(0, Number(item?.goalsAgainst || item?.gc || 0) || 0),',
    '      points: Math.max(0, Number(item?.points || item?.pts || 0) || 0)',
    '    };',
    '  });',
    '  return output;',
    '}',
    ''
  ].join('\n');
  src = src.replace('\nasync function readBracket() {', helper + '\nasync function readBracket() {');
  changed = true;
}

if (!src.includes('groups: normalizeBracketGroups(db.bracket?.groups)')) {
  src = src.replace(
    '    finals: Array.isArray(db.bracket?.finals) ? db.bracket.finals : [],\n    matchProgress: normalizeMatchProgress(db.bracket?.matchProgress),',
    '    finals: Array.isArray(db.bracket?.finals) ? db.bracket.finals : [],\n    groups: normalizeBracketGroups(db.bracket?.groups),\n    groupStandings: normalizeGroupStandings(db.bracket?.groupStandings),\n    matchProgress: normalizeMatchProgress(db.bracket?.matchProgress),'
  );
  changed = true;
}

if (!src.includes('groups: normalizeBracketGroups(bracket.groups)')) {
  src = src.replace(
    '    finals: Array.isArray(bracket.finals) ? bracket.finals : [],\n    matchProgress: normalizeMatchProgress(bracket.matchProgress),',
    '    finals: Array.isArray(bracket.finals) ? bracket.finals : [],\n    groups: normalizeBracketGroups(bracket.groups),\n    groupStandings: normalizeGroupStandings(bracket.groupStandings),\n    matchProgress: normalizeMatchProgress(bracket.matchProgress),'
  );
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: grupos e tabela da fase de grupos persistem no storage.' : 'Patch ignorado: storage de grupos já estava ativo.');
