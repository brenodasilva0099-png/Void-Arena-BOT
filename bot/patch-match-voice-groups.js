const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'matchResults.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');

if (src.includes('function teamsForVoiceFromBracket') && !src.includes('group.teamIds || []')) {
  const start = src.indexOf('function teamsForVoiceFromBracket');
  const brace = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = brace; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (start >= 0 && end > start) {
    const next = `function teamsForVoiceFromBracket(bracket = {}, teams = [], settings = {}) {
  const byId = new Map(teams.map((team) => { const safe = safeTeam(team); return [safe.id, safe]; }));
  const ids = [];
  for (const key of ["slots", "round16", "quarters", "semis", "finals"]) {
    const arr = Array.isArray(bracket[key]) ? bracket[key] : [];
    arr.forEach((item) => { const id = teamIdOf(item); if (id) ids.push(id); });
  }
  const groups = Array.isArray(bracket.groups) ? bracket.groups : [];
  groups.forEach((group) => (group.teams || group.teamIds || []).forEach((item) => { const id = teamIdOf(item); if (id) ids.push(id); }));
  const selected = unique(ids).map((id) => byId.get(id)).filter(Boolean);
  if (selected.length) return selected;
  const limit = Math.max(1, Math.min(32, Number(settings.teamLimit || settings.limit || settings.maxTeams || teams.length || 32) || 32));
  return teams.map(safeTeam).filter((team) => team.id).slice(0, limit);
}`;
    src = src.slice(0, start) + next + src.slice(end);
    fs.writeFileSync(file, src, 'utf8');
  }
}

console.log('Patch aplicado: calls também leem times dos grupos do chaveamento.');
