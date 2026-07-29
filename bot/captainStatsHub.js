const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  FileUploadBuilder,
  LabelBuilder,
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

function safeAvatarUrl(value = '') {
  const url = clean(value, 1200);
  return /^https?:\/\//i.test(url) ? url : '';
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
      avatar: safeAvatarUrl(
        linkedUser?.avatar ||
        linkedUser?.profile?.avatar ||
        (typeof detail === 'object' ? detail.avatar : '')
      ),
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

function playerCardEmbed(player = {}, { selected = false, stats = null, pending = false } = {}) {
  const embed = new EmbedBuilder()
    .setColor(selected ? 0x22d3ee : 0x312e81)
    .setAuthor({
      name: clean(player.name || 'Jogador', 80),
      ...(player.avatar ? { iconURL: player.avatar } : {})
    })
    .setDescription([
      `${player.rosterType === 'Reserva' ? '🪑 Reserva' : '⚽ Titular'}${player.discordId ? ' · Discord vinculado' : ' · vínculo pendente'}`,
      player.discordId ? `<@${player.discordId}>` : '',
      stats
        ? `${pending ? '⏳ Pendente' : '✅ Preenchido'} · G ${stats.goals || 0} · A ${stats.assists || 0} · I ${stats.interceptions || 0} · D ${stats.defenses || 0}`
        : (selected ? '✅ Participará da súmula' : 'Clique no seletor abaixo para incluir')
    ].filter(Boolean).join('\n'));
  return embed;
}

function playerCards(players = [], options = {}) {
  return players.slice(0, 8).map((player) => playerCardEmbed(player, {
    ...options,
    stats: typeof options.statsFor === 'function' ? options.statsFor(player) : options.stats,
    pending: typeof options.pendingFor === 'function' ? options.pendingFor(player) : options.pending
  }));
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
      '**Envio guiado de resultados e estatísticas das competições.**',
      '',
      'O bot reconhece seu Discord, encontra automaticamente o seu clube e carrega os dados cadastrados no site.',
      '',
      'Clique no botão abaixo para abrir seu painel privado. A mensagem pública fica limpa e nenhuma informação da súmula aparece para outras pessoas.',
      '',
      '🧪 **Modo atual:** teste seguro. Nenhum resultado ou ponto será salvo.'
    ].join('\n'))
    .addFields({
      name: 'Dados utilizados',
      value: `[Clubes e elencos cadastrados no site](${SITE_URL}/pages/clubes.html)`,
      inline: false
    })
    .setFooter({ text: HUB_MARKER })
    .setTimestamp(new Date());

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('captain-stats:start')
          .setLabel('Abrir painel')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Primary)
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
      '2. Você confere os cartões com avatar e seleciona quem participou.',
      '3. Informa competição, confronto, placar e MVP.',
      '4. Preenche gols, assistências, interceptações e defesas por jogador.',
      '5. O bot mostra uma revisão curta antes de finalizar.',
      '',
      'Se todos ficaram com zero, o botão **Confirmar zeros restantes** evita preenchimento repetitivo.',
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

const ROUND_OPTIONS = [
  'Fase de grupos',
  'Rodada 1',
  'Rodada 2',
  'Rodada 3',
  'Oitavas de final',
  'Quartas de final',
  'Semifinal',
  'Final',
  'Disputa de 3º lugar',
  'Amistoso / teste'
];

function eventStatusLabel(status = '') {
  return ({
    open: 'Inscrições abertas',
    running: 'Em andamento',
    closed: 'Inscrições encerradas',
    finished: 'Encerrada'
  })[String(status || '').toLowerCase()] || 'Competição cadastrada';
}

function selectedOption(option = {}, selectedValue = '') {
  return {
    ...option,
    default: String(option.value || '') === String(selectedValue || '')
  };
}

function participantSummary(players = []) {
  if (!players.length) return 'Nenhum participante selecionado.';
  return players.map(rosterLine).join('\n').slice(0, 1024);
}

function matchSetupPayload(session = {}, token) {
  const team = session.team || {};
  const data = session.data ||= {};
  const roster = Array.isArray(session.roster) ? session.roster : [];
  const events = Array.isArray(session.events) ? session.events : [];
  const opponents = (Array.isArray(session.allTeams) ? session.allTeams : [])
    .filter((candidate) => (
      candidate?.id &&
      candidate?.name &&
      String(candidate.id) !== String(team.id)
    ))
    .slice(0, 25);

  const eventOptions = events.slice(0, 24).map((event) => selectedOption({
    label: clean(event.name || event.title || 'Competição', 100),
    description: clean(eventStatusLabel(event.status), 100),
    value: String(event.id)
  }, data.competitionId));
  eventOptions.push(selectedOption({
    label: 'Amistoso / teste',
    description: 'Súmula sem competição vinculada',
    value: '__test__'
  }, data.competitionId));

  const competition = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:setup-competition:${token}`)
    .setPlaceholder('1. Selecione a competição')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(eventOptions);
  const round = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:setup-round:${token}`)
    .setPlaceholder('2. Selecione a rodada / fase')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(ROUND_OPTIONS.map((label, index) => selectedOption({
      label,
      value: String(index)
    }, data.roundId)));
  const opponent = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:setup-opponent:${token}`)
    .setPlaceholder('3. Selecione o adversário cadastrado')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(opponents.length ? opponents.map((candidate) => selectedOption({
      label: clean(candidate.name, 100),
      description: clean(candidate.tag ? `Tag: ${candidate.tag}` : 'Clube cadastrado no site', 100),
      value: String(candidate.id)
    }, data.opponentId)) : [{
      label: 'Nenhum adversário disponível',
      value: '__none__',
      description: 'Cadastre outro clube no site',
      default: data.opponentId === '__none__'
    }]);
  const participants = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:setup-players:${token}`)
    .setPlaceholder('4. Selecione todos que participaram')
    .setMinValues(1)
    .setMaxValues(Math.max(1, roster.length))
    .setDisabled(!roster.length)
    .addOptions(roster.length ? roster.map((player, index) => ({
      label: clean(player.name, 100),
      description: `${player.rosterType}${player.discordId ? ' • Discord vinculado' : ' • vínculo pendente'}`,
      value: String(index),
      default: (session.selected || []).some((item) => item.identity === player.identity)
    })) : [{
      label: 'Elenco vazio',
      value: '__none__',
      description: 'Atualize o elenco no site'
    }]);

  const ready = Boolean(
    data.competitionId &&
    data.round &&
    data.opponentId &&
    data.opponentId !== '__none__' &&
    Array.isArray(session.selected) &&
    session.selected.length
  );
  const embed = new EmbedBuilder()
    .setColor(ready ? 0x22d3ee : 0x8b5cf6)
    .setTitle(`📋 Painel da súmula • ${clean(team.name, 80)}`)
    .setDescription([
      '**Etapa 1 de 4 — dados guiados**',
      'Use as listas abaixo. O bot só aceita clubes e jogadores cadastrados, reduzindo erros de digitação.',
      '',
      `**Competição:** ${clean(data.competition, 100) || 'Selecione abaixo'}`,
      `**Rodada/fase:** ${clean(data.round, 100) || 'Selecione abaixo'}`,
      `**Adversário:** ${clean(data.opponent, 100) || 'Selecione abaixo'}`,
      `**Participantes do seu time:** ${(session.selected || []).length}/${roster.length}`,
      '',
      '**Lista atual**',
      participantSummary(session.selected || [])
    ].join('\n'));

  return {
    embeds: [
      embed,
      ...playerCards(session.selected || [], { selected: true })
    ].slice(0, 10),
    components: [
      new ActionRowBuilder().addComponents(competition),
      new ActionRowBuilder().addComponents(round),
      new ActionRowBuilder().addComponents(opponent),
      new ActionRowBuilder().addComponents(participants),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`captain-stats:continue:${token}`)
          .setLabel('Continuar para MVP e placar')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!ready)
      )
    ]
  };
}

function mvpCandidatesFor(session = {}) {
  const opponent = (session.allTeams || []).find((team) => (
    String(team.id || '') === String(session.data?.opponentId || '')
  ));
  const players = [
    ...(session.selected || []),
    ...teamRoster(opponent || {}, session.users || []).map((player) => ({
      ...player,
      opponent: true
    }))
  ];
  const unique = new Map();
  for (const player of players) {
    const key = String(player.identity || player.discordId || player.userId || player.name || '');
    if (key && !unique.has(key)) unique.set(key, player);
  }
  return Array.from(unique.values()).slice(0, 25);
}

function mvpPickerPayload(session = {}, token) {
  const data = session.data ||= {};
  const candidates = mvpCandidatesFor(session);
  session.mvpCandidates = candidates;
  const embed = new EmbedBuilder()
    .setColor(data.mvpIdentity ? 0x22d3ee : 0x8b5cf6)
    .setTitle('⭐ MVP, placar e comprovação')
    .setDescription([
      '**Etapa 2 de 4 — confronto**',
      `**Partida:** ${clean(session.team?.name, 80)} × ${clean(data.opponent, 80)}`,
      `**Competição:** ${clean(data.competition, 80)} • ${clean(data.round, 80)}`,
      `**Participantes selecionados:** ${(session.selected || []).length}`,
      '',
      'O MVP pode ser de qualquer um dos dois times, inclusive do time derrotado.',
      'Depois de selecionar, informe o placar e envie a print do fim da partida.'
    ].join('\n'))
    .addFields({
      name: 'Seu time na partida',
      value: participantSummary(session.selected || []),
      inline: false
    });
  const mvp = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:mvp:${token}`)
    .setPlaceholder('Selecione o MVP entre os dois times')
    .setMinValues(1)
    .setMaxValues(1)
    .setDisabled(!candidates.length)
    .addOptions(candidates.length ? candidates.map((player, index) => ({
      label: clean(player.name, 100),
      description: clean(player.opponent
        ? `${data.opponent} • adversário`
        : `${session.team?.name || 'Seu time'} • participante`,
      100),
      value: String(index),
      default: String(player.identity || '') === String(data.mvpIdentity || '')
    })) : [{
      label: 'Nenhum jogador disponível',
      description: 'Revise os elencos cadastrados no site',
      value: '__none__'
    }]);
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(mvp),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`captain-stats:proof:${token}`)
          .setLabel('Informar placar e enviar print')
          .setEmoji('📎')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!data.mvpIdentity),
        new ButtonBuilder()
          .setCustomId(`captain-stats:back-setup:${token}`)
          .setLabel('Voltar e alterar')
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

function participantPickerPayload(team = {}, users = [], token) {
  const roster = teamRoster(team, users);
  const starters = roster.filter((item) => item.rosterType === 'Titular');
  const embed = rosterEmbed(team, users)
    .setTitle(`📝 Súmula de teste • ${clean(team.name, 80)}`)
    .setDescription([
      '**Etapa 1 de 4 — participantes**',
      'Confira os cartões e selecione quem realmente participou.',
      'Para ganhar tempo, use **Todos os titulares** quando o time inicial inteiro jogou.'
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
      value: String(index)
    })));

  return {
    roster,
    payload: {
      embeds: [
        embed,
        ...playerCards(roster),
        ...(roster.length > 8 ? [new EmbedBuilder()
          .setColor(0x312e81)
          .setDescription(`Mais ${roster.length - 8} jogador(es) estão disponíveis no seletor.`)] : [])
      ],
      components: [
        new ActionRowBuilder().addComponents(menu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`captain-stats:starters:${token}`)
            .setLabel(`Todos os titulares (${starters.length})`)
            .setEmoji('⚽')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!starters.length)
        )
      ]
    }
  };
}

function selectedPlayersPayload(team = {}, selected = [], token) {
  const embed = new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle('✅ Participantes selecionados')
    .setDescription([
      '**Etapa 1 de 4 concluída**',
      `**Clube:** ${clean(team.name, 80)}${team.tag ? ` [${clean(team.tag, 16)}]` : ''}`,
      `**Jogadores:** ${selected.length}`,
      '',
      'Confira os cartões e clique em **Continuar** para informar a partida.'
    ].join('\n'));
  return {
    embeds: [
      embed,
      ...playerCards(selected, { selected: true }),
      ...(selected.length > 8 ? [new EmbedBuilder()
        .setColor(0x22d3ee)
        .setDescription(`Mais ${selected.length - 8} jogador(es) também foram selecionados.`)] : [])
    ],
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

function matchModal(session = {}, token) {
  const data = session.data || {};
  const score = new TextInputBuilder()
    .setCustomId('score')
    .setPlaceholder('Ex: 3 x 1')
    .setValue(data.ownScore === undefined ? '' : `${data.ownScore} x ${data.opponentScore}`)
    .setRequired(true)
    .setMaxLength(12)
    .setStyle(TextInputStyle.Short);
  const game = new TextInputBuilder()
    .setCustomId('game')
    .setPlaceholder('Ex: Jogo 1 da MD3')
    .setValue(clean(data.game, 80))
    .setRequired(false)
    .setMaxLength(80)
    .setStyle(TextInputStyle.Short);
  const proof = new FileUploadBuilder()
    .setCustomId('proof')
    .setMinValues(1)
    .setMaxValues(1);

  return new ModalBuilder()
    .setCustomId(`captain-stats:match-submit:${token}`)
    .setTitle('Placar e comprovante')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Placar: seu time x adversário')
        .setDescription('Use o formato 3 x 1.')
        .setTextInputComponent(score),
      new LabelBuilder()
        .setLabel('Jogo / confronto')
        .setDescription('Opcional: identifique o jogo da série.')
        .setTextInputComponent(game),
      new LabelBuilder()
        .setLabel('Print do fim da partida')
        .setDescription('Envie uma imagem legível para a organização validar o placar.')
        .setFileUploadComponent(proof)
    );
}

function blankPlayerStats() {
  return {
    goals: 0,
    assists: 0,
    interceptions: 0,
    defenses: 0,
    confirmed: false
  };
}

function statsFor(session = {}, player = {}) {
  session.playerStats ||= {};
  const key = String(player.identity || player.discordId || player.userId || player.name || '');
  session.playerStats[key] ||= blankPlayerStats();
  return session.playerStats[key];
}

function allStatsConfirmed(session = {}) {
  const players = Array.isArray(session.selected) ? session.selected : [];
  return Boolean(players.length) && players.every((player) => statsFor(session, player).confirmed);
}

function playerStatsModal(session = {}, token, index = 0) {
  const player = session.selected?.[index];
  const stats = statsFor(session, player || {});
  return new ModalBuilder()
    .setCustomId(`captain-stats:player-submit:${token}:${index}`)
    .setTitle(`Estatísticas • ${clean(player?.name || 'Jogador', 30)}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('goals')
          .setLabel('Gols')
          .setValue(String(stats.goals || 0))
          .setRequired(true)
          .setMaxLength(3)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('assists')
          .setLabel('Assistências')
          .setValue(String(stats.assists || 0))
          .setRequired(true)
          .setMaxLength(3)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('interceptions')
          .setLabel('Interceptações')
          .setValue(String(stats.interceptions || 0))
          .setRequired(true)
          .setMaxLength(3)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('defenses')
          .setLabel('Defesas')
          .setValue(String(stats.defenses || 0))
          .setRequired(true)
          .setMaxLength(3)
          .setStyle(TextInputStyle.Short)
      )
    );
}

function statsDashboardPayload(session = {}, token) {
  const team = session.team || {};
  const data = session.data || {};
  const players = Array.isArray(session.selected) ? session.selected : [];
  const completed = players.filter((player) => statsFor(session, player).confirmed).length;
  const embed = new EmbedBuilder()
    .setColor(completed === players.length ? 0x22c55e : 0x8b5cf6)
    .setTitle('📊 Estatísticas individuais')
    .setDescription([
      '**Etapa 3 de 4 — desempenho dos participantes**',
      `**Partida:** ${clean(team.name, 80)} ${data.ownScore} × ${data.opponentScore} ${clean(data.opponent, 80)}`,
      `**Preenchidos:** ${completed}/${players.length}`,
      '',
      'Escolha um cartão pelo menu para informar gols, assistências, interceptações e defesas.',
      'Se ninguém teve estatística individual, use **Confirmar zeros restantes**.'
    ].join('\n'));
  const selector = new StringSelectMenuBuilder()
    .setCustomId(`captain-stats:player-stats:${token}`)
    .setPlaceholder('Escolha um jogador para preencher')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(players.map((player, index) => {
      const stats = statsFor(session, player);
      return {
        label: clean(player.name, 100),
        description: stats.confirmed
          ? `Preenchido • G ${stats.goals} A ${stats.assists} I ${stats.interceptions} D ${stats.defenses}`
          : 'Pendente • toque para preencher',
        value: String(index),
        emoji: stats.confirmed ? '✅' : '⏳'
      };
    }));
  return {
    embeds: [
      embed,
      ...playerCards(players, {
        selected: true,
        statsFor: (player) => statsFor(session, player),
        pendingFor: (player) => !statsFor(session, player).confirmed
      }),
      ...(players.length > 8 ? [new EmbedBuilder()
        .setColor(0x312e81)
        .setDescription(`Mais ${players.length - 8} jogador(es) estão disponíveis no seletor.`)] : [])
    ],
    components: [
      new ActionRowBuilder().addComponents(selector),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`captain-stats:zero:${token}`)
          .setLabel('Confirmar zeros restantes')
          .setEmoji('0️⃣')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(completed === players.length),
        new ButtonBuilder()
          .setCustomId(`captain-stats:review:${token}`)
          .setLabel('Revisar súmula')
          .setEmoji('🔎')
          .setStyle(ButtonStyle.Success)
          .setDisabled(completed !== players.length),
        new ButtonBuilder()
          .setCustomId(`captain-stats:edit-match:${token}`)
          .setLabel('Editar partida')
          .setEmoji('✏️')
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

function statLine(player = {}, stats = {}) {
  const label = player.discordId ? `<@${player.discordId}>` : `**${clean(player.name, 80)}**`;
  return `${label} — G ${stats.goals || 0} · A ${stats.assists || 0} · I ${stats.interceptions || 0} · D ${stats.defenses || 0}`;
}

function previewPayload(session = {}, token) {
  const team = session.team || {};
  const data = session.data || {};
  const players = Array.isArray(session.selected) ? session.selected : [];
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('🧪 Revisão da súmula de teste')
    .setDescription([
      '**Etapa 4 de 4 — revisão final**',
      `**Competição:** ${clean(data.competition, 80)}`,
      `**Confronto:** ${clean(data.round, 80)}${data.game ? ` • ${clean(data.game, 80)}` : ''}`,
      `**Partida:** ${clean(team.name, 80)} **${data.ownScore} × ${data.opponentScore}** ${clean(data.opponent, 80)}`,
      `**MVP:** ${data.mvpDiscordId ? `<@${data.mvpDiscordId}>` : clean(data.mvp, 80) || 'Não informado'}`,
      `**Comprovante:** ${data.proof?.url ? `[${clean(data.proof.name || 'Abrir print', 80)}](${data.proof.url})` : 'Não enviado'}`,
      `**Jogadores selecionados:** ${players.length}`,
      '',
      players.map((player) => statLine(player, statsFor(session, player))).join('\n').slice(0, 3000)
    ].join('\n'))
    .setFooter({ text: 'MODO TESTE • Nenhum ponto ou resultado será salvo' });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`captain-stats:edit-match:${token}`)
          .setLabel('Editar partida')
          .setEmoji('✏️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`captain-stats:edit-stats:${token}`)
          .setLabel('Editar estatísticas')
          .setEmoji('📊')
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
  const [teams, users, events] = await Promise.all([
    storage.readTeams().catch(() => []),
    storage.readUsers().catch(() => []),
    storage.readEvents().catch(() => [])
  ]);
  return {
    teams: Array.isArray(teams) ? teams : [],
    users: Array.isArray(users) ? users : [],
    events: Array.isArray(events) ? events : []
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

async function startForTeam(interaction, team, users, allTeams, events, useUpdate = false) {
  const roster = teamRoster(team, users);
  const token = createSession(interaction.user.id, {
    team,
    users,
    allTeams,
    events,
    roster,
    selected: [],
    data: {},
    playerStats: {}
  });
  const session = readSession(token, interaction.user.id);
  const payload = matchSetupPayload(session, token);
  if (useUpdate) return interaction.update({ ...payload, allowedMentions: { parse: [] } });
  return interaction.reply({ ...payload, ephemeral: true, allowedMentions: { parse: [] } });
}

async function handleInitialAction(interaction, action) {
  const { teams, users, events } = await loadHubData();
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
      users,
      allTeams: teams,
      events
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
  return startForTeam(interaction, team, users, teams, events);
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
        return startForTeam(
          interaction,
          team,
          session.users,
          session.allTeams || session.teams,
          session.events || [],
          true
        );
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:setup-competition:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const eventId = String(interaction.values?.[0] || '');
        const event = (session.events || []).find((item) => String(item.id || '') === eventId);
        session.data ||= {};
        session.data.competitionId = eventId;
        session.data.competition = event
          ? clean(event.name || event.title, 100)
          : 'Amistoso / teste';
        return interaction.update({
          ...matchSetupPayload(session, token),
          allowedMentions: { users: (session.selected || []).map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:setup-round:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const roundId = String(interaction.values?.[0] || '');
        session.data ||= {};
        session.data.roundId = roundId;
        session.data.round = ROUND_OPTIONS[Number(roundId)] || '';
        return interaction.update({
          ...matchSetupPayload(session, token),
          allowedMentions: { users: (session.selected || []).map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:setup-opponent:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const opponentId = String(interaction.values?.[0] || '');
        const opponent = (session.allTeams || []).find((team) => String(team.id || '') === opponentId);
        session.data ||= {};
        session.data.opponentId = opponentId;
        session.data.opponent = clean(opponent?.name, 100);
        session.data.mvp = '';
        session.data.mvpIdentity = '';
        session.data.mvpDiscordId = '';
        return interaction.update({
          ...matchSetupPayload(session, token),
          allowedMentions: { users: (session.selected || []).map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:setup-players:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const indexes = interaction.values.map(Number).filter(Number.isInteger);
        session.selected = indexes.map((index) => session.roster?.[index]).filter(Boolean);
        session.playerStats = {};
        return interaction.update({
          ...matchSetupPayload(session, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:players:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const indexes = interaction.values.map(Number).filter(Number.isInteger);
        session.selected = indexes.map((index) => session.roster?.[index]).filter(Boolean);
        session.playerStats = {};
        if (!session.selected.length) {
          return interaction.reply({ content: 'Selecione pelo menos um jogador.', ephemeral: true });
        }
        return interaction.update({
          ...selectedPlayersPayload(session.team, session.selected, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:starters:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        session.selected = (session.roster || []).filter((player) => player.rosterType === 'Titular');
        session.playerStats = {};
        if (!session.selected.length) {
          return interaction.reply({ content: '❌ Nenhum titular foi encontrado no cadastro deste clube.', ephemeral: true });
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
        session.playerStats = {};
        return interaction.update({ ...result.payload, allowedMentions: { parse: [] } });
      }

      if (interaction.isButton?.() && (
        id.startsWith('captain-stats:continue:')
      )) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (
          !session?.selected?.length ||
          !session.data?.competitionId ||
          !session.data?.round ||
          !session.data?.opponentId
        ) {
          return interaction.reply({ content: '⏱️ Esta súmula expirou. Inicie novamente.', ephemeral: true });
        }
        return interaction.update({
          ...mvpPickerPayload(session, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && (
        id.startsWith('captain-stats:back-setup:') ||
        id.startsWith('captain-stats:edit-match:')
      )) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        return interaction.update({
          ...matchSetupPayload(session, token),
          allowedMentions: { users: (session.selected || []).map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:mvp:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        const player = (session.mvpCandidates || mvpCandidatesFor(session))[Number(interaction.values?.[0])];
        if (!player) return interaction.reply({ content: '❌ MVP não encontrado nos dois elencos.', ephemeral: true });
        session.data ||= {};
        session.data.mvp = clean(player.name, 80);
        session.data.mvpIdentity = String(player.identity || '');
        session.data.mvpDiscordId = clean(player.discordId, 40);
        return interaction.update({
          ...mvpPickerPayload(session, token),
          allowedMentions: { users: [player.discordId, ...(session.selected || []).map((item) => item.discordId)].filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:proof:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.data?.mvpIdentity) {
          return interaction.reply({ content: '❌ Selecione o MVP antes de informar o placar.', ephemeral: true });
        }
        return interaction.showModal(matchModal(session, token));
      }

      if (interaction.isModalSubmit?.() && id.startsWith('captain-stats:match-submit:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) {
          return interaction.reply({ content: '⏱️ Esta súmula expirou. Inicie novamente.', ephemeral: true });
        }
        const score = clean(interaction.fields.getTextInputValue('score'), 20).match(/^(\d{1,3})\s*(?:x|×|-)\s*(\d{1,3})$/i);
        if (!score) {
          return interaction.reply({ content: '❌ Informe o placar no formato **3 x 1**.', ephemeral: true });
        }
        const uploadedFiles = interaction.fields.getUploadedFiles('proof', true);
        const attachment = Array.from(uploadedFiles?.values?.() || [])[0];
        const contentType = clean(attachment?.contentType, 120);
        const fileName = clean(attachment?.name, 160);
        const imageFile = /^image\//i.test(contentType) ||
          /\.(?:png|jpe?g|webp|gif)$/i.test(fileName) ||
          /\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(String(attachment?.url || ''));
        if (!attachment?.url || !imageFile) {
          return interaction.reply({
            content: '❌ Envie uma **imagem** do fim da partida (PNG, JPG, WEBP ou GIF).',
            ephemeral: true
          });
        }
        session.data = {
          ...session.data,
          ownScore: Number(score[1]),
          opponentScore: Number(score[2]),
          game: interaction.fields.getTextInputValue('game'),
          proof: {
            id: clean(attachment.id, 80),
            url: clean(attachment.url, 1200),
            name: fileName || 'comprovante-da-partida',
            contentType
          }
        };
        session.selected.forEach((player) => statsFor(session, player));
        const payload = {
          ...statsDashboardPayload(session, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        };
        if (interaction.isFromMessage?.()) return interaction.update(payload);
        return interaction.reply({ ...payload, ephemeral: true });
      }

      if (interaction.isStringSelectMenu?.() && id.startsWith('captain-stats:player-stats:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) return interaction.reply({ content: '⏱️ Esta súmula expirou. Inicie novamente.', ephemeral: true });
        const index = Number(interaction.values?.[0]);
        if (!Number.isInteger(index) || !session.selected[index]) {
          return interaction.reply({ content: '❌ Jogador não encontrado nesta súmula.', ephemeral: true });
        }
        return interaction.showModal(playerStatsModal(session, token, index));
      }

      if (interaction.isModalSubmit?.() && id.startsWith('captain-stats:player-submit:')) {
        const [, , token, indexValue] = id.split(':');
        const session = readSession(token, interaction.user.id);
        const index = Number(indexValue);
        const player = session?.selected?.[index];
        if (!session || !player) return interaction.reply({ content: '⏱️ Esta súmula expirou. Inicie novamente.', ephemeral: true });
        const fields = ['goals', 'assists', 'interceptions', 'defenses'];
        const values = Object.fromEntries(fields.map((field) => [field, Number(interaction.fields.getTextInputValue(field))]));
        if (!fields.every((field) => Number.isInteger(values[field]) && values[field] >= 0 && values[field] <= 999)) {
          return interaction.reply({ content: '❌ Use apenas números inteiros de 0 a 999 nas estatísticas.', ephemeral: true });
        }
        session.playerStats[String(player.identity || player.discordId || player.userId || player.name)] = {
          ...values,
          confirmed: true
        };
        const payload = {
          ...statsDashboardPayload(session, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        };
        if (interaction.isFromMessage?.()) return interaction.update(payload);
        return interaction.reply({ ...payload, ephemeral: true });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:zero:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        session.selected.forEach((player) => {
          const stats = statsFor(session, player);
          if (!stats.confirmed) stats.confirmed = true;
        });
        return interaction.update({
          ...statsDashboardPayload(session, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:review:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        if (!allStatsConfirmed(session)) {
          return interaction.reply({ content: 'Preencha todos os jogadores ou confirme os zeros restantes antes de revisar.', ephemeral: true });
        }
        return interaction.update({
          ...previewPayload(session, token),
          allowedMentions: { users: session.selected.map((item) => item.discordId).filter(Boolean) }
        });
      }

      if (interaction.isButton?.() && id.startsWith('captain-stats:edit-stats:')) {
        const token = id.split(':').pop();
        const session = readSession(token, interaction.user.id);
        if (!session?.selected?.length) return interaction.update({ content: '⏱️ Esta súmula expirou. Inicie novamente.', embeds: [], components: [] });
        return interaction.update({
          ...statsDashboardPayload(session, token),
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
  matchSetupPayload,
  mvpPickerPayload,
  participantPickerPayload,
  selectedPlayersPayload,
  matchModal,
  playerStatsModal,
  statsDashboardPayload,
  previewPayload,
  CAPTAIN_STATS_HUB_CHANNEL_ID
};
