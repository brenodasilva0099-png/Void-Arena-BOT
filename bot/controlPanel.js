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

const backupPathTokenCache = new Map();

function makeBackupToken(path = '') {
  const token = `bkp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  backupPathTokenCache.set(token, {
    path: String(path || ''),
    expiresAt: Date.now() + (15 * 60 * 1000)
  });
  return token;
}

function getBackupPathFromToken(token = '') {
  const cached = backupPathTokenCache.get(String(token || ''));
  if (!cached) return '';

  if (cached.expiresAt < Date.now()) {
    backupPathTokenCache.delete(String(token || ''));
    return '';
  }

  return cached.path;
}

const IDS = {
  refresh: 'control:refresh',
  backup: 'control:backup',
  restoreBest: 'control:restore-best',
  backups: 'control:backups',
  backupSelect: 'control:backup-select',
  forms: 'control:forms',
  training: 'control:training'
};

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

function canManage(member) {
  const roleIds = envRoleIds('CONTROL_PANEL_ROLE_IDS', 'BACKUP_ROLE_IDS', 'CONFIG_ROLE_IDS', 'ADMIN_ROLE_IDS');
  return Boolean(
    member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
    memberHasAnyRole(member, roleIds)
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
    `Usuários: **${status.users || 0}**`,
    `Times: **${status.teams || 0}**`,
    `Eventos: **${status.events || 0}**`,
    `Partidas: **${status.trainingSubmissions || 0}**`,
    `Formulários: **${status.playerApplications || 0}**`,
    `Validações: **${status.eventRegistrationRequests || 0}**`,
    `Mensagens: **${status.messages || 0}**`
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
        : 'Banco local carregado. Você pode salvar backup do estado atual quando quiser.'
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
  const backupDisabled = false;

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
        .setDisabled(false),

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
        .setLabel('Partidas')
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

  const manifest = await githubBackups.saveBackupToGitHub(storage, {
    reason: 'discord-control-panel-current-state'
  });

  return { saved: true, current, best, manifest };
}

function backupOption(item = {}) {
  const teams = Number(item.summary?.teams || 0);
  const icon = teams > 0 ? '✅' : '⚠️';
  const label = `${icon} ${item.isLatest ? 'LATEST • ' : ''}${formatDate(item.savedAt || item.exportedAt)} • ${teams} times • ${item.summary?.users || 0} users`;
  const description = `Eventos: ${item.summary?.events || 0} • Treinos: ${item.summary?.trainingSubmissions || 0} • Formulários: ${item.summary?.playerApplications || 0}`;

  return {
    label: label.slice(0, 100),
    description: description.slice(0, 100),
    value: makeBackupToken(item.path || '')
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
    items.push(...await githubBackups.listBackupsFromGitHub({ limit: 200 }));
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
  return getBackupPathFromToken(value);
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
        await interaction.deferReply({ ephemeral: true });

        const backups = await listBackupOptions();

        if (!backups.length) {
          await interaction.editReply({ content: '❌ Nenhum backup encontrado.' });
          return;
        }

        await interaction.editReply({
          content:
            '🧩 **Backups encontrados**\n' +
            'Escolha abaixo qual versão deseja restaurar. Estou mostrando os 25 melhores/mais recentes porque o Discord limita o menu a 25 opções.',
          components: [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(IDS.backupSelect)
                .setPlaceholder('Escolha um backup para restaurar')
                .addOptions(backups.map(backupOption))
            )
          ]
        });
        return;
      }

      if (interaction.customId === IDS.backupSelect) {
        await interaction.deferReply({ ephemeral: true });

        const path = decodePath(interaction.values?.[0] || '');

        if (!path) {
          await interaction.editReply('⚠️ Essa seleção expirou. Clique em **Backups** de novo e selecione novamente.');
          return;
        }

        const result = await githubBackups.restoreBackupFromGitHubPath(storage, path);
        const summary = result.result?.summary || {};

        await interaction.editReply(`✅ Backup restaurado!\nArquivo: \`${path}\`\nTimes: **${summary.teams || 0}** • Users: **${summary.users || 0}**`);
        await updatePanelMessage(interaction.message).catch(() => {});
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
            '🎥 **Análise de Partidas**\n' +
            'Site: https://void-arena-site.onrender.com/pages/treinos.html\n\n' +
            'Para criar painel público de envio de partida, use `.partidas-painel` no canal desejado.'
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
