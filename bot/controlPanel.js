const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} = require('discord.js');

const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

const IDS = {
  refresh: 'control:refresh',
  backup: 'control:backup',
  restoreBest: 'control:restore-best',
  backups: 'control:backups',
  backupSelect: 'control:backup-select',
  forms: 'control:forms',
  training: 'control:training'
};

function canManage(member) {
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

function statusLine(status = {}) {
  return [
    `Users: **${status.users || 0}**`,
    `Times: **${status.teams || 0}**`,
    `Eventos: **${status.events || 0}**`,
    `Treinos: **${status.trainingSubmissions || 0}**`,
    `Formulários: **${status.playerApplications || 0}**`
  ].join(' • ');
}

async function findBestBackup() {
  const candidates = [];

  try {
    const latest = await githubBackups.fetchBackupFromGitHubPath('latest/void-arena-backup-latest.json');

    candidates.push({
      path: 'latest/void-arena-backup-latest.json',
      isLatest: true,
      savedAt: latest.githubBackup?.savedAt || latest.exportedAt || null,
      exportedAt: latest.exportedAt || null,
      summary: latest.summary || {}
    });
  } catch {}

  try {
    candidates.push(...await githubBackups.listBackupsFromGitHub({ limit: 50 }));
  } catch {}

  return candidates
    .filter((item) => Number(item.summary?.teams || 0) > 0)
    .sort((a, b) => new Date(b.savedAt || b.exportedAt || 0).getTime() - new Date(a.savedAt || a.exportedAt || 0).getTime())[0] || null;
}

async function buildPanelEmbed() {
  const current = await storage.readDatabaseStatus();
  const best = await findBestBackup();

  const healthy = Number(current.teams || 0) > 0;

  const embed = new EmbedBuilder()
    .setTitle('🕹️ Painel de Controle • Void Arena')
    .setColor(healthy ? 0x22c55e : 0xf59e0b)
    .setDescription(
      healthy
        ? 'Banco local ativo. Use os botões abaixo para backup, restore e atalhos.'
        : 'Banco local parece incompleto. Restaure o backup seguro antes de salvar novo backup.'
    )
    .addFields(
      {
        name: 'Banco atual do BOT',
        value: statusLine(current)
      },
      {
        name: 'Backup seguro no GitHub',
        value: best
          ? `${statusLine(best.summary || {})}\nArquivo: \`${best.path}\`\nData: ${formatDate(best.savedAt || best.exportedAt)}`
          : 'Nenhum backup seguro com times encontrado.'
      }
    )
    .setFooter({ text: `Atualizado em ${formatDate(new Date().toISOString())}` });

  return { embed, current, best };
}

function panelButtons(current = {}, best = null) {
  const restoreDisabled = !best;
  const backupDisabled = Number(current.teams || 0) === 0;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.refresh)
        .setLabel('Atualizar')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(IDS.backup)
        .setLabel('Backup agora')
        .setEmoji('💾')
        .setStyle(ButtonStyle.Success)
        .setDisabled(backupDisabled),

      new ButtonBuilder()
        .setCustomId(IDS.restoreBest)
        .setLabel('Restaurar seguro')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(restoreDisabled),

      new ButtonBuilder()
        .setCustomId(IDS.backups)
        .setLabel('Backups')
        .setEmoji('🧩')
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.forms)
        .setLabel('Formulários')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(IDS.training)
        .setLabel('Treinos')
        .setEmoji('🎥')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function updatePanelMessage(messageOrInteraction) {
  const { embed, current, best } = await buildPanelEmbed();
  const components = panelButtons(current, best);

  if (messageOrInteraction.editReply) {
    return messageOrInteraction.editReply({ embeds: [embed], components });
  }

  return messageOrInteraction.edit({ embeds: [embed], components });
}

async function sendControlPanel(message) {
  const { embed, current, best } = await buildPanelEmbed();

  const sent = await message.reply({
    embeds: [embed],
    components: panelButtons(current, best)
  });

  await sent.pin().catch(() => {});
}

async function restoreBestBackup() {
  const best = await findBestBackup();
  if (!best) throw new Error('Nenhum backup seguro encontrado.');

  const result = await githubBackups.restoreBackupFromGitHubPath(storage, best.path);

  return { best, result };
}

async function saveCurrentBackup() {
  const current = await storage.readDatabaseStatus();
  const best = await findBestBackup();

  if (Number(current.teams || 0) === 0) {
    return {
      saved: false,
      current,
      best,
      message: 'Banco local incompleto. Restaure o backup seguro antes de salvar.'
    };
  }

  const manifest = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'discord-control-panel'
  });

  return { saved: true, current, best, manifest };
}

function backupOption(item = {}) {
  const teams = Number(item.summary?.teams || 0);
  const icon = teams > 0 ? '✅' : '⚠️';
  const label = `${icon} ${item.isLatest ? 'LATEST • ' : ''}${formatDate(item.savedAt || item.exportedAt)} • ${teams} times • ${item.summary?.users || 0} users`;

  return {
    label: label.slice(0, 100),
    description: `Eventos: ${item.summary?.events || 0} • Treinos: ${item.summary?.trainingSubmissions || 0} • Formulários: ${item.summary?.playerApplications || 0}`.slice(0, 100),
    value: Buffer.from(String(item.path || ''), 'utf8').toString('base64url').slice(0, 100)
  };
}

async function listBackupOptions() {
  const items = [];

  try {
    const latest = await githubBackups.fetchBackupFromGitHubPath('latest/void-arena-backup-latest.json');
    items.push({
      path: 'latest/void-arena-backup-latest.json',
      isLatest: true,
      savedAt: latest.githubBackup?.savedAt || latest.exportedAt || null,
      exportedAt: latest.exportedAt || null,
      summary: latest.summary || {}
    });
  } catch {}

  try {
    items.push(...await githubBackups.listBackupsFromGitHub({ limit: 50 }));
  } catch {}

  const seen = new Set();

  return items
    .filter((item) => {
      if (!item.path || seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    })
    .sort((a, b) => {
      const at = Number(a.summary?.teams || 0);
      const bt = Number(b.summary?.teams || 0);
      if (at > 0 && bt === 0) return -1;
      if (at === 0 && bt > 0) return 1;
      if (a.isLatest && !b.isLatest) return -1;
      if (!a.isLatest && b.isLatest) return 1;
      return new Date(b.savedAt || b.exportedAt || 0).getTime() - new Date(a.savedAt || a.exportedAt || 0).getTime();
    })
    .slice(0, 25);
}

function decodePath(value = '') {
  return Buffer.from(String(value || ''), 'base64url').toString('utf8');
}

function registerControlPanel(client) {
  if (!client || client.__voidArenaControlPanelRegistered) return client;
  client.__voidArenaControlPanelRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      const content = message.content.trim();

      if (content === '.painel-controle') {
        if (!canManage(message.member)) {
          await message.reply('❌ Apenas staff/admin pode criar o painel de controle.');
          return;
        }

        await sendControlPanel(message);
      }
    } catch (error) {
      console.error('❌ Erro no painel de controle:', error);
      await message.reply(`❌ Erro: ${error.message}`).catch(() => {});
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (!interaction.isButton?.() && !interaction.isStringSelectMenu?.()) return;

      if (!String(interaction.customId || '').startsWith('control:')) return;

      if (!canManage(interaction.member)) {
        await interaction.reply({ content: '❌ Apenas staff/admin pode usar esse painel.', ephemeral: true });
        return;
      }

      if (interaction.customId === IDS.refresh) {
        await interaction.deferUpdate();
        await updatePanelMessage(interaction.message);
        return;
      }

      if (interaction.customId === IDS.backup) {
        await interaction.deferReply({ ephemeral: true });
        const result = await saveCurrentBackup();

        if (!result.saved) {
          await interaction.editReply(`⚠️ ${result.message}`);
          await updatePanelMessage(interaction.message);
          return;
        }

        await interaction.editReply(`✅ Backup salvo!\nArquivo: \`${result.manifest.backupPath}\``);
        await updatePanelMessage(interaction.message);
        return;
      }

      if (interaction.customId === IDS.restoreBest) {
        await interaction.deferReply({ ephemeral: true });
        const restored = await restoreBestBackup();
        const summary = restored.result?.result?.summary || {};
        await interaction.editReply(`✅ Backup seguro restaurado!\nTimes: **${summary.teams || 0}** • Users: **${summary.users || 0}**`);
        await updatePanelMessage(interaction.message);
        return;
      }

      if (interaction.customId === IDS.backups) {
        const backups = await listBackupOptions();

        if (!backups.length) {
          await interaction.reply({ content: '❌ Nenhum backup encontrado.', ephemeral: true });
          return;
        }

        await interaction.reply({
          ephemeral: true,
          content: 'Escolha uma versão para restaurar:',
          components: [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(IDS.backupSelect)
                .setPlaceholder('Escolha um backup')
                .addOptions(backups.map(backupOption))
            )
          ]
        });
        return;
      }

      if (interaction.customId === IDS.backupSelect) {
        await interaction.deferReply({ ephemeral: true });

        const path = decodePath(interaction.values?.[0] || '');
        const result = await githubBackups.restoreBackupFromGitHubPath(storage, path);
        const summary = result.result?.summary || {};

        await interaction.editReply(`✅ Backup restaurado!\nArquivo: \`${path}\`\nTimes: **${summary.teams || 0}** • Users: **${summary.users || 0}**`);
        return;
      }

      if (interaction.customId === IDS.forms) {
        await interaction.reply({
          ephemeral: true,
          content:
            '📋 **Formulários Hollow Nexus**\n' +
            'Site: https://void-arena-site.onrender.com/pages/formularios.html\n' +
            'Inscrição: https://void-arena-site.onrender.com/pages/inscricao.html\n\n' +
            'Para criar painel público de inscrição no Discord, use `.inscricao-painel` no canal desejado.'
        });
        return;
      }

      if (interaction.customId === IDS.training) {
        await interaction.reply({
          ephemeral: true,
          content:
            '🎥 **Análise de Treinos**\n' +
            'Site: https://void-arena-site.onrender.com/pages/treinos.html\n\n' +
            'Para criar painel público de envio de treino, use `.treinos-painel` no canal desejado.'
        });
      }
    } catch (error) {
      console.error('❌ Erro na interação do painel de controle:', error);

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
  registerControlPanel
};
