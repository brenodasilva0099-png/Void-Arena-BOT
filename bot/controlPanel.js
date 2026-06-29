const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder
} = require('discord.js');

const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');
const { syncResultHubsForBracket } = require('./matchResults');

const backupPathTokenCache = new Map();

const IDS = {
  refresh: 'control:refresh',
  backup: 'control:backup',
  restoreBest: 'control:restore-best',
  backups: 'control:backups',
  backupSelect: 'control:backup-select',
  forms: 'control:forms',
  training: 'control:training',
  results: 'control:results',
  permissions: 'control:permissions',
  permissionRole: 'control:permission-role',
  permissionSetPrefix: 'control:permission-set:',
  permissionClearPrefix: 'control:permission-clear:'
};

const PERMISSION_LABELS = {
  forms: 'Formulários',
  events: 'Eventos',
  matches: 'Análise',
  stats: 'Estatísticas',
  bracket: 'Chaveamento',
  teams: 'Times',
  backup: 'Backup',
  config: 'Config'
};

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
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
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
        ? 'Banco local ativo. Use os botões abaixo para backup, restore, resultados e permissões.'
        : 'Banco local carregado. Você pode salvar backup do estado atual quando quiser.'
    )
    .addFields(
      { name: 'Banco atual do BOT', value: statusLine(current) },
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

function panelButtons(_current = {}, best = null) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(IDS.refresh).setLabel('Atualizar').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(IDS.backup).setLabel('Backup agora').setEmoji('💾').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(IDS.restoreBest).setLabel('Restaurar seguro').setEmoji('✅').setStyle(ButtonStyle.Primary).setDisabled(!best),
      new ButtonBuilder().setCustomId(IDS.backups).setLabel('Backups').setEmoji('🧩').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(IDS.forms).setLabel('Formulários').setEmoji('📋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(IDS.training).setLabel('Partidas').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(IDS.results).setLabel('Resultados').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(IDS.permissions).setLabel('Permissões').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function updatePanelMessage(messageOrInteraction) {
  const { embed, current, best } = await buildPanelEmbed();
  const components = panelButtons(current, best);
  if (messageOrInteraction.editReply) return messageOrInteraction.editReply({ embeds: [embed], components });
  return messageOrInteraction.edit({ embeds: [embed], components });
}

async function sendControlPanel(message) {
  const { embed, current, best } = await buildPanelEmbed();
  const sent = await message.reply({ embeds: [embed], components: panelButtons(current, best) });
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
  const manifest = await githubBackups.saveBackupToGitHub(storage, { reason: 'discord-control-panel-current-state' });
  return { saved: true, current, best, manifest };
}

function backupOption(item = {}) {
  const teams = Number(item.summary?.teams || 0);
  const icon = teams > 0 ? '✅' : '⚠️';
  const label = `${icon} ${item.isLatest ? 'LATEST • ' : ''}${formatDate(item.savedAt || item.exportedAt)} • ${teams} times • ${item.summary?.users || 0} users`;
  const description = `Eventos: ${item.summary?.events || 0} • Partidas: ${item.summary?.trainingSubmissions || 0} • Formulários: ${item.summary?.playerApplications || 0}`;
  return { label: label.slice(0, 100), description: description.slice(0, 100), value: makeBackupToken(item.path || '') };
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
    .sort((a, b) => new Date(b.savedAt || b.exportedAt || 0).getTime() - new Date(a.savedAt || a.exportedAt || 0).getTime())
    .slice(0, 25);
}

function permissionOptions(current = {}) {
  return Object.entries(PERMISSION_LABELS).map(([key, label]) => ({
    label,
    value: key,
    description: current[key] ? 'Ativado para esse cargo' : 'Desativado para esse cargo',
    default: Boolean(current[key])
  }));
}

async function permissionRoleComponents(roleId = '') {
  const all = await storage.readRolePermissions().catch(() => ({}));
  const current = all[roleId] || {};
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${IDS.permissionSetPrefix}${roleId}`)
        .setPlaceholder('Escolha as permissões desse cargo')
        .setMinValues(0)
        .setMaxValues(Object.keys(PERMISSION_LABELS).length)
        .addOptions(permissionOptions(current))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${IDS.permissionClearPrefix}${roleId}`)
        .setLabel('Limpar permissões desse cargo')
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function permissionsRolePickerComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(IDS.permissionRole)
        .setPlaceholder('Escolha um cargo para configurar')
        .setMinValues(1)
        .setMaxValues(1)
    )
  ];
}

async function handlePermissionSet(interaction, roleId) {
  const values = Array.isArray(interaction.values) ? interaction.values : [];
  const all = await storage.readRolePermissions().catch(() => ({}));
  const nextForRole = {};
  Object.keys(PERMISSION_LABELS).forEach((key) => {
    nextForRole[key] = values.includes(key);
  });
  const next = { ...all, [roleId]: nextForRole };
  await storage.writeRolePermissions(next);
  await interaction.update({
    content: `✅ Permissões atualizadas para <@&${roleId}>.`,
    components: await permissionRoleComponents(roleId),
    allowedMentions: { parse: [] }
  });
}

async function handlePermissionClear(interaction, roleId) {
  const all = await storage.readRolePermissions().catch(() => ({}));
  const next = { ...all };
  delete next[roleId];
  await storage.writeRolePermissions(next);
  await interaction.update({
    content: `🧹 Permissões limpas para <@&${roleId}>.`,
    components: await permissionRoleComponents(roleId),
    allowedMentions: { parse: [] }
  });
}

function registerControlPanel(client) {
  if (!client || client.__voidArenaControlPanelRegistered) return client;
  client.__voidArenaControlPanelRegistered = true;

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      const content = message.content.trim();
      if (content !== '.painel-controle') return;

      if (!canManage(message.member)) {
        await message.reply('❌ Apenas staff/admin pode criar o painel de controle.');
        return;
      }

      await sendControlPanel(message);
    } catch (error) {
      console.error('❌ Erro no painel de controle:', error);
      await message.reply(`❌ Erro: ${error.message}`).catch(() => {});
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      const customId = String(interaction.customId || '');
      const isControl = customId.startsWith('control:');
      if (!isControl) return;

      const usable = interaction.isButton?.() || interaction.isStringSelectMenu?.() || interaction.isRoleSelectMenu?.();
      if (!usable) return;

      if (!canManage(interaction.member)) {
        await interaction.reply({ content: '❌ Apenas staff/admin pode usar esse painel.', ephemeral: true });
        return;
      }

      if (customId === IDS.refresh) {
        await interaction.deferUpdate();
        await updatePanelMessage(interaction.message);
        return;
      }

      if (customId === IDS.backup) {
        await interaction.deferReply({ ephemeral: true });
        const result = await saveCurrentBackup();
        await interaction.editReply(`✅ Backup salvo!\nArquivo: \`${result.manifest.backupPath}\``);
        await updatePanelMessage(interaction.message);
        return;
      }

      if (customId === IDS.restoreBest) {
        await interaction.deferReply({ ephemeral: true });
        const restored = await restoreBestBackup();
        const summary = restored.result?.result?.summary || restored.result?.summary || {};
        await interaction.editReply(`✅ Backup seguro restaurado!\nTimes: **${summary.teams || 0}** • Users: **${summary.users || 0}**`);
        await updatePanelMessage(interaction.message);
        return;
      }

      if (customId === IDS.backups) {
        await interaction.deferReply({ ephemeral: true });
        const backups = await listBackupOptions();
        if (!backups.length) return interaction.editReply({ content: '❌ Nenhum backup encontrado.' });
        await interaction.editReply({
          content: '🧩 **Backups encontrados**\nEscolha abaixo qual versão deseja restaurar.',
          components: [new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(IDS.backupSelect)
              .setPlaceholder('Escolha um backup para restaurar')
              .addOptions(backups.map(backupOption))
          )]
        });
        return;
      }

      if (customId === IDS.backupSelect) {
        await interaction.deferReply({ ephemeral: true });
        const path = getBackupPathFromToken(interaction.values?.[0] || '');
        if (!path) return interaction.editReply('⚠️ Essa seleção expirou. Clique em **Backups** de novo e selecione novamente.');
        const result = await githubBackups.restoreBackupFromGitHubPath(storage, path);
        const summary = result.result?.summary || result.summary || {};
        await interaction.editReply(`✅ Backup restaurado!\nArquivo: \`${path}\`\nTimes: **${summary.teams || 0}** • Users: **${summary.users || 0}**`);
        await updatePanelMessage(interaction.message).catch(() => {});
        return;
      }

      if (customId === IDS.forms) {
        await interaction.reply({
          ephemeral: true,
          content: '📋 **Formulários Hollow Nexus**\nSite: https://void-arena-site.onrender.com/pages/formularios.html\nInscrição: https://void-arena-site.onrender.com/pages/inscricao.html\n\nPara criar painel público de inscrição no Discord, use `.inscricao-painel` no canal desejado.'
        });
        return;
      }

      if (customId === IDS.training) {
        await interaction.reply({
          ephemeral: true,
          content: '🎥 **Análise de Partidas**\nSite: https://void-arena-site.onrender.com/pages/treinos.html\n\nPara criar painel público de envio de partida, use `.partidas-painel` no canal desejado.'
        });
        return;
      }

      if (customId === IDS.results) {
        await interaction.deferReply({ ephemeral: true });
        let sync = null;
        try {
          sync = await syncResultHubsForBracket(interaction.client);
        } catch (error) {
          sync = { success: false, message: error.message, created: 0, totalMatches: 0 };
        }
        await interaction.editReply([
          '🏆 **Resultados**',
          'Site: https://void-arena-site.onrender.com/pages/dashboard.html',
          `Canal: <#${process.env.RESULTS_CHANNEL_ID || '1521257495727706234'}>`,
          sync.success ? `HUBs sincronizadas: **${sync.created || 0}/${sync.totalMatches || 0}**.` : `Falha ao sincronizar HUBs: ${sync.message}`,
          '',
          'Comando manual: `.resultados-sync` ou `.resultado-hub slots 1`.'
        ].join('\n'));
        return;
      }

      if (customId === IDS.permissions) {
        await interaction.reply({
          ephemeral: true,
          content: '⚙️ **Permissões por cargo**\nEscolha um cargo abaixo para definir quais áreas do site ele pode acessar.',
          components: permissionsRolePickerComponents()
        });
        return;
      }

      if (customId === IDS.permissionRole) {
        const roleId = String(interaction.values?.[0] || '').trim();
        if (!roleId) return interaction.reply({ content: '❌ Cargo inválido.', ephemeral: true });
        await interaction.update({
          content: `⚙️ Configurando permissões para <@&${roleId}>.`,
          components: await permissionRoleComponents(roleId),
          allowedMentions: { parse: [] }
        });
        return;
      }

      if (customId.startsWith(IDS.permissionSetPrefix)) {
        const roleId = customId.slice(IDS.permissionSetPrefix.length);
        await handlePermissionSet(interaction, roleId);
        return;
      }

      if (customId.startsWith(IDS.permissionClearPrefix)) {
        const roleId = customId.slice(IDS.permissionClearPrefix.length);
        await handlePermissionClear(interaction, roleId);
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
