const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const storage = require('../server/storage');

function buildValidationModal(requestId) {
  return new ModalBuilder()
    .setCustomId(`eventval:submit:${requestId}`)
    .setTitle('Validação de inscrição')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('teamName')
          .setLabel('Nome do time')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('teamTag')
          .setLabel('Tag do time')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('responsibleName')
          .setLabel('Nome/conta do responsável')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('paymentProof')
          .setLabel('Comprovante de inscrição')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Cole o link, código, ID do comprovante ou observação.')
          .setRequired(true)
      )
    );
}

function registerEventValidation(client) {
  if (!client || client.__voidArenaEventValidationRegistered) return client;
  client.__voidArenaEventValidationRegistered = true;

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton?.() && String(interaction.customId || '').startsWith('eventval:open:')) {
        const requestId = interaction.customId.split(':').slice(2).join(':');
        await interaction.showModal(buildValidationModal(requestId));
        return;
      }

      if (interaction.isModalSubmit?.() && String(interaction.customId || '').startsWith('eventval:submit:')) {
        const requestId = interaction.customId.split(':').slice(2).join(':');
        const requests = await storage.readEventRegistrationRequests({ limit: 1000 });
        const request = requests.find((item) => String(item.id) === String(requestId));

        if (!request) {
          await interaction.reply({ ephemeral: true, content: '❌ Pedido de validação não encontrado.' });
          return;
        }

        if (request.responsibleDiscordId && String(request.responsibleDiscordId) !== String(interaction.user.id)) {
          await interaction.reply({ ephemeral: true, content: '❌ Apenas o responsável desse time pode preencher esta validação.' });
          return;
        }

        const result = await storage.approveEventRegistrationRequest(requestId, {
          teamName: interaction.fields.getTextInputValue('teamName'),
          teamTag: interaction.fields.getTextInputValue('teamTag'),
          responsibleName: interaction.fields.getTextInputValue('responsibleName'),
          paymentProof: interaction.fields.getTextInputValue('paymentProof'),
          approvedBy: interaction.user.id
        });

        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ Inscrição validada')
              .setDescription('O time foi aceito no evento e agora aparece no site.')
              .setColor(0x22c55e)
              .addFields(
                { name: 'Time', value: result.request.teamName || result.request.teamId, inline: true },
                { name: 'Tag', value: result.request.teamTag || '-', inline: true },
                { name: 'Responsável', value: result.request.responsibleName || '-', inline: true }
              )
          ]
        });

        if (interaction.message?.editable) {
          await interaction.message.edit({
            embeds: [
              new EmbedBuilder()
                .setTitle('✅ Inscrição validada')
                .setDescription(
                  `**Time:** ${result.request.teamName || result.request.teamId}\n` +
                  `**Tag:** ${result.request.teamTag || '-'}\n` +
                  `**Responsável:** ${result.request.responsibleName || '-'}\n` +
                  `**Status:** aprovado e publicado no site.`
                )
                .setColor(0x22c55e)
            ],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`eventval:done:${requestId}`)
                  .setLabel('Validação concluída')
                  .setEmoji('✅')
                  .setStyle(ButtonStyle.Success)
                  .setDisabled(true)
              )
            ]
          }).catch(() => {});
        }
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
