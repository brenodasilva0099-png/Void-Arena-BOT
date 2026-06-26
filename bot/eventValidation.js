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

const RESPONSIBLE_NAME_ID = 'responsibleName';
const PAYMENT_FILE_ID = 'paymentProofFile';

function envRoleIds(...names) {
  return names
    .flatMap((name) => String(process.env[name] || '').split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

function memberHasAnyRole(member, roleIds = []) {
  if (!member?.roles?.cache || !roleIds.length) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

function canVerify(member) {
  const roleIds = envRoleIds('VALIDATION_ROLE_IDS', 'EVENT_VALIDATION_ROLE_IDS', 'CONTROL_PANEL_ROLE_IDS', 'ADMIN_ROLE_IDS');

  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
    memberHasAnyRole(member, roleIds)
  );
}

function readModalValue(rawInteraction, customId) {
  const rows = Array.isArray(rawInteraction?.data?.components) ? rawInteraction.data.components : [];

  for (const row of rows) {
    const component = row.component || {};
    if (component.custom_id === customId) {
      return String(component.value || '').trim();
    }
  }

  return '';
}

function readModalUploadIds(rawInteraction, customId) {
  const rows = Array.isArray(rawInteraction?.data?.components) ? rawInteraction.data.components : [];

  for (const row of rows) {
    const component = row.component || {};
    if (component.custom_id === customId && Array.isArray(component.values)) {
      return component.values.map((value) => String(value)).filter(Boolean);
    }
  }

  return [];
}

function getResolvedAttachments(rawInteraction) {
  return rawInteraction?.data?.resolved?.attachments || {};
}

function getAttachmentData(rawAttachment = {}) {
  return {
    id: String(rawAttachment.id || ''),
    url: String(rawAttachment.url || ''),
    proxyUrl: String(rawAttachment.proxy_url || rawAttachment.proxyURL || rawAttachment.proxyUrl || ''),
    name: String(rawAttachment.filename || rawAttachment.name || 'comprovante').slice(0, 160),
    contentType: String(rawAttachment.content_type || rawAttachment.contentType || ''),
    size: Number(rawAttachment.size || 0) || 0
  };
}

async function downloadAttachmentBuffer(attachment = {}) {
  const url = attachment.url || attachment.proxyUrl;
  if (!url) throw new Error('URL do comprovante não encontrada.');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar comprovante do Discord (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function showValidationModal(interaction, requestId) {
  const body = {
    type: 9,
    data: {
      custom_id: `eventval:submit:${requestId}`,
      title: 'Validação de inscrição',
      components: [
        {
          type: 18,
          label: 'Nome/conta do responsável',
          description: 'Informe quem está responsável por essa inscrição.',
          component: {
            type: 4,
            custom_id: RESPONSIBLE_NAME_ID,
            style: 1,
            min_length: 2,
            max_length: 100,
            required: true,
            placeholder: 'Ex: Friplayyvxz / @usuario / conta Steam'
          }
        },
        {
          type: 18,
          label: 'Comprovante de inscrição',
          description: 'Envie print, imagem, PDF ou arquivo do comprovante.',
          component: {
            type: 19,
            custom_id: PAYMENT_FILE_ID,
            min_values: 1,
            max_values: 1,
            required: true
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

function requestSummaryEmbed(request = {}, proofFile = null) {
  const fileName = proofFile?.name || request.paymentProofFile?.name || 'comprovante';

  return new EmbedBuilder()
    .setTitle('🧾 Comprovante enviado para validação')
    .setDescription(
      'Confira o arquivo enviado. Se estiver correto, clique em **Verificado** para aceitar o time no evento do site.\n\n' +
      `**Time:** ${request.teamName || request.teamId}\n` +
      `**Tag:** ${request.teamTag || '-'}\n` +
      `**Responsável:** ${request.responsibleName || '-'}\n` +
      `**Evento:** ${request.eventId}\n` +
      `**Arquivo:** ${fileName}`
    )
    .setColor(0xf59e0b)
    .setTimestamp(new Date());
}

async function publishProofForVerification(client, interaction, request, proofFile) {
  const channelId = String(
    request.validationDiscordChannelId ||
    process.env.EVENT_VALIDATION_CHANNEL_ID ||
    '1519857078024540270'
  ).trim();

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.send) throw new Error('Canal de validação inválido ou sem permissão.');

  let files = [];

  try {
    const buffer = await downloadAttachmentBuffer(proofFile);
    files = [new AttachmentBuilder(buffer, { name: proofFile.name || 'comprovante' })];
  } catch {
    files = [];
  }

  const sent = await channel.send({
    content: `🧾 Comprovante enviado por <@${interaction.user.id}> para validação.`,
    embeds: [requestSummaryEmbed(request, proofFile)],
    files,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`eventval:verify:${request.id}`)
          .setLabel('Verificado')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      )
    ],
    allowedMentions: { users: [interaction.user.id] }
  });

  const persistedFile = sent.attachments.first();

  return {
    channelId: sent.channelId,
    messageId: sent.id,
    paymentProofFile: persistedFile ? {
      id: persistedFile.id,
      url: persistedFile.url,
      proxyUrl: persistedFile.proxyURL || '',
      name: persistedFile.name || proofFile.name,
      contentType: persistedFile.contentType || proofFile.contentType,
      size: persistedFile.size || proofFile.size
    } : proofFile
  };
}

async function handleValidationSubmit(client, interaction, rawInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const requestId = interaction.customId.split(':').slice(2).join(':');
  const requests = await storage.readEventRegistrationRequests({ limit: 1000 });
  const currentRequest = requests.find((item) => String(item.id) === String(requestId));

  if (!currentRequest) {
    await interaction.editReply('❌ Pedido de validação não encontrado.');
    return;
  }

  if (currentRequest.responsibleDiscordId && String(currentRequest.responsibleDiscordId) !== String(interaction.user.id)) {
    await interaction.editReply('❌ Apenas o responsável desse time pode preencher esta validação.');
    return;
  }

  const responsibleName = readModalValue(rawInteraction, RESPONSIBLE_NAME_ID);
  const uploadIds = readModalUploadIds(rawInteraction, PAYMENT_FILE_ID);
  const resolved = getResolvedAttachments(rawInteraction);
  const rawAttachment = uploadIds.map((id) => resolved[id]).find(Boolean);

  if (!responsibleName) {
    await interaction.editReply('❌ Informe o nome/conta do responsável.');
    return;
  }

  if (!rawAttachment) {
    await interaction.editReply('❌ Envie o print ou arquivo do comprovante.');
    return;
  }

  const proofFile = getAttachmentData(rawAttachment);

  const requestWithResponsible = {
    ...currentRequest,
    responsibleName,
    paymentProofFile: proofFile
  };

  const proofLog = await publishProofForVerification(client, interaction, requestWithResponsible, proofFile);

  await storage.submitEventRegistrationProof(requestId, {
    responsibleName,
    paymentProof: proofLog.paymentProofFile?.url || proofFile.url,
    paymentProofFile: proofLog.paymentProofFile,
    validationDiscordChannelId: proofLog.channelId,
    validationDiscordMessageId: proofLog.messageId
  });

  await interaction.editReply('✅ Comprovante enviado para o histórico. Aguarde a staff clicar em **Verificado** para liberar o time no evento.');
}

async function handleVerify(interaction) {
  if (!canVerify(interaction.member)) {
    await interaction.reply({ ephemeral: true, content: '❌ Você não tem permissão para verificar inscrições.' });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const requestId = interaction.customId.split(':').slice(2).join(':');
  const result = await storage.approveEventRegistrationRequest(requestId, {
    approvedBy: interaction.user.id
  });

  await interaction.editReply(`✅ Inscrição verificada. O time **${result.request.teamName || result.request.teamId}** foi aceito no evento do site.`);

  if (interaction.message?.editable) {
    const file = result.request.paymentProofFile;
    await interaction.message.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Inscrição verificada')
          .setDescription(
            `**Time:** ${result.request.teamName || result.request.teamId}\n` +
            `**Tag:** ${result.request.teamTag || '-'}\n` +
            `**Responsável:** ${result.request.responsibleName || '-'}\n` +
            `**Evento:** ${result.request.eventId}\n` +
            `**Arquivo:** ${file?.name || 'comprovante'}\n\n` +
            'O time já foi aceito no evento do site.'
          )
          .setColor(0x22c55e)
          .setTimestamp(new Date())
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`eventval:verified:${requestId}`)
            .setLabel('Verificado')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        )
      ]
    }).catch(() => {});
  }
}

function registerEventValidation(client) {
  if (!client || client.__voidArenaEventValidationRegistered) return client;
  client.__voidArenaEventValidationRegistered = true;

  const rawInteractions = new Map();

  client.on('raw', (packet) => {
    if (packet?.t === 'INTERACTION_CREATE' && packet?.d?.id) {
      rawInteractions.set(packet.d.id, packet.d);
      setTimeout(() => rawInteractions.delete(packet.d.id), 120000);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const customId = String(interaction.customId || '');

      if (interaction.isButton?.() && customId.startsWith('eventval:open:')) {
        const requestId = customId.split(':').slice(2).join(':');
        await showValidationModal(interaction, requestId);
        return;
      }

      if (interaction.isModalSubmit?.() && customId.startsWith('eventval:submit:')) {
        const rawInteraction = rawInteractions.get(interaction.id);
        await handleValidationSubmit(client, interaction, rawInteraction);
        return;
      }

      if (interaction.isButton?.() && customId.startsWith('eventval:verify:')) {
        await handleVerify(interaction);
      }
    } catch (error) {
      console.error('❌ Erro na validação de inscrição:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`❌ Erro: ${error.message}`).catch(() => {});
      } else {
        await interaction.reply({ ephemeral: true, content: `❌ Erro: ${error.message}` }).catch(() => {});
      }
    }
  });

  return client;
}

module.exports = {
  registerEventValidation
};
