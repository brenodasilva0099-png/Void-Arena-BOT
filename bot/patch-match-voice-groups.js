const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');

function replaceFunction(source, name, replacement) {
  const start = source.indexOf('function ' + name);
  if (start < 0) return source;
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(0, start) + replacement + source.slice(i + 1);
    }
  }
  return source;
}

const next = `function teamsForVoiceFromBracket(bracket = {}, teams = [], settings = {}) {
  const byId = new Map(teams.map((team) => { const safe = safeTeam(team); return [safe.id, safe]; }));
  const entries = [];
  for (const key of ["slots", "round16", "quarters", "semis", "finals"]) {
    const arr = Array.isArray(bracket[key]) ? bracket[key] : [];
    arr.forEach((item, index) => { const id = teamIdOf(item); if (id) entries.push({ id, label: key + '-' + (index + 1) }); });
  }
  const groups = Array.isArray(bracket.groups) ? bracket.groups : [];
  groups.forEach((group, groupIndex) => (group.teams || group.teamIds || []).forEach((item, index) => { const id = teamIdOf(item); if (id) entries.push({ id, label: (group.name || ('Grupo ' + (groupIndex + 1))) + '-' + (index + 1) }); }));
  const counts = new Map();
  const selected = [];
  for (const entry of entries) {
    const base = byId.get(entry.id);
    if (!base) continue;
    const seen = (counts.get(entry.id) || 0) + 1;
    counts.set(entry.id, seen);
    if (seen === 1) selected.push(base);
    else selected.push({ ...base, id: base.id + ':' + seen, originalTeamId: base.id, name: readableTeamName(base, 'time') + ' ' + String(seen).padStart(2, '0') });
  }
  if (selected.length) return selected;
  const limit = Math.max(1, Math.min(32, Number(settings.teamLimit || settings.limit || settings.maxTeams || teams.length || 32) || 32));
  return teams.map(safeTeam).filter((team) => team.id).slice(0, limit);
}`;

if (src.includes('function teamsForVoiceFromBracket')) {
  src = replaceFunction(src, 'teamsForVoiceFromBracket', next);
  fs.writeFileSync(file, src, 'utf8');
}

console.log('Patch aplicado: calls leem grupos e duplicatas de posições do chaveamento.');
