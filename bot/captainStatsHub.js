const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const storage = require('../server/storage');

const CAPTAIN_STATS_HUB_CHANNEL_ID = String(
  process.env.CAPTAIN_STATS_HUB_CHANNEL_ID || '1516946580425674953'
).trim();
const HUB_MARKER = 'Hollow Nexus League • Central de Súmulas dos Capitães • teste-v1';
const SITE_URL = 'https://hollownexus.com.br';
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessions = new Map();

function clean(value = '', max = 120) {
  return String(value || '').trim().slice(0, max);
}

function discordIdFrom(value = '') {
  const raw = clean(value, 120);
  if (!raw) return '';
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  return /^\d{16,22}$/.test(raw) ? raw : '';
}

function displayUser(user = {}) {
  return clean(
    user.profile?.displayName ||
    user.profile?.username ||
    user.name ||
    user.username ||
    '',
    80
  );
}

function userMaps(users = []) {
  const byIdentity = new Map();
  const byLabel = new Map();

  for (const user of users) {
    for (const identity of [user.id, user.discordId]) {
      if (identity) byIdentity.set(String(identity), user);
    }
    for (const label of [
      user.name,
      user.username,
      user.profile?.username,
      user.profile?.displayName
    ]) {
      const key = clean(label, 120).toLocaleLowerCase('pt-BR');
      if (key) byLabel.set(key, user);
    }
  }

  return { byIdentity, byLabel };
}

function resolveUser(value = '', maps = {}) {
  const raw = clean(value, 180);
  if (!raw) return null;
  return maps.byIdentity?.get(raw) ||
    maps.byLabel?.get(raw.toLocaleLowerCase('pt-BR')) ||
    null;
}

function resolveDiscordId(value = '', maps = {}) {
  return discordIdFrom(value) || clean(resolveUser(value, maps)?.discordId, 40);
}

function leadershipDiscordIds(team = {}, users = []) {
  const maps = userMaps(users);
  const ids = [];
  const candidates = [
    team.ownerDiscordId,
    team.directorDiscordId,
    team.captainDiscordId,
    team.ownerUserId,
    team.directorUserId,
    team.captainUserId,
    team.ownerId,
    team.directorId,
    team.captainId,
    team.ownerName,
    team.directorName,
    team.captainName
  ];

  for (const value of candidates) {
    const id = resolveDiscordId(value, maps);
    if (id) ids.push(id);
  }

  const details = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : [])
  ];
  for (const detail of details) {
    if (!detail || typeof detail !== 'object') continue;
    const role = clean(
      detail.role || detail.rosterRole || detail.type || detail.position,
      80
    ).toLocaleLowerCase('pt-BR');
    if (!/(capit|diretor|dono|owner|criador)/i.test(role)) continue;
    for (const value of [
      detail.discordId,
      detail.userId,
      detail.id,
      detail.name,
      detail.playerName
    ]) {
      const id = resolveDiscordId(value, maps);
      if (id) ids.push(id);
    }
  }

  return Array.from(new Set(ids.filter(Boolean)));
}

function rosterItems(team = {}, users = [], type = 'players') {
  const maps = userMaps(users);
  const detailsKey = type === 'reserves' ? 'reserveDetails' : 'playerDetails';
  const accountsKey = type === 'reserves' ? 'reserves' : 'players';
  const details = Array.isArray(team[detailsKey]) ? team[detailsKey] : [];
  const names = Array.isArray(team[type]) ? team[type] : [];
  const accounts = Array.isArray(team.playerAccounts?.[accountsKey])
    ? team.playerAccounts[accountsKey]
    : [];
  const size = Math.max(details.length, names.length, accounts.length);
  const result = [];

  for (let index = 0; index < size; index += 1) {
    const detail = details[index] || {};
    const values = [
      typeof detail === 'object' ? detail.discordId : '',
      typeof detail === 'object' ? detail.userId : '',
      typeof detail === 'object' ? detail.id : '',
      accounts[index],
      names[index]
    ].filter(Boolean);
    const linkedUser = values.map((value) => resolveUser(value, maps)).find(Boolean);
    const linkedDiscordId = values
      .map((value) => resolveDiscordId(value, maps))
      .find(Boolean) || clean(linkedUser?.discordId, 40);
    const detailName = typeof detail === 'string'
      ? detail
      : detail.name || detail.playerName || '';
    const storedName = clean(names[index], 80);
    const name = clean(
      detailName ||
      displayUser(linkedUser) ||
      (!discordIdFrom(storedName) ? storedName : '') ||
      (linkedDiscordId ? `Jogador ${index + 1}` : ''),
      80
    );
    if (!name && !linkedDiscordId) continue;

    const identity = linkedDiscordId || clean(linkedUser?.id, 80) || `${type}-${index}`;
    if (result.some((item) => item.identity === identity)) continue;
    result.push({
      identity,
      discordId: linkedDiscordId,
      userId: clean(linkedUser?.id, 80),
      name: name || displayUser(linkedUser) || `Jogador ${index + 1}`,
      rosterType: type === 'reserves' ? 'Reserva' : 'Titular'
    });
  }

  return result;
}

function teamRoster(team = {}, users = []) {
  return [
    ...rosterItems(team, users, 'players'),
    ...rosterItems(team, users, 'reserves')
  ].slice(0, 25);
}

function rosterLine(item = {}) {
  const member = item.discordId ? `<@${item.discordId}>` : `**${item.name}**`;
  return `${item.rosterType === 'Reserva' ? '🪑' : '⚽'} ${member} — ${item.rosterType}`;
}

function rosterField(items = [], empty = 'Nenhum jogador vinculado ao cadastro.') {
  if (!items.length) return empty;
  return items.map(rosterLine).join('\n').slice(0, 1024);
}

function isStaff(member) {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

function availableTeams(member, teams = [], users = []) {
  if (isStaff(member)) return teams.filter((team) => team?.id && team?.name);
  return teams.filter((team) => (
    leadershipDiscordIds(team, users).includes(String(member?.id || ''))
  ));
}

function createSession(userId, data = {}) {
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  sessions.set(token, {
    ...data,
    userId: String(userId || ''),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  const timer = setTimeout(() => sessions.delete(token), SESSION_TTL_MS);
  timer.unref?.();
  return token;
}

function readSession(token, userId) {
  const session = sessions.get(String(token || ''));
  if (!session || session.userId !== String(userId || '') || session.expiresAt < Date.now()) {
    if (session) sessions.delete(String(token || ''));
    return null;
  }
  return session;
}

function panelPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('📊 Central de Súmulas dos Capitães')
    .setDescription([
      '**Painel de teste para resultados e estatísticas das próximas competições.**',
      '',
      'O bot reconhece o capitão pela conta do Discord, encontra o clube cadastrado no site e carrega automaticamente titulares e reservas.',
      '',
      '**O fluxo definitivo alimentará:**',
      '• classificação e histórico dos clubes;',
      '• gols, assistências, interceptações e defesas individuais;',
      '• MVP e resultado oficial de cada partida.',
      '',
      '🧪 **Modo atual:** somente teste. Nenhum resultado ou ponto será salvo.'
    ].join('\n'))
    .addFields(
      {
        name: 'Como testar',
        value: 'Clique em **Iniciar súmula de teste**, selecione quem jogou e confira a prévia antes de finalizar.',
        inline: false
      },
      {
        name: 'Cadastro utilizado',
        value: `[Clubes e elencos do site](${SITE_URL}/pages/clubes.html)`,
        inline: false
      }
    )
    .setFooter({ text: HUB_MARKER })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('captain-stats:start')
          .setLabel('Iniciar súmula de teste')
          .setEmoji('📝')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('captain-stats:roster')
          .setLabel('Conferir meu elenco')
          .setEmoji('👥')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('captain-stats:help')
          .setLabel('Como funciona')
          .setEmoji('📖')
          .setStyle(ButtonStyle.Secondary)
      )
    ],
    allowedMentions: { parse: [] }
  };
}

function rosterEmbed(team = {}, users = []) {
  const roster = teamRoster(team, users);
  const starters = roster.filter((item) => item.rosterType === 'Titular');
  const reserves = roster.filter((item) => item.rosterType === 'Reserva');
  return new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle(`👥 ${clean(team.name, 80)}${team.tag ? ` [${clean(team.tag, 16)}]` : ''}`)
    .setDescription([
      'Elenco encontrado pelo vínculo do seu Discord com a liderança do clube.',
      'Se algum nome estiver incorreto, ajuste primeiro o elenco no site.'
    ].join('\n'))
    .addFields(
      { name: `⚽ Titulares • ${starters.length}`, value: rosterField(starters), inline: false },
      { name: `🪑 Reservas • ${reserves.length}`, value: rosterField(reserves, 'Nenhum reserva vinculado.'), inline: false }
    )
    .setFooter({ text: 'HNL • Dados carregados do cadastro atual do site' });
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('📖 Como funciona a súmula rápida')
    .setDescription([
      '1. O bot reconhece seu clube pelo login Discord usado no site.',
      '2. Você seleciona os jogadores que participaram.',
      '3. Informa adversário, placar, MVP e estatísticas em uma única tela.',
      '4. O bot mostra uma revisão antes de finalizar.',
      '',
      'Na versão definitiva, os dois capitães confirmarão o confronto. Divergências irão para a organização.',
      '',
      '🧪 Neste teste, finalizar apenas demonstra o fluxo e não altera o ranking.'
    ].join('\n'));
}

function teamPickerPayload(teams = [], token, action = 'start') {
  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(action === 'roster' ? '👥 Escolha o clube' : '📝 Escolha o clube da súmula')
    .setDescription('Você possui acesso a mais de um clube. Selecione qual deseja utilizar.');
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:team:${token}`)
    .setPlaceholder('Selecione um clube')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(teams.slice(0, 25).map((team, index) => ({
      label: clean(team.name, 100),
      description: clean(team.tag ? `Tag: ${team.tag}` : 'Clube registrado no site', 100),
      value: String(index)
    })));
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

function participantPickerPayload(team = {}, users = [], token) {
  const roster = teamRoster(team, users);
  const embed = rosterEmbed(team, users)
    .setTitle(`📝 Súmula de teste • ${clean(team.name, 80)}`)
    .setDescription([
      'Selecione todos os jogadores que participaram desta partida.',
      'Os titulares já ficam marcados para acelerar o preenchimento.'
    ].join('\n'));
  if (!roster.length) {
    embed.addFields({
      name: 'Cadastro incompleto',
      value: 'Este clube ainda não possui jogadores vinculados pelo site.',
      inline: false
    });
    return { roster, payload: { embeds: [embed], components: [] } };
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:players:${token}`)
    .setPlaceholder('Selecione quem participou')
    .setMinValues(1)
    .setMaxValues(roster.length)
    .addOptions(roster.map((item, index) => ({
      label: clean(item.name, 100),
      description: item.discordId
        ? `${item.rosterType} • Discord vinculado`
        : `${item.rosterType} • vínculo Discord pendente`,
      value: String(index),
      default: item.rosterType === 'Titular'
    })));

  return {
    roster,
    payload: {
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)]
    }
  };
}

function selectedPlayersPayload(team = {}, selected = [], token) {
  const embed = new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle('✅ Participantes selecionados')
    .setDescription([
      `**Clube:** ${clean(team.name, 80)}${team.tag ? ` [${clean(team.tag, 16)}]` : ''}`,
      `**Jogadores:** ${selected.length}`,
      '',
      selected.map(rosterLine).join('\n').slice(0, 2500),
      '',
      'Clique em **Continuar** para preencher placar, adversário, MVP e estatísticas.'
    ].join('\n'));
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`captain-stats:continue:${token}`)
          .setLabel('Continuar para os dados')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`captain-stats:restart:${token}`)
          .setLabel('Selecionar novamente')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

function statsTemplate(players = []) {
  return players.map((player) => `${player.name} | G:0 A:0 I:0 D:0`).join('\n').slice(0, 4000);
}

function matchModal(session = {}, token) {
  const players = Array.isArray(session.selected) ? session.selected : [];
  const data = session.data || {};
  return new ModalBuilder()
    .setCustomId(`captain-stats:submit:${token}`)
    .setTitle('Súmula rápida • teste')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('opponent')
          .setLabel('Adversário')
          .setPlaceholder('Ex: Griffin Gaming')
          .setValue(clean(data.opponent, 80))
          .setRequired(true)
          .setMaxLength(80)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ownScore')
          .setLabel('Gols do seu time')
          .setPlaceholder('Ex: 3')
          .setValue(data.ownScore === undefined ? '' : String(data.ownScore))
          .setRequired(true)
          .setMaxLength(3)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('opponentScore')
          .setLabel('Gols do adversário')
          .setPlaceholder('Ex: 1')
          .setValue(data.opponentScore === undefined ? '' : String(data.opponentScore))
          .setRequired(true)
          .setMaxLength(3)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('mvp')
          .setLabel('MVP da partida')
          .setPlaceholder('Nome de um dos jogadores selecionados')
          .setValue(clean(data.mvp, 80))
          .setRequired(false)
          .setMaxLength(80)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('stats')
          .setLabel('Gols, assistências, interceptações e defesas')
          .setValue(clean(data.stats, 4000) || statsTemplate(players))
          .setRequired(true)
          .setMaxLength(4000)
          .setStyle(TextInputStyle.Paragraph)
      )
    );
}

function previewPayload(session = {}, token) {
  const team = session.team || {};
  const data = session.data || {};
  const players = Array.isArray(session.selected) ? session.selected : [];
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('🧪 Revisão da súmula de teste')
    .setDescription([
      '**Competição:** futura competição / modo de teste',
      `**Partida:** ${clean(team.name, 80)} **${data.ownScore} × ${data.opponentScore}** ${clean(data.opponent, 80)}`,
      `**MVP:** ${clean(data.mvp, 80) || 'Não informado'}`,
      `**Jogadores selecionados:** ${players.length}`,
      '',
      players.map(rosterLine).join('\n').slice(0, 1300)
    ].join('\n'))
    .addFields({
      name: '📊 Estatísticas informadas',
      value: `\`\`\`\n${clean(data.stats, 950)}\n\`\`\``,
      inline: false
    })
    .setFooter({ text: 'MODO TESTE • Nenhum ponto ou resultado será salvo' });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`captain-stats:edit:${token}`)
          .setLabel('Corrigir informações')
          .setEmoji('✏️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`captain-stats:finish:${token}`)
          .setLabel('Finalizar teste')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      )
    ]
  };
}

async function loadHubData() {
  const [teams, users] = await Promise.all([
    storage.readTeams().catch(() => []),
    storage.readUsers().catch(() => [])
  ]);
  return {
    teams: Array.isArray(teams) ? teams : [],
    users: Array.isArray(users) ? users : []
  };
}

async function ensureCaptainStatsHub(client) {
  const channel = await client?.channels?.fetch?.(CAPTAIN_STATS_HUB_CHANNEL_ID).catch(() => null);
  if (!channel?.send || !channel?.messages?.fetch || !channel?.isTextBased?.()) {
    throw new Error(`Canal de Estatísticas inválido ou sem acesso: ${CAPTAIN_STATS_HUB_CHANNEL_ID}`);
  }

  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const hubs = Array.from(messages?.values?.() || []).filter((message) => (
    message.author?.id === client.user?.id &&
    message.embeds?.some?.((embed) => String(embed.footer?.text || '') === HUB_MARKER)
  ));
  const payload = panelPayload();
  const existing = hubs[0];

  for (const duplicate of hubs.slice(1)) await duplicate.delete().catch(() => null);
  if (existing?.editable) {
    const edited = await existing.edit(payload);
    await edited.pin?.('HNL: Central de Súmulas dos Capitães').catch(() => null);
    return { created: false, updated: true, channelId: edited.channelId, messageId: edited.id };
  }

  const sent = await channel.send(payload);
  await sent.pin?.('HNL: Central de Súmulas dos Capitães').catch(() => null);
  return { created: true, updated: false, channelId: sent.channelId, messageId: sent.id };
}

async function startForTeam(interaction, team, users, useUpdate = false) {
  const token = createSession(interaction.user.id, { team, users });
  const { roster, payload } = participantPickerPayload(team, users, token);
  const session = readSession(token, interaction.user.id);
  session.roster = roster;
  if (useUpdate) return interaction.update({ ...payload, allowedMentions: { parse: [] } });
  return interaction.reply({ ...payload, ephemeral: true, allowedMentions: { parse: [] } });
}

async function handleInitialAction(interaction, action) {
  const { teams, users } = await loadHubData();
  const allowedTeams = availableTeams(interaction.member, teams, users);
  if (!allowedTeams.length) {
    return interaction.reply({
      content: '❌ Não encontrei um clube em que seu Discord esteja vinculado como criador, diretor ou capitão. Confira o cadastro do clube no site.',
      ephemeral: true
    });
  }

  if (allowedTeams.length > 1) {
    const token = createSession(interaction.user.id, {
      action,
      teams: allowedTeams,
      users
    });
    return interaction.reply({
      ...teamPickerPayload(allowedTeams, token, action),
      ephemeral: true,
      allowedMentions: { parse: [] }
    });
  }

  const team = allowedTeams[0];
  if (action === 'roster') {
    return interaction.reply({
      embeds: [rosterEmbed(team, users)],
      ephemeral: true,
      allowedMentions: { users: teamRoster(team, users).map((item) => item.discordId).filter(Boolean) }
    });
  }
  return startForTeam(interaction, team, users);
}

function registerCaptainStatsHub(client) {
  if (!client || client.__hollowCaptainStatsHubRegistered) return client;
  client.__hollowCaptainStatsHubRegistered = true;

  const schedule = () => {
    const timer = setTimeout(() => {
      ensureCaptainStatsHub(client)
        .then((result) => {
          client.__hollowCaptainStatsHubStatus = { ok: true, ...result };
          console.log(
            `[Súmulas/Capitães] HUB ${result.created ? 'publicada' : 'atualizada'} no canal ${result.channelId}.`
          );
        })
        .catch((error) => {
          client.__hollowCaptainStatsHubStatus = {
            ok: false,
            channelId: CAPTAIN_STATS_HUB_CHANNEL_ID,
            error: error.message
          };
          console.error('[Súmulas/Capitães] Falha no painel:', error.message);
        });
    }, 20_000);
    timer.unref?.();
  };

  if (client.isReady?.()) schedule();
  else client.once(Events.ClientReady, schedule);

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;
    if (clean(message.content, 80).toLocaleLowerCase('pt-BR') !== '.sumulas-refresh') return;
    if (!isStaff(message.member)) return message.reply('❌ Apenas a organização pode atualizar esta HUB.');
    try {
      const result = await ensureCaptainStatsHub(client);
      client.__hollowCaptainStatsHubStatus = { ok: true, ...result };
      return message.reply(`✅ HUB de súmulas atualizada em <#${result.channelId}>.`);
    } catch (error) {
      client.__hollowCaptainStatsHubStatus = {
        ok: false,
        channelId: CAPTAIN_STATS_HUB_CHANNEL_ID,
        error: error.message
      };
      console.error('[Súmulas/Capitães] Atualização manual:', error);
      return message.reply(`❌ Não consegui atualizar a HUB: ${error.message}`);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const id = String(interaction.customId || '');
      if (!id.startsWith('captain-stats:')) return;

      if (interaction.isButton?.() && id === 'captain-stats:start') {
        return handleInitialAction(interaction, 'start');
      }
      if (interaction.isButton?.() && id === 'captain-stats:roster') {
        return handleInitialAction(interaction, 'roster');
      }
      if (interaction.isButton?.() && id === 'captain-stats:help') {
        return interaction.reply({ embeds: [helpEmbed()], ephemeral: true });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:team:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta seleção expirou. Clique novamente na HUB.', embeds: [], components: [] });
        const team = session.teams?.[Number(interaction.values?.[0])];
        if (!team) return interaction.update({ content: '❌ Clube não encontrado.', embeds: [], components: [] });
        if (session.action === 'roster') {
          return interaction.update({
            embeds: [rosterEmbed(team, session.users)],
            components: [],
            allowedMentions: { users: teamRoster(team, session.users).map((item) => item.discordId).filter(Boolean) }
          });
        }
        return startForTeam(interaction, team, session.users, true);
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:players:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const indexes = interaction.values.map(Number).filter(Number.isInteger);
        session.selected = indexes.map((index) => session.roster?.[index]).filter(Boolean);
        if (!session.selected.length) {
          return interaction.reply({ content: 'Selecione pelo menos um jogador.', ephemeral: true });
        }
        return interaction.update({
          ...selectedPlayersPayload(session.team, session.selected, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:restart:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const result = participantPickerPayload(session.team, session.users, token);
        session.roster = result.roster;
        session.selected = [];
        return interaction.update({ ...result.payload, allowedMentions: { parse: [] } });
      }

      if (interaction.isButton?.() && (
        id.startsWith('captain-stats:continue:') ||
        id.startsWith('captain-stats:edit:')
      )) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) {
          return interaction.reply({ content: '⏱️ Esta súmula expirou. Inicie novamente.', ephemeral: true });
        }
        return interaction.showModal(matchModal(session, token));
      }

      if (interaction.isModalSubmit?.() && id.startsWith('captain-stats:submit:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) {
          return interaction.reply({ content: '⏱️ Esta súmula expirou. Inicie novamente.', ephemeral: true });
        }
        const ownScore = Number(interaction.fields.getTextInputValue('ownScore'));
        const opponentScore = Number(interaction.fields.getTextInputValue('opponentScore'));
        if (![ownScore, opponentScore].every((value) => Number.isInteger(value) && value >= 0)) {
          return interaction.reply({ content: '❌ Informe placares inteiros e positivos.', ephemeral: true });
        }
        session.data = {
          opponent: interaction.fields.getTextInputValue('opponent'),
          ownScore,
          opponentScore,
          mvp: interaction.fields.getTextInputValue('mvp'),
          stats: interaction.fields.getTextInputValue('stats')
        };
        return interaction.reply({
          ...previewPayload(session, token),
          ephemeral: true,
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:finish:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula já expirou.', embeds: [], components: [] });
        sessions.delete(token);
        return interaction.update({
          content: '✅ **Teste concluído.** O clube, o elenco e a prévia foram carregados corretamente. Nenhum resultado ou ponto foi salvo.',
          embeds: [],
          components: []
        });
      }
    } catch (error) {
      console.error('[Súmulas/Capitães] Interação:', error);
      const payload = { content: `❌ Não consegui concluir esta etapa: ${error.message}`, ephemeral: true };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload).catch(() => null);
      return interaction.reply(payload).catch(() => null);
    }
  });

  return client;
}

module.exports = {
  registerCaptainStatsHub,
  ensureCaptainStatsHub,
  leadershipDiscordIds,
  teamRoster,
  availableTeams,
  panelPayload,
  participantPickerPayload,
  matchModal,
  CAPTAIN_STATS_HUB_CHANNEL_ID
};
