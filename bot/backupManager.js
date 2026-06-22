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
const RESTORE_BEST_BUTTON_ID = 'backup:restore-best';

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
  const teams = Number(summary.teams || 0);
  const icon = teams > 0 ? '✅' : '⚠️';
  const tag = item.isLatest ? 'LATEST • ' : '';
  return `${icon} ${tag}${formatDate(item.savedAt || item.exportedAt)} • ${teams} times • ${summary.users || 0} users`;
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


function summarizeStatus(status = {}) {
  return [
    `Users: **${status.users || 0}**`,
    `Times: **${status.teams || 0}**`,
    `Eventos: **${status.events || 0}**`,
    `Treinos: **${status.trainingSubmissions || 0}**`,
    `Mensagens: **${status.messages || 0}**`
  ].join(' • ');
}

async function findBestBackup() {
  const candidates = [];

  // Primeiro tenta o latest fixo, porque ele é o backup principal de segurança.
  try {
    const latest = await githubBackups.fetchBackupFromGitHubPath('latest/void-arena-backup-latest.json');

    candidates.push({
      path: 'latest/void-arena-backup-latest.json',
      savedAt: latest.githubBackup?.savedAt || latest.exportedAt || null,
      exportedAt: latest.exportedAt || null,
      reason: latest.githubBackup?.reason || 'latest',
      summary: latest.summary || {}
    });
  } catch (error) {
    console.warn('⚠️ Latest backup não encontrado ou inválido:', error.message);
  }

  // Depois tenta o histórico em /backups.
  try {
    const backups = await githubBackups.listBackupsFromGitHub({ limit: 50 });
    candidates.push(...backups);
  } catch (error) {
    console.warn('⚠️ Lista de backups históricos indisponível:', error.message);
  }

  return candidates
    .filter((item) => Number(item.summary?.teams || 0) > 0)
    .sort((a, b) => new Date(b.savedAt || b.exportedAt || 0).getTime() - new Date(a.savedAt || a.exportedAt || 0).getTime())[0] || null;
}

async function restoreBestBackup() {
  const best = await findBestBackup();

  if (!best) {
    return {
      success: false,
      message: 'Não encontrei nenhum backup bom com times no GitHub.'
    };
  }

  const result = await githubBackups.restoreBackupFromGitHubPath(storage, best.path);

  return {
    success: true,
    backup: best,
    result
  };
}

async function handleDbStatus(message) {
  const current = await storage.readDatabaseStatus();
  const best = await findBestBackup();

  const embed = new EmbedBuilder()
    .setTitle('📦 Status do banco Void Arena')
    .setColor(Number(current.teams || 0) > 0 ? 0x22c55e : 0xf59e0b)
    .addFields(
      {
        name: 'Banco atual do BOT',
        value: summarizeStatus(current)
      },
      {
        name: 'Melhor backup no GitHub',
        value: best
          ? `${summarizeStatus(best.summary || {})}\nArquivo: \`${best.path}\`\nData: ${formatDate(best.savedAt || best.exportedAt)}`
          : 'Nenhum backup bom com times encontrado.'
      }
    );

  const components = [];

  if (Number(current.teams || 0) === 0 && best) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(RESTORE_BEST_BUTTON_ID)
          .setLabel('Restaurar backup bom')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  await message.reply({ embeds: [embed], components });
}

async function handleRestoreBestBackup(message) {
  const loading = await message.reply('🔄 Procurando backup bom no GitHub...');

  const restored = await restoreBestBackup();

  if (!restored.success) {
    await loading.edit(`❌ ${restored.message}`);
    return;
  }

  const summary = restored.result?.result?.summary || {};

  await loading.edit(
    `✅ Backup bom restaurado!\n` +
    `Arquivo: \`${restored.backup.path}\`\n` +
    `Users: **${summary.users || 0}** • Times: **${summary.teams || 0}** • Eventos: **${summary.events || 0}** • Treinos: **${summary.trainingSubmissions || 0}**`
  );
}

async function handleRestoreBestButton(interaction) {
  if (!canManageBackups(interaction.member)) {
    await interaction.reply({ content: '❌ Você não tem permissão para restaurar backups.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const restored = await restoreBestBackup();

  if (!restored.success) {
    await interaction.editReply(`❌ ${restored.message}`);
    return;
  }

  const summary = restored.result?.result?.summary || {};

  await interaction.editReply(
    `✅ Backup bom restaurado!\n` +
    `Arquivo: \`${restored.backup.path}\`\n` +
    `Users: **${summary.users || 0}** • Times: **${summary.teams || 0}** • Eventos: **${summary.events || 0}** • Treinos: **${summary.trainingSubmissions || 0}**`
  );
}

async function handleBackupNow(message) {
  const status = await storage.readDatabaseStatus();

  if (Number(status.teams || 0) === 0) {
    const best = await findBestBackup();

    const components = best
      ? [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(RESTORE_BEST_BUTTON_ID)
              .setLabel('Restaurar backup bom')
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success)
          )
        ]
      : [];

    await message.reply({
      content: '⚠️ O banco atual está com **0 times**. Por segurança, não vou salvar esse backup por cima do backup bom.',
      components
    });
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
  const backups = [];

  try {
    const latest = await githubBackups.fetchBackupFromGitHubPath('latest/void-arena-backup-latest.json');
    backups.push({
      path: 'latest/void-arena-backup-latest.json',
      isLatest: true,
      savedAt: latest.githubBackup?.savedAt || latest.exportedAt || null,
      exportedAt: latest.exportedAt || null,
      reason: latest.githubBackup?.reason || 'latest',
      summary: latest.summary || {}
    });
  } catch (error) {
    console.warn('⚠️ Latest não encontrado no menu de backups:', error.message);
  }

  try {
    backups.push(...await githubBackups.listBackupsFromGitHub({ limit: 50 }));
  } catch (error) {
    console.warn('⚠️ Histórico de backups indisponível:', error.message);
  }

  const unique = [];
  const seen = new Set();

  for (const item of backups) {
    const path = item.path || item.backupPath;
    if (!path || seen.has(path)) continue;
    seen.add(path);
    unique.push(item);
  }

  const sortedBackups = unique.sort((a, b) => {
    const aTeams = Number(a.summary?.teams || 0);
    const bTeams = Number(b.summary?.teams || 0);

    if (aTeams > 0 && bTeams === 0) return -1;
    if (aTeams === 0 && bTeams > 0) return 1;
    if (a.isLatest && !b.isLatest) return -1;
    if (!a.isLatest && b.isLatest) return 1;

    return new Date(b.savedAt || b.exportedAt || 0).getTime() - new Date(a.savedAt || a.exportedAt || 0).getTime();
  });

  if (!sortedBackups.length) {
    await message.reply('❌ Nenhum backup encontrado no GitHub ainda.');
    return;
  }

  const options = sortedBackups.slice(0, 25).map((item) => ({
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

      if (content === '.db-status') {
        if (!canManageBackups(message.member)) {
          await message.reply('❌ Apenas staff/admin pode ver o status do banco.');
          return;
        }

        await handleDbStatus(message);
      }

      if (content === '.restore-bom') {
        if (!canManageBackups(message.member)) {
          await message.reply('❌ Apenas staff/admin pode restaurar backups.');
          return;
        }

        await handleRestoreBestBackup(message);
      }

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

      if (interaction.isButton?.() && interaction.customId === RESTORE_BEST_BUTTON_ID) {
        await handleRestoreBestButton(interaction);
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
