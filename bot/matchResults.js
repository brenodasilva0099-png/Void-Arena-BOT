const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, PermissionFlagsBits, Routes } = require('discord.js');
const storage = require('../server/storage');

const RESULTS_CHANNEL_ID = () => String(process.env.RESULTS_CHANNEL_ID || '1521257495727706234').trim();
const OPEN_PREFIX = 'result:open:';
const SUBMIT_PREFIX = 'result:submit:';

function roundKey(value = '') {
  const key = String(value || '').toLowerCase();
  return ({ slot:'slots', slots:'slots', oitavas:'slots', quarters:'quarters', quartas:'quarters', semis:'semis', semi:'semis', finals:'finals', final:'finals' })[key] || key;
}
function roundLabel(key) {
  return ({ slots:'Oitavas', quarters:'Quartas', semis:'Semifinal', finals:'Final' })[key] || key;
}
function maxGames(format='MD1') {
  const n = String(format).match(/MD(\d+)/i);
  return n ? Number(n[1]) || 1 : 1;
}
function teamIdOf(item) {
  return typeof item === 'string' ? item : String(item?.id || '');
}
function safeTeam(team={}) {
  return {
    id: String(team.id || ''),
    name: String(team.name || team.tag || 'Time').slice(0,120),
    tag: String(team.tag || '').slice(0,24),
    ownerUserId: String(team.ownerUserId || ''),
    playerAccounts: team.playerAccounts || {}
  };
}
function unique(list=[]) {
  return [...new Set(list.map((x)=>String(x||'').trim()).filter(Boolean))];
}
function discordIdFrom(value='', usersById=new Map()) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return usersById.get(raw)?.discordId || '';
}
function teamDiscordIds(team={}, users=[]) {
  const usersById = new Map(users.map((u)=>[String(u.id || ''), u]));
  const ids = [];
  const owner = usersById.get(String(team.ownerUserId || ''));
  if (owner?.discordId) ids.push(owner.discordId);
  const accounts = [
    ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
    ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [])
  ];
  accounts.forEach((value)=> {
    const id = discordIdFrom(value, usersById);
    if (id) ids.push(id);
  });
  return unique(ids);
}
function matchesFromBracket({ bracket={}, teams=[], settings={}, users=[] }={}) {
  const byId = new Map(teams.map((t)=> {
    const s = safeTeam(t);
    return [s.id, s];
  }));
  const format = settings.matchFormat || 'MD1';
  const defs = [{key:'slots', size:16}, {key:'quarters', size:8}, {key:'semis', size:4}, {key:'finals', size:2}];
  const out = [];
  for (const def of defs) {
    const arr = Array.isArray(bracket[def.key]) ? bracket[def.key] : [];
    for (let i = 0; i < def.size; i += 2) {
      const a = byId.get(teamIdOf(arr[i]));
      const b = byId.get(teamIdOf(arr[i+1]));
      if (!a || !b) continue;
      const index = Math.floor(i / 2);
      out.push({
        hubId: `${def.key}_${index}`,
        roundKey: def.key,
        roundLabel: roundLabel(def.key),
        matchIndex: index,
        matchNumber: index + 1,
        matchFormat: format,
        maxGames: maxGames(format),
        teamA: a,
        teamB: b,
        captainDiscordIds: unique([...teamDiscordIds(a, users), ...teamDiscordIds(b, users)])
      });
    }
  }
  return out;
}
function isStaff(member) {
  return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator) || member?.permissions?.has?.(PermissionFlagsBits.ManageGuild));
}
function canUse(member, match) {
  return isStaff(member) || (match.captainDiscordIds || []).includes(member?.id);
}
function embedFor(match) {
  return new EmbedBuilder()
    .setTitle('ðŸ† Resultado da Partida')
    .setColor(0x8b5cf6)
    .setDescription([
      `**${match.teamA.name}** vs **${match.teamB.name}**`,
      '',
      `**Rodada:** ${match.roundLabel} ${match.matchNumber}`,
      `**Formato:** ${match.matchFormat}`,
      `**Partidas:** 0/${match.maxGames}`,
      '',
      'Clique em **Enviar resultado** para mandar a print e o placar.'
    ].join('\n'))
    .addFields({ name: 'CapitÃ£es autorizados', value: match.captainDiscordIds.length ? match.captainDiscordIds.map((id)=>`<@${id}>`).join(', ') : 'Nenhum capitÃ£o vinculado. Staff pode enviar.' })
    .setFooter({ text: 'Void Arena â€¢ Resultados oficiais' })
    .setTimestamp(new Date());
}
async function sendHub(client, match) {
  const channelId = RESULTS_CHANNEL_ID();
  const channel = await client.channels.fetch(channelId).catch(()=>null);
  if (!channel?.send) throw new Error(`Canal de resultados invÃ¡lido: ${channelId}`);

  const sent = await channel.send({
    embeds: [embedFor(match)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${OPEN_PREFIX}${match.roundKey}:${match.matchIndex}`).setLabel('Enviar resultado').setEmoji('ðŸ“¤').setStyle(ButtonStyle.Primary)
    )],
    allowedMentions: { users: match.captainDiscordIds || [] }
  });
  return { ...match, discordChannelId: sent.channelId, discordMessageId: sent.id };
}
async function syncResultHubsForBracket(client, payload={}) {
  const bracket = payload.bracket || await storage.readBracket();
  const teams = Array.isArray(payload.teams) ? payload.teams : await storage.readTeams();
  const users = Array.isArray(payload.users) ? payload.users : await storage.readUsers();
  const settings = payload.settings || await storage.readTournamentSettings().catch(()=>({}));
  const matches = matchesFromBracket({ bracket, teams, settings, users });
  const hubs = [], errors = [];
  for (const match of matches) {
    try { hubs.push(await sendHub(client, match)); }
    catch (error) { errors.push({ match: `${match.teamA?.name} vs ${match.teamB?.name}`, message: error.message }); }
  }
  return { success:true, resultsChannelId: RESULTS_CHANNEL_ID(), totalMatches: matches.length, created: hubs.length, hubs, errors };
}
function readModal(raw, id) {
  for (const row of raw?.data?.components || []) {
    if (row.component?.custom_id === id) return String(row.component.value || '').trim();
  }
  return '';
}
function upload(raw, id) {
  for (const row of raw?.data?.components || []) {
    const c = row.component || {};
    if (c.custom_id === id && Array.isArray(c.values)) {
      const resolved = raw?.data?.resolved?.attachments || {};
      const found = c.values.map(String).map((v)=>resolved[v]).find(Boolean);
      if (!found) return null;
      return {
        id: String(found.id || ''),
        url: String(found.url || ''),
        proxyUrl: String(found.proxy_url || found.proxyURL || found.proxyUrl || ''),
        name: String(found.filename || found.name || 'resultado').slice(0,160),
        contentType: String(found.content_type || found.contentType || ''),
        size: Number(found.size || 0) || 0
      };
    }
  }
  return null;
}
async function showModal(interaction, match) {
  await interaction.client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
    body: {
      type: 9,
      data: {
        custom_id: `${SUBMIT_PREFIX}${match.roundKey}:${match.matchIndex}`,
        title: 'Enviar resultado',
        components: [
          { type:18, label:'Print do resultado', description:'Envie a print/comprovante da partida.', component:{ type:19, custom_id:'proof', min_values:1, max_values:1, required:true } },
          { type:18, label:`Gols ${match.teamA.tag || match.teamA.name}`.slice(0,45), component:{ type:4, custom_id:'scoreA', style:1, min_length:1, max_length:3, required:true, placeholder:'0' } },
          { type:18, label:`Gols ${match.teamB.tag || match.teamB.name}`.slice(0,45), component:{ type:4, custom_id:'scoreB', style:1, min_length:1, max_length:3, required:true, placeholder:'0' } },
          { type:18, label:'Partidas jÃ¡ jogadas', component:{ type:4, custom_id:'played', style:1, min_length:1, max_length:3, required:true, placeholder:String(match.maxGames || 1) } },
          { type:18, label:'Partidas faltando', component:{ type:4, custom_id:'remaining', style:1, min_length:1, max_length:3, required:true, placeholder:'0' } }
        ]
      }
    }
  });
}
async function currentMatch(round, index) {
  const [bracket, teams, users, settings] = await Promise.all([
    storage.readBracket(),
    storage.readTeams(),
    storage.readUsers(),
    storage.readTournamentSettings().catch(()=>({}))
  ]);
  return matchesFromBracket({ bracket, teams, users, settings }).find((m)=>m.roundKey === round && m.matchIndex === index);
}
async function submitToSite(interaction, raw, match) {
  await interaction.deferReply({ ephemeral:true });
  const proof = upload(raw, 'proof');
  if (!proof?.url) return interaction.editReply('âŒ NÃ£o achei a print enviada.');
  const payload = {
    roundKey: match.roundKey,
    matchIndex: match.matchIndex,
    match,
    scoreA: Number(readModal(raw,'scoreA')),
    scoreB: Number(readModal(raw,'scoreB')),
    playedGames: Number(readModal(raw,'played')),
    remainingGames: Number(readModal(raw,'remaining')),
    proof,
    authorDiscordId: interaction.user.id,
    authorName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
    isStaff: isStaff(interaction.member),
    createdAt: new Date().toISOString()
  };
  if (![payload.scoreA, payload.scoreB, payload.playedGames, payload.remainingGames].every(Number.isFinite)) {
    return interaction.editReply('âŒ Preencha os nÃºmeros corretamente.');
  }
  const siteUrl = String(process.env.SITE_API_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\/$/,'');
  const token = process.env.SITE_REALTIME_TOKEN || process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
  const response = await fetch(`${siteUrl}/internal/results/submit`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'x-site-realtime-token':token, 'x-bot-api-key':token, 'x-internal-token':token },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok || data.success === false) throw new Error(data.message || `Site recusou (${response.status})`);
  const msg = data.result?.status === 'validated'
    ? 'âœ… Resultado validado e chaveamento atualizado no site.'
    : data.result?.status === 'conflict'
      ? 'âš ï¸ Resultado salvo, mas deu conflito. Staff precisa resolver.'
      : 'âœ… Resultado salvo. Aguardando confirmaÃ§Ã£o do outro capitÃ£o.';
  return interaction.editReply(msg);
}
function registerMatchResultHandlers(client) {
  if (!client || client.__matchResultsReady) return client;
  client.__matchResultsReady = true;
  const rawMap = new Map();
  client.on('raw', (p)=> {
    if (p?.t === 'INTERACTION_CREATE' && p?.d?.id) {
      rawMap.set(p.d.id, p.d);
      setTimeout(()=>rawMap.delete(p.d.id), 120000);
    }
  });
  client.on(Events.MessageCreate, async (message)=> {
    try {
      if (!message.guild || message.author.bot) return;
      const text = String(message.content || '').trim();
      if (!text.startsWith('.resultado-hub') && text !== '.resultados-sync') return;
      if (!isStaff(message.member)) return message.reply('âŒ Apenas staff pode usar esse comando.');
      if (text === '.resultados-sync') {
        const r = await syncResultHubsForBracket(message.client);
        return message.reply(`âœ… HUBs sincronizadas: ${r.created}/${r.totalMatches}.`);
      }
      const [, roundArg='slots', numArg='1'] = text.split(/\s+/);
      const match = await currentMatch(roundKey(roundArg), Math.max(0, Number(numArg || 1) - 1));
      if (!match) return message.reply('âŒ NÃ£o achei esse confronto completo no chaveamento.');
      await sendHub(message.client, match);
      return message.reply(`âœ… HUB criada para **${match.teamA.name} vs ${match.teamB.name}**.`);
    } catch (e) {
      console.error('Erro resultados:', e);
      return message.reply(`âŒ Erro: ${e.message}`).catch(()=>{});
    }
  });
  client.on(Events.InteractionCreate, async (interaction)=> {
    try {
      const id = String(interaction.customId || '');
      if (interaction.isButton?.() && id.startsWith(OPEN_PREFIX)) {
        const [round, idx] = id.slice(OPEN_PREFIX.length).split(':');
        const match = await currentMatch(round, Number(idx));
        if (!match) return interaction.reply({ content:'âŒ Confronto nÃ£o encontrado.', ephemeral:true });
        if (!canUse(interaction.member, match)) return interaction.reply({ content:'âŒ Apenas capitÃ£es desses times ou staff podem enviar.', ephemeral:true });
        return showModal(interaction, match);
      }
      if (interaction.isModalSubmit?.() && id.startsWith(SUBMIT_PREFIX)) {
        const [round, idx] = id.slice(SUBMIT_PREFIX.length).split(':');
        const match = await currentMatch(round, Number(idx));
        if (!match) return interaction.reply({ content:'âŒ Confronto nÃ£o encontrado.', ephemeral:true });
        if (!canUse(interaction.member, match)) return interaction.reply({ content:'âŒ Apenas capitÃ£es desses times ou staff podem enviar.', ephemeral:true });
        return submitToSite(interaction, rawMap.get(interaction.id), match);
      }
    } catch (e) {
      console.error('Erro interaÃ§Ã£o resultado:', e);
      if (interaction.deferred || interaction.replied) return interaction.editReply(`âŒ Erro: ${e.message}`).catch(()=>{});
      return interaction.reply({ content:`âŒ Erro: ${e.message}`, ephemeral:true }).catch(()=>{});
    }
  });
  return client;
}
module.exports = { registerMatchResultHandlers, syncResultHubsForBracket };

