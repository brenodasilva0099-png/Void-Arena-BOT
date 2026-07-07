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

async function cleanupPlacarMatchResourcesReplacement(client, match = {}, interactionMessage = null) {
  const channelIds = new Set();
  const addId = (value) => {
    const id = String(value || '').trim();
    if (id) channelIds.add(id);
  };

  addId(match.teamAVoiceChannelId);
  addId(match.teamBVoiceChannelId);
  addId(match.voiceChannelAId);
  addId(match.voiceChannelBId);
  addId(match.voiceChannelId);
  (Array.isArray(match.teamVoiceChannels) ? match.teamVoiceChannels : []).forEach((item) => addId(item.id));

  for (const channelId of channelIds) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel?.delete) {
      await channel.delete('Void Arena Placar: partida finalizada, limpando call automática').catch((error) => {
        console.error('[placar] limpar call:', channelId, error.message);
      });
    }
  }

  const messageId = String(match.discordMessageId || interactionMessage?.id || '').trim();
  const textChannelId = String(match.textChannelId || interactionMessage?.channelId || '').trim();
  if (interactionMessage?.id && interactionMessage.id === messageId && interactionMessage.deletable) {
    await interactionMessage.delete().catch((error) => console.error('[placar] apagar mensagem da partida:', error.message));
    return;
  }

  if (messageId && textChannelId) {
    const textChannel = await client.channels.fetch(textChannelId).catch(() => null);
    if (textChannel?.messages?.fetch) {
      const message = await textChannel.messages.fetch(messageId).catch(() => null);
      if (message?.delete) await message.delete().catch((error) => console.error('[placar] apagar mensagem da partida:', error.message));
    }
  }
}

async function handleResultModalReplacement(interaction, matchId, reporterId) {
  if (String(reporterId || '') !== interaction.user.id) {
    return interaction.reply({ content: 'Só quem abriu o formulário pode enviar essa validação.', ephemeral: true });
  }

  const match = await placar.getMatch(matchId);
  if (!match) return interaction.reply({ content: 'Partida não encontrada.', ephemeral: true });

  const participantIds = new Set(allPlacarPlayers(match).map((p) => p.discordId));
  if (!participantIds.has(interaction.user.id)) {
    return interaction.reply({ content: 'Só jogadores dessa partida podem atualizar o placar.', ephemeral: true });
  }

  const scoreA = parseScoreValue(interaction.fields.getTextInputValue('scoreA'), 'Gols do Time A');
  const scoreB = parseScoreValue(interaction.fields.getTextInputValue('scoreB'), 'Gols do Time B');
  const mvpPlayer = resolveMatchPlayer(match, interaction.fields.getTextInputValue('mvp'));
  if (!mvpPlayer) {
    return interaction.reply({ content: 'MVP obrigatório: mencione ou informe o ID/nome de um jogador da partida.', ephemeral: true });
  }

  const stats = parseStatsBlock(match, interaction.fields.getTextInputValue('stats'));
  const proofUrl = validProofUrl(interaction.fields.getTextInputValue('proof'));
  const result = await placar.finishMatch(matchId, {
    scoreA,
    scoreB,
    mvpId: mvpPlayer.discordId,
    stats,
    proofUrl,
    reportedBy: interaction.user.id
  });

  await updateRankRoles(interaction.guild, Array.from(participantIds), match.mode);
  const finished = result.match;

  const summary = new EmbedBuilder()
    .setTitle(`✅ Placar atualizado • ${modeLabel(finished.mode)}`)
    .setDescription([
      `**Time A:** ${finished.scoreA}`,
      `**Time B:** ${finished.scoreB}`,
      `**Vencedor:** ${finished.result?.winner === 'draw' ? 'Empate' : `Time ${finished.result?.winner}`}`,
      `**MVP:** <@${finished.result?.mvpId}>`,
      '',
      'Patentes, VAP e placar individual atualizados no bot/site.',
      'A mensagem da partida foi removida e as calls automáticas foram encerradas.',
      '',
      resultDeltaLines(finished, result.deltas)
    ].join('\n').slice(0, 3900))
    .setColor(0x22c55e)
    .setImage(proofUrl)
    .setTimestamp(new Date());

  await interaction.reply({ embeds: [summary], allowedMentions: { parse: [] } });
  await sendPlacarHistory(interaction.client, finished, result.deltas, interaction.user.id, proofUrl)
    .catch((error) => console.error('[placar] histórico:', error.message));
  await ensureRankingPanel(interaction.client).catch(() => null);
  await cleanupPlacarMatchResources(interaction.client, finished, interaction.message).catch((error) => {
    console.error('[placar] limpeza pós-partida:', error.message);
  });
}

const file = path.join(__dirname, 'placarSystem.js');
if (fs.existsSync(file)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('async function cleanupPlacarMatchResources')) {
    src = src.replace('\nasync function handleResultModal', '\n' + source(cleanupPlacarMatchResourcesReplacement, 'cleanupPlacarMatchResources') + '\n\nasync function handleResultModal');
  }
  src = replaceFunction(src, 'handleResultModal', source(handleResultModalReplacement, 'handleResultModal'));
  fs.writeFileSync(file, src, 'utf8');
}

console.log('Patch aplicado: placar envia histórico e limpa mensagem/calls ao finalizar.');
