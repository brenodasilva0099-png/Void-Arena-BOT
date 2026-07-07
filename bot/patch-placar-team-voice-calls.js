const fs = require('node:fs');
const path = require('node:path');

function replaceFunction(src, name, replacement) {
  const asyncNeedle = `async function ${name}`;
  const plainNeedle = `function ${name}`;
  let start = src.indexOf(asyncNeedle);
  if (start < 0) start = src.indexOf(plainNeedle);
  if (start < 0) return src;
  const braceStart = src.indexOf('{', start);
  if (braceStart < 0) return src;
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(0, start) + replacement + src.slice(i + 1);
    }
  }
  return src;
}

function source(fn, targetName) {
  return fn.toString().replace(fn.name, targetName);
}

async function attachMatchMessageReplacement(matchId, payload = {}) {
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
  match.teamVoiceChannels = Array.isArray(payload.teamVoiceChannels) ? payload.teamVoiceChannels : (Array.isArray(match.teamVoiceChannels) ? match.teamVoiceChannels : []);
  await writePlacar(placar);
  return match;
}

function matchEmbedReplacement(match) {
  const teamA = (match.teamA || []).map((p) => `<@${p.discordId}>`).join('\n');
  const teamB = (match.teamB || []).map((p) => `<@${p.discordId}>`).join('\n');
  const callA = match.teamAVoiceChannelId || match.voiceChannelAId || '';
  const callB = match.teamBVoiceChannelId || match.voiceChannelBId || '';
  return new EmbedBuilder()
    .setTitle(`⚽ Partida encontrada • ${modeLabel(match.mode)}`)
    .setColor(0x8b5cf6)
    .setDescription([
      `**ID:** \`${match.id}\``,
      '',
      `**👤・Time A${callA ? ` • Call: <#${callA}>` : ''}**`,
      teamA || 'A definir',
      '',
      `**👤・Time B${callB ? ` • Call: <#${callB}>` : ''}**`,
      teamB || 'A definir',
      '',
      'Quando acabar, um participante clica em **Atualizar placar**. Só quem clicar primeiro consegue enviar/validar esse placar.'
    ].filter(Boolean).join('\n'))
    .setTimestamp(new Date());
}

async function createPrivateVoiceForMatchReplacement(guild, sourceChannel, match) {
  const suffix = String(Date.now()).slice(-4);
  const parentId = String(
    process.env.PLACAR_MATCH_CATEGORY_ID ||
    process.env.MATCH_VOICE_CATEGORY_ID ||
    process.env.DISCORD_MATCH_CATEGORY_ID ||
    process.env.MATCH_CATEGORY_ID ||
    MATCH_CATEGORY_ID ||
    sourceChannel?.parentId ||
    '1523133579570184194'
  ).trim();

  const viewOnlyRoleIds = String(process.env.MATCH_VOICE_VIEW_ROLE_IDS || '1297729406432710656,1493641717059031182')
    .split(',').map((id) => id.trim()).filter(Boolean);
  const connectRoleIds = String(process.env.MATCH_VOICE_CONNECT_ROLE_IDS || '1523438475716853851')
    .split(',').map((id) => id.trim()).filter(Boolean);
  const botId = String(guild.client?.user?.id || guild.members?.me?.id || '').trim();

  const makeOverwrites = (players = []) => {
    const allowedIds = [...new Set(players.map((p) => String(p.discordId || '').trim()).filter(Boolean))];
    return [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
      ...(botId ? [{
        id: botId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream, PermissionsBitField.Flags.UseVAD, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers]
      }] : []),
      ...viewOnlyRoleIds.map((id) => ({
        id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
        deny: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream, PermissionsBitField.Flags.SendMessages]
      })),
      ...connectRoleIds.map((id) => ({
        id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream, PermissionsBitField.Flags.UseVAD, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.SendMessages]
      })),
      ...allowedIds.map((id) => ({
        id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream, PermissionsBitField.Flags.UseVAD, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.SendMessages]
      }))
    ];
  };

  const createTeamCall = async (letter, players = []) => guild.channels.create({
    name: `👤・Time ${letter} • ${modeLabel(match.mode)}-${suffix}`,
    type: ChannelType.GuildVoice,
    parent: parentId || undefined,
    userLimit: 7,
    permissionOverwrites: makeOverwrites(players),
    reason: `Void Arena Placar: call privada Time ${letter}`
  });

  const [teamAChannel, teamBChannel] = await Promise.all([
    createTeamCall('A', match.teamA || []),
    createTeamCall('B', match.teamB || [])
  ]);

  return {
    teamA: teamAChannel,
    teamB: teamBChannel,
    primary: teamAChannel,
    teamVoiceChannels: [
      { team: 'A', id: teamAChannel.id, name: teamAChannel.name },
      { team: 'B', id: teamBChannel.id, name: teamBChannel.name }
    ]
  };
}

async function moveOrDmPlayersReplacement(guild, match, voiceChannels) {
  const teamAChannel = voiceChannels?.teamA || voiceChannels;
  const teamBChannel = voiceChannels?.teamB || voiceChannels;
  const moveTeam = async (players = [], channel, label) => {
    if (!channel?.id) return;
    const link = `https://discord.com/channels/${guild.id}/${channel.id}`;
    for (const player of players) {
      const member = await guild.members.fetch(player.discordId).catch((error) => {
        console.error('[placar] buscar membro para mover:', player.discordId, error.message);
        return null;
      });
      if (!member) continue;
      if (member.voice?.channelId) {
        await member.voice.setChannel(channel.id).then(() => {
          console.log(`[placar] ${member.user?.tag || member.id} movido para Time ${label}`);
        }).catch(async (error) => {
          console.error('[placar] mover jogador para call:', member.id, error.message);
          await member.send(`⚽ Sua partida ${modeLabel(match.mode)} foi encontrada. Você caiu no **Time ${label}**. Entre na call: ${link}`).catch(() => null);
        });
      } else {
        await member.send([
          '⚽ **Partida encontrada na Void Arena!**',
          `Modo: **${modeLabel(match.mode)}**`,
          `Você caiu no **Time ${label}**.`,
          'Você estava na fila, mas não estava em uma call.',
          `Entre pela call do seu time: ${link}`
        ].join('\n')).catch(() => null);
      }
    }
  };
  await moveTeam(match.teamA || [], teamAChannel, 'A');
  await moveTeam(match.teamB || [], teamBChannel, 'B');
}

async function maybeStartMatchReplacement(client, interaction, mode) {
  const selected = await placar.popQueueForMatch(mode);
  if (!selected) return null;
  const guild = interaction.guild;
  const sourceChannel = interaction.channel;
  let match = await placar.createMatch(mode, selected, { textChannelId: QUEUE_CHANNEL_ID });
  const voiceChannels = await createPrivateVoiceForMatch(guild, sourceChannel, match).catch((error) => {
    console.error('[placar] criar calls Time A/B:', error.message);
    return null;
  });
  if (voiceChannels?.teamA?.id || voiceChannels?.teamB?.id) {
    match = await placar.attachMatchMessage(match.id, {
      voiceChannelId: voiceChannels?.teamA?.id || voiceChannels?.teamB?.id || '',
      teamAVoiceChannelId: voiceChannels?.teamA?.id || '',
      teamBVoiceChannelId: voiceChannels?.teamB?.id || '',
      voiceChannelAId: voiceChannels?.teamA?.id || '',
      voiceChannelBId: voiceChannels?.teamB?.id || '',
      teamVoiceChannels: voiceChannels.teamVoiceChannels || [],
      textChannelId: QUEUE_CHANNEL_ID
    });
    await moveOrDmPlayers(guild, match, voiceChannels);
  }
  const channel = await client.channels.fetch(QUEUE_CHANNEL_ID).catch(() => sourceChannel);
  const sent = await channel.send({
    content: [...match.teamA, ...match.teamB].map((p) => `<@${p.discordId}>`).join(' '),
    embeds: [matchEmbed(match)],
    components: matchRows(match),
    allowedMentions: { users: [...match.teamA, ...match.teamB].map((p) => p.discordId) }
  });
  await placar.attachMatchMessage(match.id, {
    discordMessageId: sent.id,
    textChannelId: sent.channelId,
    voiceChannelId: match.voiceChannelId || voiceChannels?.teamA?.id || voiceChannels?.teamB?.id || '',
    teamAVoiceChannelId: match.teamAVoiceChannelId || voiceChannels?.teamA?.id || '',
    teamBVoiceChannelId: match.teamBVoiceChannelId || voiceChannels?.teamB?.id || '',
    voiceChannelAId: match.teamAVoiceChannelId || voiceChannels?.teamA?.id || '',
    voiceChannelBId: match.teamBVoiceChannelId || voiceChannels?.teamB?.id || '',
    teamVoiceChannels: match.teamVoiceChannels || voiceChannels?.teamVoiceChannels || []
  });
  await ensureQueuePanel(client);
  await ensureRankingPanel(client).catch(() => null);
  return match;
}

function patchStorage() {
  const file = path.join(__dirname, 'placarStorage.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  src = replaceFunction(src, 'attachMatchMessage', source(attachMatchMessageReplacement, 'attachMatchMessage'));
  fs.writeFileSync(file, src, 'utf8');
}

function patchSystem() {
  const file = path.join(__dirname, 'placarSystem.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');
  src = replaceFunction(src, 'matchEmbed', source(matchEmbedReplacement, 'matchEmbed'));
  src = replaceFunction(src, 'createPrivateVoiceForMatch', source(createPrivateVoiceForMatchReplacement, 'createPrivateVoiceForMatch'));
  src = replaceFunction(src, 'moveOrDmPlayers', source(moveOrDmPlayersReplacement, 'moveOrDmPlayers'));
  src = replaceFunction(src, 'maybeStartMatch', source(maybeStartMatchReplacement, 'maybeStartMatch'));
  fs.writeFileSync(file, src, 'utf8');
}

patchStorage();
patchSystem();
console.log('Patch aplicado: placar cria calls Time A/B, permite bot nas calls e registra movimentos.');
