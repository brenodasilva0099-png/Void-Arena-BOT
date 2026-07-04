const fs = require('node:fs');
const path = require('node:path');

function patchInternalApi() {
  const file = path.join(__dirname, 'internalApi.js');
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes("require('./placarStorage')")) {
    src = src.replace(
      "const { syncResultHubsForBracket } = require('./matchResults');",
      "const { syncResultHubsForBracket } = require('./matchResults');\nconst placarStorage = require('./placarStorage');"
    );
  }

  const marker = "// VOID_ARENA_PLACAR_ROUTES";
  if (!src.includes(marker)) {
    const routes = `\n\n  ${marker}\n  app.get('/internal/placar', async (_req, res) => {\n    try {\n      return res.json(await placarStorage.getFullScoreboard());\n    } catch (error) {\n      return res.status(500).json({ success: false, message: error.message });\n    }\n  });\n\n  app.get('/internal/placar/:mode', async (req, res) => {\n    try {\n      const data = await placarStorage.getLeaderboard(req.params.mode);\n      return res.json({ success: true, ...data });\n    } catch (error) {\n      return res.status(500).json({ success: false, message: error.message });\n    }\n  });\n`;

    src = src.replace("  app.use(requireInternalToken);", `  app.use(requireInternalToken);${routes}`);
  }

  fs.writeFileSync(file, src, 'utf8');
}

function patchPlacarSystem() {
  const file = path.join(__dirname, 'placarSystem.js');
  if (!fs.existsSync(file)) return;
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('QUEUE_CHANNEL_ID')) {
    src = src.replace(
      "const PLACAR_CHANNEL_ID = String(process.env.PLACAR_CHANNEL_ID || '1522782784987463801').trim();",
      "const PLACAR_CHANNEL_ID = String(process.env.PLACAR_CHANNEL_ID || '1522782784987463801').trim();\nconst QUEUE_CHANNEL_ID = String(process.env.PLACAR_QUEUE_CHANNEL_ID || process.env.CAFE_COM_LEITE_CHANNEL_ID || '1523063064658972833').trim();"
    );
  }

  src = src
    .replace(".setTitle('🏟️ Sistema de Placar Rematch')", ".setTitle('☕ Fila Café com Leite Rematch')")
    .replace(
      "'Entre na fila para partidas internas do servidor. Quando fechar jogadores suficientes, o bot sorteia os times, cria a call privada e avisa os participantes por DM.',",
      "'Entre aqui na fila 3x3 ou 5x5. Quando fechar jogadores suficientes, o bot sorteia os times, cria a call privada e avisa os participantes por DM.',"
    )
    .replace(
      "'Depois da partida, use o botão **Reportar resultado** na mensagem da partida para atualizar placar, pontos e patente.'",
      "'Esse canal é só para fila e resultado da partida. O ranking/placar/patentes fica separado no canal Placar.'"
    )
    .replace(".setFooter({ text: 'Void Arena • Placar café com leite do servidor' })", ".setFooter({ text: 'Void Arena • Fila Café com Leite' })")
    .replace('if (!PLACAR_CHANNEL_ID || !client?.channels?.fetch) return;', 'if (!QUEUE_CHANNEL_ID || !client?.channels?.fetch) return;')
    .replace('const channel = await client.channels.fetch(PLACAR_CHANNEL_ID).catch(() => null);', 'const channel = await client.channels.fetch(QUEUE_CHANNEL_ID).catch(() => null);')
    .replace("msg.embeds?.[0]?.title?.includes('Sistema de Placar')", "msg.embeds?.[0]?.title?.includes('Fila Café com Leite')")
    .replace('let match = await placar.createMatch(mode, selected, { textChannelId: PLACAR_CHANNEL_ID });', 'let match = await placar.createMatch(mode, selected, { textChannelId: QUEUE_CHANNEL_ID });')
    .replace("match = await placar.attachMatchMessage(match.id, { voiceChannelId: voiceChannel.id, textChannelId: PLACAR_CHANNEL_ID });", "match = await placar.attachMatchMessage(match.id, { voiceChannelId: voiceChannel.id, textChannelId: QUEUE_CHANNEL_ID });")
    .replace('const channel = await client.channels.fetch(PLACAR_CHANNEL_ID).catch(() => sourceChannel);', 'const channel = await client.channels.fetch(QUEUE_CHANNEL_ID).catch(() => sourceChannel);');

  const rankingMarker = '// VOID_ARENA_RANKING_PANEL_FUNCTIONS';
  if (!src.includes(rankingMarker)) {
    const rankingFunctions = `\n${rankingMarker}\nfunction rankingPanelRows() {\n  return [new ActionRowBuilder().addComponents(\n    new ButtonBuilder().setCustomId('placar:ranking:3v3').setLabel('Ranking 3x3').setEmoji('🏆').setStyle(ButtonStyle.Secondary),\n    new ButtonBuilder().setCustomId('placar:ranking:5v5').setLabel('Ranking 5x5').setEmoji('📊').setStyle(ButtonStyle.Secondary)\n  )];\n}\n\nasync function rankingPanelEmbed() {\n  const data = await placar.getFullScoreboard();\n  const top3 = (data.leaderboards?.['3v3'] || []).slice(0, 5);\n  const top5 = (data.leaderboards?.['5v5'] || []).slice(0, 5);\n  return new EmbedBuilder()\n    .setTitle('🏆 Placar • Rankings e Patentes')\n    .setColor(0x22d3ee)\n    .setDescription([\n      'Canal limpo para consultar ranking, pontos e patentes do Café com Leite.',\n      '',\n      '**Top 3x3**',\n      rankingText(top3, '3v3'),\n      '',\n      '**Top 5x5**',\n      rankingText(top5, '5v5')\n    ].join('\\n'))\n    .setFooter({ text: 'Void Arena • Placar oficial do servidor' })\n    .setTimestamp(new Date());\n}\n\nasync function ensureRankingPanel(client) {\n  if (!PLACAR_CHANNEL_ID || !client?.channels?.fetch) return null;\n  const channel = await client.channels.fetch(PLACAR_CHANNEL_ID).catch(() => null);\n  if (!channel?.isTextBased?.()) return null;\n\n  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);\n  const botMessages = Array.from(messages?.values?.() || []).filter((msg) => msg.author?.id === client.user?.id);\n  for (const old of botMessages) {\n    const title = old.embeds?.[0]?.title || '';\n    if (title.includes('Sistema de Placar Rematch') || title.includes('Fila Café com Leite')) {\n      await old.delete().catch(() => null);\n    }\n  }\n\n  const embed = await rankingPanelEmbed();\n  const existing = botMessages.find((msg) => msg.embeds?.[0]?.title?.includes('Placar • Rankings e Patentes'));\n  if (existing) {\n    await existing.edit({ embeds: [embed], components: rankingPanelRows() }).catch(() => null);\n    return existing;\n  }\n  return channel.send({ embeds: [embed], components: rankingPanelRows() });\n}\n`;
    src = src.replace('\nfunction matchEmbed(match) {', `${rankingFunctions}\nfunction matchEmbed(match) {`);
  }

  if (!src.includes('await ensureRankingPanel(interaction.client)')) {
    src = src.replace(
      "await interaction.reply({ embeds: [summary] });",
      "await interaction.reply({ embeds: [summary] });\n  await ensureRankingPanel(interaction.client).catch(() => null);"
    );
  }

  src = src.replace(
    "setTimeout(() => ensureQueuePanel(client).catch((error) => console.error('[placar] painel:', error.message)), 4000).unref?.();",
    "setTimeout(() => Promise.all([\n      ensureQueuePanel(client),\n      ensureRankingPanel(client)\n    ]).catch((error) => console.error('[placar] painel:', error.message)), 4000).unref?.();"
  );

  src = src.replace(
    'module.exports = { registerPlacarSystem, ensureQueuePanel, updateRankRoles };',
    'module.exports = { registerPlacarSystem, ensureQueuePanel, ensureRankingPanel, updateRankRoles };'
  );

  fs.writeFileSync(file, src, 'utf8');
}

patchInternalApi();
patchPlacarSystem();
console.log('Patch placar/internal API e separação de canais aplicado.');
