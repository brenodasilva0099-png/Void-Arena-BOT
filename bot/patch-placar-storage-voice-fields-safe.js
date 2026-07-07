const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'placarStorage.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');

const safeAttachMatchMessage = `async function attachMatchMessage(matchId, payload = {}) {
  const placar = await readPlacar();
  const match = placar.matches.find((item) => item.id === matchId);
  if (!match) throw new Error('Partida não encontrada.');
  match.discordMessageId = String(payload.discordMessageId || match.discordMessageId || '').trim();
  match.textChannelId = String(payload.textChannelId || match.textChannelId || '').trim();
  match.voiceChannelId = String(payload.voiceChannelId || match.voiceChannelId || '').trim();
  match.teamAVoiceChannelId = String(payload.teamAVoiceChannelId || payload.voiceChannelAId || match.teamAVoiceChannelId || match.voiceChannelAId || '').trim();
  match.teamBVoiceChannelId = String(payload.teamBVoiceChannelId || payload.voiceChannelBId || match.teamBVoiceChannelId || match.voiceChannelBId || '').trim();
  match.voiceChannelAId = match.teamAVoiceChannelId;
  match.voiceChannelBId = match.teamBVoiceChannelId;
  match.teamVoiceChannels = Array.isArray(payload.teamVoiceChannels)
    ? payload.teamVoiceChannels
    : (Array.isArray(match.teamVoiceChannels) ? match.teamVoiceChannels : []);
  await writePlacar(placar);
  return match;
}
`;

const start = src.indexOf('async function attachMatchMessage');
const end = start >= 0 ? src.indexOf('\nasync function claimMatchReporter', start) : -1;

if (start >= 0 && end > start) {
  src = src.slice(0, start) + safeAttachMatchMessage + src.slice(end);
} else if (!src.includes('async function attachMatchMessage')) {
  const marker = '\nfunction toNumberMap';
  const pos = src.indexOf(marker);
  if (pos >= 0) src = src.slice(0, pos) + '\n' + safeAttachMatchMessage + src.slice(pos);
}

fs.writeFileSync(file, src, 'utf8');
console.log('Patch aplicado: storage do placar reparado para calls Time A/B.');
