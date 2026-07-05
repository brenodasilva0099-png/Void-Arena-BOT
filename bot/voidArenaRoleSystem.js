const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits
} = require('discord.js');

const ROLE_ID = process.env.VOID_ARENA_ROLE_ID || '1523438475716853851';
const LOBBY_CHANNEL_ID = process.env.VOID_ARENA_LOBBY_CHANNEL_ID || '1523440429167677511';
const HISTORY_CHANNEL_ID = process.env.RESULTS_HISTORY_CHANNEL_ID || process.env.RESULT_HISTORY_CHANNEL_ID || '1518441859519877120';
const CLAIM_ID = 'voidarena:role:claim';

function rolePermissions() {
  return [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
    PermissionFlagsBits.UseVAD,
    PermissionFlagsBits.Stream,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.SendMessages
  ];
}

async function ensureRoleBasePermissions(guild) {
  const role = await guild?.roles?.fetch?.(ROLE_ID).catch(() => null);
  if (!role) return null;
  if (role.editable && role.permissions?.add) {
    const nextPermissions = role.permissions.add(rolePermissions());
    if (!role.permissions.has(rolePermissions())) {
      await role.setPermissions(nextPermissions, 'Void Arena: permissões base para participar dos eventos').catch(() => null);
    }
  }
  return role;
}

function panelEmbed(role) {
  return new EmbedBuilder()
    .setTitle('🎮 Cargo Void Arena')
    .setColor(0x38bdf8)
    .setDescription([
      `Para participar dos eventos e conseguir entrar nas calls privadas dos seus times, você precisa estar com o cargo ${role ? `<@&${role.id}>` : '**Void Arena**'}.`,
      '',
      'Clique no botão abaixo para resgatar/equipar o cargo automaticamente.',
      '',
      'Esse cargo libera acesso às calls dos eventos: conectar, falar, usar detecção de voz, transmitir tela, usar o chat da call e ver histórico quando permitido.'
    ].join('\n'))
    .setFooter({ text: 'Void Arena • Acesso às calls dos eventos' })
    .setTimestamp(new Date());
}

function panelRows() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLAIM_ID)
      .setLabel('Resgatar cargo Void Arena')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Primary)
  )];
}

async function logClaim(client, member, role, alreadyHad = false) {
  const channel = await client?.channels?.fetch?.(HISTORY_CHANNEL_ID).catch(() => null);
  if (!channel?.send) return;
  const embed = new EmbedBuilder()
    .setTitle(alreadyHad ? 'ℹ️ Cargo Void Arena já equipado' : '✅ Cargo Void Arena resgatado')
    .setColor(alreadyHad ? 0x60a5fa : 0x22c55e)
    .setDescription([
      `**Usuário:** <@${member.id}>`,
      `**Cargo:** ${role ? `<@&${role.id}>` : ROLE_ID}`,
      alreadyHad ? 'O jogador clicou no botão, mas já estava com o cargo.' : 'O jogador recebeu o cargo pelo botão do Lobby.'
    ].join('\n'))
    .setTimestamp(new Date());
  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => null);
}

async function ensureVoidArenaRolePanel(client) {
  const channel = await client?.channels?.fetch?.(LOBBY_CHANNEL_ID).catch(() => null);
  if (!channel?.send || !channel?.guild) return null;
  const role = await ensureRoleBasePermissions(channel.guild);
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const botMessages = Array.from(messages?.values?.() || []).filter((message) => message.author?.id === client.user?.id);
  const existing = botMessages.find((message) => String(message.embeds?.[0]?.title || '').includes('Cargo Void Arena'));
  const payload = { embeds: [panelEmbed(role)], components: panelRows(), allowedMentions: { parse: [] } };
  const sent = existing?.editable ? await existing.edit(payload).catch(() => existing) : await channel.send(payload);
  if (sent?.pin && !sent.pinned) await sent.pin('Void Arena: mensagem fixa do cargo de acesso às calls').catch(() => null);
  return sent;
}

async function handleClaim(interaction) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: 'Esse botão só funciona dentro do servidor.', ephemeral: true });
  const role = await ensureRoleBasePermissions(guild);
  if (!role) return interaction.reply({ content: 'Não achei o cargo Void Arena configurado no servidor.', ephemeral: true });
  const member = await guild.members.fetch(interaction.user.id).catch(() => interaction.member);
  if (!member?.roles?.add) return interaction.reply({ content: 'Não consegui carregar seu membro no servidor.', ephemeral: true });
  const alreadyHad = member.roles.cache.has(role.id);
  if (!alreadyHad) await member.roles.add(role, 'Void Arena: cargo resgatado pelo botão do Lobby');
  await logClaim(interaction.client, member, role, alreadyHad);
  return interaction.reply({
    content: alreadyHad
      ? `Você já está com o cargo ${role.name}.`
      : `Cargo ${role.name} equipado. Agora você pode acessar as calls dos eventos quando estiver no time correto.`,
    ephemeral: true
  });
}

function registerVoidArenaRoleSystem(client) {
  if (!client || client.__voidArenaRoleSystemReady) return client;
  client.__voidArenaRoleSystemReady = true;

  client.once(Events.ClientReady, () => {
    ensureVoidArenaRolePanel(client).catch((error) => console.error('Erro ao criar painel do cargo Void Arena:', error.message));
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (!interaction.isButton?.() || interaction.customId !== CLAIM_ID) return;
      return handleClaim(interaction);
    } catch (error) {
      console.error('Erro no botão do cargo Void Arena:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply(`Erro: ${error.message}`).catch(() => null);
      return interaction.reply({ content: `Erro: ${error.message}`, ephemeral: true }).catch(() => null);
    }
  });

  return client;
}

module.exports = { registerVoidArenaRoleSystem, ensureVoidArenaRolePanel };
