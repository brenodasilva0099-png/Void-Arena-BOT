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

const sessions = new Map();

const POSITIONS = ['Goleiro', 'Fixo', 'Ala Defensivo', 'Ala Ofensivo', 'Pivô'];
const STYLES = ['Defensivo', 'Equilibrado', 'Ofensivo'];

function canManage(member) {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

function option(value) {
  return { label: value, value };
}

function sessionKey(interactionOrMessage) {
  return `${interactionOrMessage.guildId || 'dm'}:${interactionOrMessage.user?.id || interactionOrMessage.author?.id}`;
}

function panelEmbed() {
  return new EmbedBuilder()
    .setTitle('📋 Formulário de Inscrição — Hollow Nexus')
    .setDescription(
      'Bem-vindo à seleção da Hollow Nexus! Para participar da avaliação, preencha todas as informações abaixo.\n\n' +
      'Você pode preencher pelo Discord usando o botão abaixo.'
    )
    .setColor(0x8b5cf6);
}

async function sendPanel(message) {
  await message.reply({
    embeds: [panelEmbed()],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('hollowform:start')
          .setLabel('Preencher inscrição')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Primary)
      )
    ]
  });
}

async function startForm(interaction) {
  const key = sessionKey(interaction);

  sessions.set(key, {
    source: 'discord',
    discordId: interaction.user.id,
    discordTag: interaction.user.tag || interaction.user.username,
    userName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
    userAvatar: interaction.user.displayAvatarURL?.({ size: 128 }) || ''
  });

  await interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setTitle('📋 Inscrição Hollow Nexus — etapa 1')
        .setDescription('Selecione posição principal, posição secundária e estilo de jogo. Depois clique em **Continuar**.')
        .setColor(0x22d3ee)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('hollowform:primary')
          .setPlaceholder('Posição Principal')
          .addOptions(POSITIONS.map(option))
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('hollowform:secondary')
          .setPlaceholder('Posição Secundária')
          .addOptions(POSITIONS.map(option))
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('hollowform:style')
          .setPlaceholder('Estilo de Jogo')
          .addOptions(STYLES.map(option))
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('hollowform:open-modal-1')
          .setLabel('Continuar')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Success)
      )
    ]
  });
}

async function saveSelect(interaction, field) {
  const key = sessionKey(interaction);
  const session = sessions.get(key) || {};
  session[field] = interaction.values?.[0] || '';
  sessions.set(key, session);

  await interaction.reply({ content: `✅ ${interaction.values?.[0] || 'Selecionado'}`, ephemeral: true });
}

function modalOne() {
  return new ModalBuilder()
    .setCustomId('hollowform:modal-1')
    .setTitle('Inscrição Hollow Nexus 1/2')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('realNameSteamCode')
          .setLabel('Nome Real / Código Steam')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('age')
          .setLabel('Idade')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('experienceHours')
          .setLabel('Experiência / horas jogadas')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('previousTeam')
          .setLabel('Já participou de algum time? Qual?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('availability')
          .setLabel('Horários disponíveis')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
}

function modalTwo() {
  return new ModalBuilder()
    .setCustomId('hollowform:modal-2')
    .setTitle('Inscrição Hollow Nexus 2/2')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('strengths')
          .setLabel('Pontos fortes pessoais e in-game')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('weaknesses')
          .setLabel('Pontos fracos pessoais e em game')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Por que deseja entrar para a Hollow Nexus?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
}

function readModal(interaction, ids) {
  const data = {};
  ids.forEach((id) => {
    data[id] = interaction.fields.getTextInputValue(id);
  });
  return data;
}

async function handleModalOne(interaction) {
  const key = sessionKey(interaction);
  const session = sessions.get(key) || {};

  sessions.set(key, {
    ...session,
    ...readModal(interaction, ['realNameSteamCode', 'age', 'experienceHours', 'previousTeam', 'availability'])
  });

  await interaction.reply({
    ephemeral: true,
    content: '✅ Primeira parte salva. Clique em **Finalizar inscrição** para responder os últimos campos.',
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('hollowform:open-modal-2')
          .setLabel('Finalizar inscrição')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      )
    ]
  });
}

async function handleModalTwo(interaction) {
  const key = sessionKey(interaction);
  const session = sessions.get(key) || {};
  const finalData = {
    ...session,
    ...readModal(interaction, ['strengths', 'weaknesses', 'reason'])
  };

  const required = ['primaryPosition', 'secondaryPosition', 'playStyle'];
  const missing = required.filter((field) => !finalData[field]);

  if (missing.length) {
    await interaction.reply({ ephemeral: true, content: '❌ Volte e selecione posição principal, secundária e estilo de jogo.' });
    return;
  }

  const saved = await storage.savePlayerApplication(finalData);
  sessions.delete(key);

  await interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Inscrição enviada')
        .setDescription('Sua inscrição foi salva para avaliação da equipe.')
        .setColor(0x22c55e)
        .addFields(
          { name: 'Jogador', value: saved.userName || 'Jogador', inline: true },
          { name: 'Principal', value: saved.primaryPosition || '-', inline: true },
          { name: 'Estilo', value: saved.playStyle || '-', inline: true }
        )
    ]
  });
}

function registerPlayerApplications(client) {
  if (!client || client.__voidArenaPlayerApplicationsRegistered) return client;
  client.__voidArenaPlayerApplicationsRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot) return;

    const content = message.content.trim();

    if (content === '.inscricao-painel') {
      if (!canManage(message.member)) {
        await message.reply('❌ Apenas staff/admin pode criar o painel de inscrição.');
        return;
      }

      await sendPanel(message);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton?.() && interaction.customId === 'hollowform:start') {
        await startForm(interaction);
        return;
      }

      if (interaction.isStringSelectMenu?.() && interaction.customId === 'hollowform:primary') {
        await saveSelect(interaction, 'primaryPosition');
        return;
      }

      if (interaction.isStringSelectMenu?.() && interaction.customId === 'hollowform:secondary') {
        await saveSelect(interaction, 'secondaryPosition');
        return;
      }

      if (interaction.isStringSelectMenu?.() && interaction.customId === 'hollowform:style') {
        await saveSelect(interaction, 'playStyle');
        return;
      }

      if (interaction.isButton?.() && interaction.customId === 'hollowform:open-modal-1') {
        await interaction.showModal(modalOne());
        return;
      }

      if (interaction.isButton?.() && interaction.customId === 'hollowform:open-modal-2') {
        await interaction.showModal(modalTwo());
        return;
      }

      if (interaction.isModalSubmit?.() && interaction.customId === 'hollowform:modal-1') {
        await handleModalOne(interaction);
        return;
      }

      if (interaction.isModalSubmit?.() && interaction.customId === 'hollowform:modal-2') {
        await handleModalTwo(interaction);
      }
    } catch (error) {
      console.error('❌ Erro no formulário Hollow Nexus:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`❌ Erro: ${error.message}`).catch(() => {});
      } else {
        await interaction.reply({ content: `❌ Erro: ${error.message}`, ephemeral: true }).catch(() => {});
      }
    }
  });

  return client;
}

module.exports = {
  registerPlayerApplications
};
