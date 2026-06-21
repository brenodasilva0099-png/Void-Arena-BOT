const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  Routes
} = require('discord.js');

const storage = require('../server/storage');

const TRAINING_PANEL_BUTTON_ID = 'training:open';
const TRAINING_MODAL_ID = 'training:submit';
const TRAINING_FILE_ID = 'training_video';
const TRAINING_TYPE_ID = 'training_type';
const TRAINING_POSITION_ID = 'training_position';
const TRAINING_DESCRIPTION_ID = 'training_description';

function isVideoAttachment(attachment = {}) {
  const type = String(attachment.content_type || attachment.contentType || '').toLowerCase();
  const name = String(attachment.filename || attachment.name || '').toLowerCase();
  return type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(name);
}

function getAttachmentData(rawAttachment = {}) {
  return {
    id: String(rawAttachment.id || ''),
    url: String(rawAttachment.url || ''),
    proxyUrl: String(rawAttachment.proxy_url || rawAttachment.proxyURL || rawAttachment.proxyUrl || ''),
    name: String(rawAttachment.filename || rawAttachment.name || 'treino.mp4').slice(0, 140),
    contentType: String(rawAttachment.content_type || rawAttachment.contentType || ''),
    size: Number(rawAttachment.size || 0) || 0,
    width: Number(rawAttachment.width || 0) || 0,
    height: Number(rawAttachment.height || 0) || 0,
    ephemeral: Boolean(rawAttachment.ephemeral)
  };
}

function readModalValue(rawInteraction, customId) {
  const labels = Array.isArray(rawInteraction?.data?.components) ? rawInteraction.data.components : [];

  for (const label of labels) {
    const component = label.component || {};
    if (component.custom_id === customId) {
      return String(component.value || '').trim();
    }
  }

  return '';
}

function readModalUploadIds(rawInteraction, customId) {
  const labels = Array.isArray(rawInteraction?.data?.components) ? rawInteraction.data.components : [];

  for (const label of labels) {
    const component = label.component || {};
    if (component.custom_id === customId && Array.isArray(component.values)) {
      return component.values.map((value) => String(value)).filter(Boolean);
    }
  }

  return [];
}

function getResolvedAttachments(rawInteraction) {
  return rawInteraction?.data?.resolved?.attachments || {};
}

async function showTrainingModal(interaction) {
  const body = {
    type: 9,
    data: {
      custom_id: TRAINING_MODAL_ID,
      title: 'Enviar vídeo de treino',
      components: [
        {
          type: 18,
          label: 'Vídeo do treino',
          description: 'Envie 1 vídeo do seu treino. Use MP4, MOV ou WEBM.',
          component: {
            type: 19,
            custom_id: TRAINING_FILE_ID,
            min_values: 1,
            max_values: 1,
            required: true
          }
        },
        {
          type: 18,
          label: 'Tipo de treino',
          description: 'Exemplo: finalização, defesa, passe, movimentação.',
          component: {
            type: 4,
            custom_id: TRAINING_TYPE_ID,
            style: 1,
            min_length: 2,
            max_length: 80,
            required: true,
            placeholder: 'Finalização'
          }
        },
        {
          type: 18,
          label: 'Posição',
          description: 'Exemplo: goleiro, zagueiro, meio, atacante.',
          component: {
            type: 4,
            custom_id: TRAINING_POSITION_ID,
            style: 1,
            min_length: 2,
            max_length: 80,
            required: true,
            placeholder: 'Atacante'
          }
        },
        {
          type: 18,
          label: 'Descrição',
          description: 'Explique rapidamente o objetivo do treino.',
          component: {
            type: 4,
            custom_id: TRAINING_DESCRIPTION_ID,
            style: 2,
            min_length: 4,
            max_length: 700,
            required: true,
            placeholder: 'Treino de chute cruzado, movimentação e finalização...'
          }
        }
      ]
    }
  };

  await interaction.client.rest.post(
    Routes.interactionCallback(interaction.id, interaction.token),
    { body }
  );
}

async function downloadAttachmentBuffer(attachment) {
  const url = attachment.url || attachment.proxyUrl;
  if (!url) throw new Error('URL do vídeo não encontrada.');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar vídeo do Discord (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function publishTrainingLog(client, interaction, payload) {
  const channelId = String(process.env.TRAINING_LOG_CHANNEL_ID || '').trim();

  if (!channelId) {
    return {
      discordChannelId: '',
      discordMessageId: '',
      video: payload.video,
      mirrored: false,
      mirrorSkipped: 'TRAINING_LOG_CHANNEL_ID não configurado'
    };
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel?.send) {
    return {
      discordChannelId: '',
      discordMessageId: '',
      video: payload.video,
      mirrored: false,
      mirrorSkipped: 'Canal privado de treinos inválido ou sem permissão'
    };
  }

  const embed = new EmbedBuilder()
    .setTitle('🎥 Novo treino enviado')
    .setColor(0x8b5cf6)
    .addFields(
      { name: 'Jogador', value: `<@${payload.playerDiscordId}>`, inline: true },
      { name: 'Tipo', value: payload.type || 'Não informado', inline: true },
      { name: 'Posição', value: payload.position || 'Não informado', inline: true },
      { name: 'Descrição', value: payload.description || 'Sem descrição' }
    )
    .setTimestamp(new Date());

  try {
    const buffer = await downloadAttachmentBuffer(payload.video);
    const attachment = new AttachmentBuilder(buffer, { name: payload.video.name || 'treino.mp4' });

    const sent = await channel.send({
      content: `🎥 Treino enviado por <@${payload.playerDiscordId}>`,
      embeds: [embed],
      files: [attachment]
    });

    const mirroredAttachment = sent.attachments.first();
    return {
      discordChannelId: sent.channelId,
      discordMessageId: sent.id,
      video: mirroredAttachment ? {
        id: mirroredAttachment.id,
        url: mirroredAttachment.url,
        proxyUrl: mirroredAttachment.proxyURL || '',
        name: mirroredAttachment.name || payload.video.name,
        contentType: mirroredAttachment.contentType || payload.video.contentType,
        size: mirroredAttachment.size || payload.video.size,
        width: mirroredAttachment.width || 0,
        height: mirroredAttachment.height || 0,
        ephemeral: false
      } : payload.video,
      mirrored: Boolean(mirroredAttachment)
    };
  } catch (error) {
    const sent = await channel.send({
      content: `🎥 Treino enviado por <@${payload.playerDiscordId}>\n⚠️ Não consegui reanexar o vídeo automaticamente. Link original: ${payload.video.url}`,
      embeds: [embed]
    }).catch(() => null);

    return {
      discordChannelId: sent?.channelId || channelId,
      discordMessageId: sent?.id || '',
      video: payload.video,
      mirrored: false,
      mirrorError: error.message
    };
  }
}

async function handleTrainingSubmit(client, interaction, rawInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const type = readModalValue(rawInteraction, TRAINING_TYPE_ID);
  const position = readModalValue(rawInteraction, TRAINING_POSITION_ID);
  const description = readModalValue(rawInteraction, TRAINING_DESCRIPTION_ID);

  const uploadIds = readModalUploadIds(rawInteraction, TRAINING_FILE_ID);
  const resolved = getResolvedAttachments(rawInteraction);
  const rawAttachment = uploadIds.map((id) => resolved[id]).find(Boolean);

  if (!rawAttachment) {
    return interaction.editReply('❌ Não consegui encontrar o vídeo enviado no formulário.');
  }

  const video = getAttachmentData(rawAttachment);

  if (!isVideoAttachment(video)) {
    return interaction.editReply('❌ Envie um arquivo de vídeo válido: MP4, MOV, WEBM, MKV ou AVI.');
  }

  const playerName = interaction.member?.displayName || interaction.user.globalName || interaction.user.username;

  const log = await publishTrainingLog(client, interaction, {
    playerDiscordId: interaction.user.id,
    playerName,
    type,
    position,
    description,
    video
  });

  const saved = await storage.saveTrainingSubmission({
    playerDiscordId: interaction.user.id,
    playerName,
    playerAvatar: interaction.user.displayAvatarURL({ size: 128 }),
    guildId: interaction.guildId,
    type,
    position,
    description,
    video: log.video,
    originalVideo: video,
    discordChannelId: log.discordChannelId,
    discordMessageId: log.discordMessageId,
    mirroredToDiscord: log.mirrored,
    mirrorError: log.mirrorError || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  await interaction.editReply(`✅ Treino enviado com sucesso!\nID do envio: \`${saved.id}\``);
}

async function sendTrainingPanel(message) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(TRAINING_PANEL_BUTTON_ID)
      .setLabel('Enviar treino')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle('🎥 Central de Treinos')
    .setDescription('Clique no botão abaixo para enviar seu vídeo de treino. O formulário aparece somente para você.')
    .setColor(0x8b5cf6)
    .setFooter({ text: 'Void Arena • Envio de treinos' });

  await message.channel.send({ embeds: [embed], components: [row] });
}

function registerTrainingHandlers(client) {
  if (!client || client.__voidArenaTrainingHandlersRegistered) return client;
  client.__voidArenaTrainingHandlersRegistered = true;

  const rawInteractions = new Map();

  client.on('raw', (packet) => {
    if (packet?.t === 'INTERACTION_CREATE' && packet?.d?.id) {
      rawInteractions.set(packet.d.id, packet.d);
      setTimeout(() => rawInteractions.delete(packet.d.id), 120000);
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      if (message.content.trim() !== '.treinos-painel') return;

      const canManage = message.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild);
      if (!canManage) {
        await message.reply('❌ Apenas staff com permissão de gerenciar servidor pode criar o painel de treinos.');
        return;
      }

      await sendTrainingPanel(message);
      await message.reply('✅ Painel de treinos criado.');
    } catch (error) {
      console.error('❌ Erro ao criar painel de treinos:', error.message);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const rawInteraction = rawInteractions.get(interaction.id);

      if (interaction.isButton?.() && interaction.customId === TRAINING_PANEL_BUTTON_ID) {
        await showTrainingModal(interaction);
        return;
      }

      if (interaction.isModalSubmit?.() && interaction.customId === TRAINING_MODAL_ID) {
        await handleTrainingSubmit(client, interaction, rawInteraction);
      }
    } catch (error) {
      console.error('❌ Erro no sistema de treinos:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`❌ Erro ao enviar treino: ${error.message}`).catch(() => {});
      } else {
        await interaction.reply({ content: `❌ Erro ao enviar treino: ${error.message}`, ephemeral: true }).catch(() => {});
      }
    }
  });

  return client;
}

module.exports = {
  registerTrainingHandlers
};
