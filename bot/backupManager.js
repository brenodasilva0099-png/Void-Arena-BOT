const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} = require('discord.js');

const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

const BACKUP_SELECT_ID = 'backup:select';
const BACKUP_RESTORE_PREFIX = 'backup:restore:';
const BACKUP_CANCEL_PREFIX = 'backup:cancel:';

function canManageBackups(member) {
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild)
  );
}

function formatDate(value) {
  if (!value) return 'data desconhecida';

  try {
    return new Date(value).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  } catch {
    return String(value);
  }
}

function backupLabel(item = {}) {
  const summary = item.summary || {};
  return `${formatDate(item.savedAt || item.exportedAt)} • ${summary.teams || 0} times • ${summary.users || 0} users`;
}

function backupDescription(item = {}) {
  const summary = item.summary || {};
  return `Eventos: ${summary.events || 0} • Treinos: ${summary.trainingSubmissions || 0} • ${item.reason || 'sem motivo'}`.slice(0, 100);
}

function backupValue(item = {}) {
  return Buffer.from(String(item.path || item.backupPath || ''), 'utf8')
    .toString('base64url')
    .slice(0, 100);
}

function decodeBackupValue(value = '') {
  return Buffer.from(String(value || ''), 'base64url').toString('utf8');
}

async function handleBackupNow(message) {
  const status = await storage.readDatabaseStatus();

  if (Number(status.teams || 0) === 0) {
    await message.reply(
      '⚠️ O banco atual está com **0 times**. Por segurança, não vou salvar esse backup por cima do backup bom. Restaure o backup bom primeiro.'
    );
    return;
  }

  const manifest = await githubBackups.saveBackupToGitHub(storage, {
    reason: `discord-manual-${message.author.id}`
  });

  if (manifest?.skipped) {
    await message.reply(`⚠️ Backup não salvo: ${manifest.message || manifest.reason}`);
    return;
  }

  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Backup salvo no GitHub')
        .setColor(0x22c55e)
        .addFields(
          { name: 'Arquivo', value: `\`${manifest.backupPath}\`` },
          { name: 'Resumo', value: `Users: **${manifest.summary?.users || 0}** • Times: **${manifest.summary?.teams || 0}** • Eventos: **${manifest.summary?.events || 0}** • Treinos: **${manifest.summary?.trainingSubmissions || 0}**` },
          { name: 'Salvo em', value: formatDate(manifest.savedAt) }
        )
    ]
  });
}

async function handleBackupsMenu(message) {
  const backups = await githubBackups.listBackupsFromGitHub({ limit: 25 });

  if (!backups.length) {
    await message.reply('❌ Nenhum backup encontrado no GitHub ainda.');
    return;
  }

  const options = backups.slice(0, 25).map((item) => ({
    label: backupLabel(item).slice(0, 100),
    description: backupDescription(item),
    value: backupValue(item)
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(BACKUP_SELECT_ID)
      .setPlaceholder('Escolha um backup para restaurar')
      .addOptions(options)
  );

  const embed = new EmbedBuilder()
    .setTitle('🧩 Backups do Void Arena')
    .setDescription('Selecione abaixo qual versão do banco deseja restaurar.')
    .setColor(0x8b5cf6)
    .setFooter({ text: 'Somente staff/admin pode restaurar backups.' });

  await message.reply({ embeds: [embed], components: [row] });
}

async function handleBackupSelect(interaction) {
  if (!canManageBackups(interaction.member)) {
    await interaction.reply({ content: '❌ Você não tem permissão para restaurar backups.', ephemeral: true });
    return;
  }

  const selectedPath = decodeBackupValue(interaction.values?.[0] || '');
  if (!selectedPath) {
    await interaction.reply({ content: '❌ Backup inválido.', ephemeral: true });
    return;
  }

  const backup = await githubBackups.fetchBackupFromGitHubPath(selectedPath);
  const summary = backup.summary || {};

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BACKUP_RESTORE_PREFIX}${Buffer.from(selectedPath, 'utf8').toString('base64url')}`)
      .setLabel('Restaurar backup')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${BACKUP_CANCEL_PREFIX}${Date.now()}`)
      .setLabel('Cancelar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({
    ephemeral: true,
    embeds: [
      new EmbedBuilder()
        .setTitle('⚠️ Confirmar restauração')
        .setColor(0xf59e0b)
        .setDescription(`Você está prestes a restaurar:\n\`${selectedPath}\``)
        .addFields(
          { name: 'Exportado em', value: formatDate(backup.exportedAt), inline: true },
          { name: 'Times', value: String(summary.teams || 0), inline: true },
          { name: 'Usuários', value: String(summary.users || 0), inline: true },
          { name: 'Eventos', value: String(summary.events || 0), inline: true },
          { name: 'Treinos', value: String(summary.trainingSubmissions || 0), inline: true }
        )
    ],
    components: [confirmRow]
  });
}

async function handleBackupRestore(interaction) {
  if (!canManageBackups(interaction.member)) {
    await interaction.reply({ content: '❌ Você não tem permissão para restaurar backups.', ephemeral: true });
    return;
  }

  const encoded = interaction.customId.slice(BACKUP_RESTORE_PREFIX.length);
  const selectedPath = Buffer.from(encoded, 'base64url').toString('utf8');

  await interaction.deferReply({ ephemeral: true });

  const result = await githubBackups.restoreBackupFromGitHubPath(storage, selectedPath);

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Backup restaurado')
        .setColor(0x22c55e)
        .setDescription(`Banco restaurado a partir de:\n\`${selectedPath}\``)
        .addFields(
          { name: 'Users', value: String(result.result?.summary?.users || 0), inline: true },
          { name: 'Times', value: String(result.result?.summary?.teams || 0), inline: true },
          { name: 'Eventos', value: String(result.result?.summary?.events || 0), inline: true },
          { name: 'Treinos', value: String(result.result?.summary?.trainingSubmissions || 0), inline: true }
        )
    ],
    components: []
  });
}

function registerBackupManager(client) {
  if (!client || client.__voidArenaBackupManagerRegistered) return client;
  client.__voidArenaBackupManagerRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      const content = message.content.trim();

      if (content === '.backup-agora') {
        if (!canManageBackups(message.member)) {
          await message.reply('❌ Apenas staff/admin pode criar backup manual.');
          return;
        }

        await handleBackupNow(message);
      }

      if (content === '.backups') {
        if (!canManageBackups(message.member)) {
          await message.reply('❌ Apenas staff/admin pode ver/restaurar backups.');
          return;
        }

        await handleBackupsMenu(message);
      }
    } catch (error) {
      console.error('❌ Erro no Backup Manager:', error);
      await message.reply(`❌ Erro no Backup Manager: ${error.message}`).catch(() => {});
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isStringSelectMenu?.() && interaction.customId === BACKUP_SELECT_ID) {
        await handleBackupSelect(interaction);
        return;
      }

      if (interaction.isButton?.() && interaction.customId.startsWith(BACKUP_RESTORE_PREFIX)) {
        await handleBackupRestore(interaction);
        return;
      }

      if (interaction.isButton?.() && interaction.customId.startsWith(BACKUP_CANCEL_PREFIX)) {
        await interaction.reply({ content: '❌ Restauração cancelada.', ephemeral: true });
      }
    } catch (error) {
      console.error('❌ Erro na interação de backups:', error);

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
  registerBackupManager
};
