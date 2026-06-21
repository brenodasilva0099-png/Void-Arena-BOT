const userChip = document.querySelector('#userChip');
const userChipName = document.querySelector('#userChipName');
const userChipAvatar = document.querySelector('#userChipAvatar');
const userDropdown = document.querySelector('#userDropdown');
const userDropdownName = document.querySelector('#userDropdownName');
const userDropdownMeta = document.querySelector('#userDropdownMeta');
const userDropdownAvatar = document.querySelector('#userDropdownAvatar');
const logoutBtn = document.querySelector('#logoutBtn');
const botAvatar = document.querySelector('#botAvatar');
const botDisplayName = document.querySelector('#botDisplayName');
const openRankingsBtn = document.querySelector('#openRankingsBtn');
const rankingsModal = document.querySelector('#rankingsModal');
const closeRankingsBtn = document.querySelector('#closeRankingsBtn');
const rankingsContent = document.querySelector('#rankingsContent');
const userProfileModal = document.querySelector('#userProfileModal');
const userProfileContent = document.querySelector('#userProfileContent');
const userProfileTitle = document.querySelector('#userProfileTitle');
const closeUserProfileBtn = document.querySelector('#closeUserProfileBtn');
const teamProfileModal = document.querySelector('#teamProfileModal');
const teamProfileContent = document.querySelector('#teamProfileContent');
const closeTeamProfileBtn = document.querySelector('#closeTeamProfileBtn');
const rankingTabs = document.querySelectorAll('.ranking-tab');
const openMyTeamsBtn = document.querySelector('#openMyTeamsBtn');
const closeMyTeamsBtn = document.querySelector('#closeMyTeamsBtn');
const myTeamsModal = document.querySelector('#myTeamsModal');
const myTeamsContent = document.querySelector('#myTeamsContent');
const dropdownLogoutBtn = document.querySelector('#dropdownLogoutBtn');
const myMatchesBtn = document.querySelector('#myMatchesBtn');
const settingsBtn = document.querySelector('#settingsBtn');
const myMatchesModal = document.querySelector('#myMatchesModal');
const closeMyMatchesBtn = document.querySelector('#closeMyMatchesBtn');
const myMatchesContent = document.querySelector('#myMatchesContent');
const settingsModal = document.querySelector('#settingsModal');
const closeSettingsBtn = document.querySelector('#closeSettingsBtn');
const settingsForm = document.querySelector('#settingsForm');
const settingsAvatar = document.querySelector('#settingsAvatar');
const settingsName = document.querySelector('#settingsName');
const settingsMeta = document.querySelector('#settingsMeta');
const settingsMessage = document.querySelector('#settingsMessage');
const settingsPreviewSteam = document.querySelector('#settingsPreviewSteam');
const settingsPreviewRegion = document.querySelector('#settingsPreviewRegion');
const settingsBannerPreview = document.querySelector('#settingsBannerPreview');
const changeProfileBannerBtn = document.querySelector('#changeProfileBannerBtn');
const clearProfileBannerBtn = document.querySelector('#clearProfileBannerBtn');
const profileBannerInput = document.querySelector('#profileBannerInput');
const selectProfileBannerFileBtn = document.querySelector('#selectProfileBannerFileBtn');
const profileBannerFileName = document.querySelector('#profileBannerFileName');
const profileBannerUrlInput = document.querySelector('#profileBannerUrlInput');
const profileBannerPasteBox = document.querySelector('#profileBannerPasteBox');
const useDiscordBannerBtn = document.querySelector('#useDiscordBannerBtn');

const openHowToBtn = document.querySelector('#openHowToBtn');
const howToModal = document.querySelector('#howToModal');
const closeHowToBtn = document.querySelector('#closeHowToBtn');
const openSiteChatBtn = document.querySelector('#openSiteChatBtn');
const openStatsBtn = document.querySelector('#openStatsBtn');
const statsNotificationBadge = document.querySelector('#statsNotificationBadge');
const statsChatModal = document.querySelector('#statsChatModal');
const closeStatsChatBtn = document.querySelector('#closeStatsChatBtn');
const statsChatMessages = document.querySelector('#statsChatMessages');
const statsChatForm = document.querySelector('#statsChatForm');
const statsChatStatus = document.querySelector('#statsChatStatus');
const openStatsChatSettingsBtn = document.querySelector('#openStatsChatSettingsBtn');
const statsChatSettingsPanel = document.querySelector('#statsChatSettingsPanel');
const statsBridgeChannelSelect = document.querySelector('#statsBridgeChannelSelect');
const saveStatsBridgeSettingsBtn = document.querySelector('#saveStatsBridgeSettingsBtn');
const refreshStatsBridgeChannelsBtn = document.querySelector('#refreshStatsBridgeChannelsBtn');
const statsChatSettingsStatus = document.querySelector('#statsChatSettingsStatus');
const statsChatBridgeMeta = document.querySelector('#statsChatBridgeMeta');
const siteChatNotificationBadge = document.querySelector('#siteChatNotificationBadge');
const siteNotificationStack = document.querySelector('#siteNotificationStack');
const siteChatModal = document.querySelector('#siteChatModal');
const closeSiteChatBtn = document.querySelector('#closeSiteChatBtn');
const siteChatMessages = document.querySelector('#siteChatMessages');
const siteChatForm = document.querySelector('#siteChatForm');
const siteChatStatus = document.querySelector('#siteChatStatus');
const openTeamChatBtn = document.querySelector('#openTeamChatBtn');
const teamChatModal = document.querySelector('#teamChatModal');
const closeTeamChatBtn = document.querySelector('#closeTeamChatBtn');
const teamChatCreateForm = document.querySelector('#teamChatCreateForm');
const scrimDirectoryGrid = document.querySelector('#scrimDirectoryGrid');
const teamChatList = document.querySelector('#teamChatList');
const teamChatMessages = document.querySelector('#teamChatMessages');
const teamChatForm = document.querySelector('#teamChatForm');
const teamChatStatus = document.querySelector('#teamChatStatus');
const activeTeamChatTitle = document.querySelector('#activeTeamChatTitle');
const openSiteChatSettingsBtn = document.querySelector('#openSiteChatSettingsBtn');
const siteChatSettingsPanel = document.querySelector('#siteChatSettingsPanel');
const bridgeChannelSelect = document.querySelector('#bridgeChannelSelect');
const saveBridgeSettingsBtn = document.querySelector('#saveBridgeSettingsBtn');
const refreshBridgeChannelsBtn = document.querySelector('#refreshBridgeChannelsBtn');
const siteChatSettingsStatus = document.querySelector('#siteChatSettingsStatus');
const siteChatBridgeMeta = document.querySelector('#siteChatBridgeMeta');
const openTermsBtn = document.querySelector('#openTermsBtn');
const termsModal = document.querySelector('#termsModal');
const closeTermsBtn = document.querySelector('#closeTermsBtn');
const openMusicSettingsBtn = document.querySelector('#openMusicSettingsBtn');
const musicSettingsPanel = document.querySelector('#musicSettingsPanel');
const closeMusicSettingsBtn = document.querySelector('#closeMusicSettingsBtn');
const musicTrackSelect = document.querySelector('#musicTrackSelect');
const musicStartBtn = document.querySelector('#musicStartBtn');
const musicStopBtn = document.querySelector('#musicStopBtn');
const musicVolumeRange = document.querySelector('#musicVolumeRange');
const musicStatus = document.querySelector('#musicStatus');

const toggleTournamentActionsBtn = document.querySelector('#toggleTournamentActionsBtn');
const tournamentActionsMenu = document.querySelector('#tournamentActionsMenu');

const topCreateTeamBtn = document.querySelector('#topCreateTeamBtn');
const openBracketScreenBtn = document.querySelector('#openBracketScreenBtn');
const openBracketFromHomeBtn = document.querySelector('#openBracketFromHomeBtn');
const backToPlayerHomeBtn = document.querySelector('#backToPlayerHomeBtn');
const playerHomeScreen = document.querySelector('#playerHomeScreen');
const bracketScreen = document.querySelector('#bracketScreen');
const homeCreateTeamBtn = document.querySelector('#homeCreateTeamBtn');
const openCreateEventBtn = document.querySelector('#openCreateEventBtn');
const editMainEventBtn = document.querySelector('#editMainEventBtn');
const homeCreateTeamStepBtn = document.querySelector('#homeCreateTeamStepBtn');
const homeJoinEventBtn = document.querySelector('#homeJoinEventBtn');
const homeTeamChatBtn = document.querySelector('#homeTeamChatBtn');
const homeRulesBtn = document.querySelector('#homeRulesBtn');
const eventVagasLabel = document.querySelector('#eventVagasLabel');
const mainEventTitle = document.querySelector('#mainEventTitle');
const mainEventDescription = document.querySelector('#mainEventDescription');
const eventModeValue = document.querySelector('#eventModeValue');
const eventFormatValue = document.querySelector('#eventFormatValue');
const eventStartValue = document.querySelector('#eventStartValue');
const eventMinimumTeamsMeta = document.querySelector('#eventMinimumTeamsMeta');
const eventsShowcaseList = document.querySelector('#eventsShowcaseList');
const eventProgressBar = document.querySelector('#eventProgressBar');
const eventRegisteredTeams = document.querySelector('#eventRegisteredTeams');
const publicTeamsGrid = document.querySelector('#publicTeamsGrid');
const eventRegisterModal = document.querySelector('#eventRegisterModal');
const closeEventRegisterBtn = document.querySelector('#closeEventRegisterBtn');
const eventRegisterChoices = document.querySelector('#eventRegisterChoices');
const eventRegisterStatus = document.querySelector('#eventRegisterStatus');
const rulesModal = document.querySelector('#rulesModal');
const eventEditorModal = document.querySelector('#eventEditorModal');
const eventEditorForm = document.querySelector('#eventEditorForm');
const eventEditorTitle = document.querySelector('#eventEditorTitle');
const eventEditorMessage = document.querySelector('#eventEditorMessage');
const closeEventEditorBtn = document.querySelector('#closeEventEditorBtn');
const cancelEventEditorBtn = document.querySelector('#cancelEventEditorBtn');
const closeRulesBtn = document.querySelector('#closeRulesBtn');
const closeTeamModalBtn = document.querySelector('#closeTeamModalBtn');
const cancelTeamBtn = document.querySelector('#cancelTeamBtn');
const teamModal = document.querySelector('#teamModal');
const teamForm = document.querySelector('#teamForm');
const teamId = document.querySelector('#teamId');
const teamLogoInput = document.querySelector('#teamLogoInput');
const teamLogoUrlInput = document.querySelector('#teamLogoUrlInput');
const logoPasteBox = document.querySelector('#logoPasteBox');
const logoPreview = document.querySelector('#logoPreview');
const addReserveBtn = document.querySelector('#addReserveBtn');
const reservesGrid = document.querySelector('#reservesGrid');
const teamFormMessage = document.querySelector('#teamFormMessage');
const teamsList = document.querySelector('#teamsList');
const teamCounter = document.querySelector('#teamCounter');
const generateBracketBtn = document.querySelector('#generateBracketBtn');
const refreshTeamsBtn = document.querySelector('#refreshTeamsBtn');
const clearBracketBtn = document.querySelector('#clearBracketBtn');
const bracketStatus = document.querySelector('#bracketStatus');
const openBracketEditorBtn = document.querySelector('#openBracketEditorBtn');
const bracketEditorModal = document.querySelector('#bracketEditorModal');
const closeBracketEditorBtn = document.querySelector('#closeBracketEditorBtn');
const cancelBracketEditorBtn = document.querySelector('#cancelBracketEditorBtn');
const saveBracketEditorBtn = document.querySelector('#saveBracketEditorBtn');
const bracketEditorGrid = document.querySelector('#bracketEditorGrid');
const bracketEditorMessage = document.querySelector('#bracketEditorMessage');
const boardTournamentName = document.querySelector('#boardTournamentName');
const boardMatchFormatLabel = document.querySelector('#boardMatchFormatLabel');
const openTournamentConfigBtn = document.querySelector('#openTournamentConfigBtn');
const tournamentConfigModal = document.querySelector('#tournamentConfigModal');
const closeTournamentConfigBtn = document.querySelector('#closeTournamentConfigBtn');
const tournamentConfigForm = document.querySelector('#tournamentConfigForm');
const tournamentConfigMessage = document.querySelector('#tournamentConfigMessage');
const teamLimitSelect = document.querySelector('#teamLimitSelect');
const groupCountSelect = document.querySelector('#groupCountSelect');
const groupsPreview = document.querySelector('#groupsPreview');
const autoCreateMatchChannelsInput = document.querySelector('#autoCreateMatchChannelsInput');
const matchCategorySelect = document.querySelector('#matchCategorySelect');
const openManualFromConfigBtn = document.querySelector('#openManualFromConfigBtn');

let teams = [];
let usersLookup = [];
let currentUser = null;
let currentEvents = [];
let currentMainEvent = null;
let currentEventId = 'coliseu-void-arena';
let currentBracketData = {
  slots: Array(16).fill(null),
  quarters: Array(8).fill(null),
  semis: Array(4).fill(null),
  finals: Array(2).fill(null),
  matchProgress: {
    slots: Array(16).fill(1),
    quarters: Array(8).fill(1),
    semis: Array(4).fill(1),
    finals: Array(2).fill(1)
  }
};
let currentLogoData = null;
let currentProfileBannerData = '';
let currentProfileBannerSource = '';
let tournamentSettings = {
  tournamentName: 'Rematch Championship',
  matchFormat: 'MD1',
  structure: 'single_elimination',
  teamLimit: 16,
  groupCount: 4,
  groups: [],
  autoCreateMatchChannels: true,
  discordMatchCategoryId: ''
};
let siteChatTimer = null;
let siteChatNotificationTimer = null;
let siteChatUnreadCount = 0;
let siteChatNotifyBootstrapped = false;
let statsChatTimer = null;
let statsChatNotificationTimer = null;
let statsChatUnreadCount = 0;
let statsChatNotifyBootstrapped = false;
let teamChatTimer = null;
let teamChatConversations = [];
let activeTeamChatId = '';
let discordChannelsCache = [];
let discordMentionCache = { members: [], roles: [] };
let chatBridgeSettings = { enabled: false, siteChannelId: 'site-main', discordChannelId: '' };
let statsBridgeSettings = { enabled: false, siteChannelId: 'stats-main', discordChannelId: '' };
let backgroundMusic = null;
const MAX_RESERVES = 5;
const MUSIC_STORAGE_KEY = 'abyss:tournament:music-settings';
const SITE_CHAT_SEEN_STORAGE_KEY = 'abyss:tournament:site-chat:last-seen';
const SITE_CHAT_NOTIFIED_STORAGE_KEY = 'abyss:tournament:site-chat:last-notified';
const STATS_CHAT_SEEN_STORAGE_KEY = 'abyss:tournament:stats-chat:last-seen';
const STATS_CHAT_NOTIFIED_STORAGE_KEY = 'abyss:tournament:stats-chat:last-notified';
const MUSIC_TRACKS = {
  'arena-01': { label: 'Arena 01', src: '/assets/audio/arena-01.mp3' },
  'campeonato-02': { label: 'Campeonato 02', src: '/assets/audio/campeonato-02.mp3' },
  'torcida-03': { label: 'Torcida 03', src: '/assets/audio/torcida-03.mp3' }
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDaysActive(createdAt) {
  if (!createdAt) return '0 dias';
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return '0 dias';
  const diff = Date.now() - created;
  const days = Math.max(1, Math.floor(diff / 86400000));
  return `${days} dia${days === 1 ? '' : 's'}`;
}

function teamLogoHtml(team, sizeClass = '') {
  if (team.logo) {
    return `<img src="${escapeHtml(team.logo)}" alt="Logo ${escapeHtml(team.name)}" loading="lazy" onerror="this.remove()" />`;
  }

  return `<span>${escapeHtml((team.tag || team.name || '?').slice(0, 2).toUpperCase())}</span>`;
}

function normalizeBracketData(data = {}) {
  const fill = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(null);
    return arr;
  };

  const fillProgress = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(1);
    return arr.map((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
    });
  };

  return {
    slots: fill(data.slots, 16),
    quarters: fill(data.quarters, 8),
    semis: fill(data.semis, 4),
    finals: fill(data.finals, 2),
    matchProgress: {
      slots: fillProgress(data.matchProgress?.slots, 16),
      quarters: fillProgress(data.matchProgress?.quarters, 8),
      semis: fillProgress(data.matchProgress?.semis, 4),
      finals: fillProgress(data.matchProgress?.finals, 2)
    },
    generatedAt: data.generatedAt || null,
    updatedAt: data.updatedAt || null
  };
}

function teamIdOf(team) {
  return team?.id || null;
}

function setAvatar(target, user) {
  if (!target) return;

  if (user.avatar) {
    target.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="Avatar do usuário" />`;
    return;
  }

  target.textContent = (user.name || 'A').slice(0, 1).toUpperCase();
}

function withCacheBuster(url, token = Date.now()) {
  if (!url) return url;
  return `${url}${url.includes('?') ? '&' : '?'}abyssFresh=${encodeURIComponent(token)}`;
}

async function loadBotProfile() {
  try {
    const response = await fetch(`/api/bot?t=${Date.now()}`, { cache: 'no-store' });
    const data = await response.json();

    if (data.avatar) {
      const freshAvatar = withCacheBuster(data.avatar, data.fetchedAt || Date.now());
      document.querySelectorAll('.bot-brand-avatar img, .brand-image img').forEach((img) => {
        if (img.src !== freshAvatar) img.src = freshAvatar;
      });
    }

    const displayName = data.applicationName || data.displayName || data.name || data.username || (data.tag ? String(data.tag).split('#')[0] : '');
    if (displayName && botDisplayName) {
      botDisplayName.textContent = displayName;
      document.title = `Painel | ${displayName}`;
    }
  } catch {}
}

function startBotProfileAutoRefresh() {
  loadBotProfile().catch(() => {});
  window.setInterval(() => {
    loadBotProfile().catch(() => {});
  }, 20000);
}

async function loadMe() {
  const response = await fetch('/api/me');

  if (!response.ok) {
    window.location.href = '/';
    return;
  }

  const data = await response.json();
  const user = data.user;
  currentUser = user;
  const name = publicUserName(user);
  const provider = user.provider || 'login';

  userChipName.textContent = name;
  userDropdownName.textContent = name;
  userDropdownMeta.textContent = 'Perfil do torneio';

  if (settingsName) settingsName.textContent = name;
  if (settingsMeta) {
    settingsMeta.textContent = user.email
      ? `${user.email} • login via ${provider}`
      : `login via ${provider}`;
  }

  setAvatar(userChipAvatar, user);
  setAvatar(userDropdownAvatar, user);
  setAvatar(settingsAvatar, user);

  initCustomSelects(settingsForm || document);
  loadUserSocialSettings();
  applyAdminMode();
}

function setLogoPreview(value) {
  currentLogoData = value || null;

  if (!logoPreview) return;

  if (!currentLogoData) {
    logoPreview.innerHTML = '<span>Sem logo</span>';
    logoPreview.classList.remove('has-image');
    return;
  }

  logoPreview.innerHTML = `<img src="${escapeHtml(currentLogoData)}" alt="Preview da logo" />`;
  logoPreview.classList.add('has-image');
}

function clearReserveFields() {
  reservesGrid.innerHTML = '';
}

function addReserveField(value = '', accountId = '') {
  const current = reservesGrid.querySelectorAll('input[name="reserve"]').length;
  if (current >= MAX_RESERVES) {
    teamFormMessage.textContent = `Limite de ${MAX_RESERVES} reservas atingido.`;
    teamFormMessage.className = 'auth-message';
    return;
  }

  const label = document.createElement('label');
  label.className = 'reserve-field';
  label.innerHTML = `
    Reserva ${current + 1}
    <div class="reserve-row reserve-row-expanded">
      <input name="reserve" type="text" placeholder="Nick do reserva" value="${escapeHtml(value)}" />
      <input name="reserveAccount" type="text" placeholder="ID da conta/Discord opcional" value="${escapeHtml(accountId)}" />
      <button class="mini-btn remove-reserve" type="button" aria-label="Remover reserva">×</button>
    </div>
  `;
  reservesGrid.appendChild(label);
}

function openTeamModal(team = null) {
  teamForm.reset();
  teamFormMessage.textContent = '';
  teamFormMessage.className = 'auth-message';
  teamLogoInput.value = '';
  teamLogoUrlInput.value = '';
  clearReserveFields();
  setLogoPreview(null);

  if (team) {
    document.querySelector('#teamModalTitle').textContent = 'Editar time';
    teamId.value = team.id;
    teamForm.elements.name.value = team.name || '';
    teamForm.elements.tag.value = team.tag || '';
    setLogoPreview(team.logo || null);

    const players = Array.isArray(team.players) ? team.players : [];
    const playerAccounts = team.playerAccounts || {};
    const playerAccountIds = Array.isArray(playerAccounts.players) ? playerAccounts.players : [];
    for (let i = 1; i <= 5; i += 1) {
      teamForm.elements[`player${i}`].value = players[i - 1] || '';
      const accountField = teamForm.elements[`playerAccount${i}`];
      if (accountField) accountField.value = playerAccountIds[i - 1] || '';
    }

    const reserves = Array.isArray(team.reserves) ? team.reserves : [];
    const reserveAccountIds = Array.isArray(playerAccounts.reserves) ? playerAccounts.reserves : [];
    reserves.forEach((reserve, index) => addReserveField(reserve, reserveAccountIds[index] || ''));

    const socials = team.socials || {};
    ['Site', 'Email', 'Discord', 'Twitter', 'Youtube', 'Tiktok', 'Instagram'].forEach((key) => {
      const field = teamForm.elements[`social${key}`];
      if (field) field.value = socials[key.toLowerCase()] || '';
    });
  } else {
    document.querySelector('#teamModalTitle').textContent = 'Cadastrar time';
    teamId.value = '';
  }

  teamModal.hidden = false;
}

function closeTeamModal() {
  teamModal.hidden = true;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    if (!file.type.startsWith('image/')) {
      return reject(new Error('Escolha um arquivo de imagem válido.'));
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Não foi possível completar a ação.');
  }

  return data;
}


function isAdminUser() {
  return Boolean(currentUser?.isAdmin);
}

function applyAdminMode() {
  document.querySelectorAll('.admin-only').forEach((element) => {
    element.hidden = !isAdminUser();
  });

  if (toggleTournamentActionsBtn) toggleTournamentActionsBtn.hidden = !isAdminUser();
  if (openTournamentConfigBtn) openTournamentConfigBtn.hidden = !isAdminUser();
}

function formatEventMode(event = {}) {
  const rawMode = String(event?.mode || '').trim();
  if (rawMode && rawMode.toLowerCase() !== 'rematch') return rawMode;
  return String(event?.structure || rawMode || 'Mata-mata').trim() || 'Mata-mata';
}

function setCurrentMainEvent(eventId) {
  currentEventId = String(eventId || '').trim() || currentEventId;
  currentMainEvent = mainEvent();
  renderPlayerHomeData();
}

function eventStartText(event = {}) {
  return String(event?.startAt || '').trim() || 'Em breve';
}

function renderMainEventSummary(event = mainEvent()) {
  if (!mainEventTitle) return;
  currentMainEvent = event || null;
  const title = event?.title || event?.name || 'Evento';
  const limit = Number(event?.teamLimit || 16);
  const min = Number(event?.minimumTeams || 4);
  mainEventTitle.textContent = `🏟 ${title}`;
  if (mainEventDescription) mainEventDescription.textContent = event?.description || 'Configure a descrição do evento para orientar capitães e jogadores.';
  if (eventModeValue) eventModeValue.textContent = formatEventMode(event);
  if (eventFormatValue) eventFormatValue.textContent = event?.matchFormat || 'MD3';
  if (eventStartValue) eventStartValue.textContent = eventStartText(event);
  if (eventMinimumTeamsMeta) eventMinimumTeamsMeta.textContent = `Mínimo de ${min} time${min === 1 ? '' : 's'} para confirmar o evento.`;
  if (editMainEventBtn) {
    editMainEventBtn.hidden = !isAdminUser();
    editMainEventBtn.dataset.eventId = event?.id || '';
  }
  if (homeJoinEventBtn) homeJoinEventBtn.disabled = !event || event.status === 'closed' || event.status === 'finished';
}

function renderEventsShowcase() {
  if (!eventsShowcaseList) return;
  if (!currentEvents.length) {
    eventsShowcaseList.innerHTML = '<div class="chat-empty-state"><strong>Nenhum evento criado ainda.</strong><p>O administrador poderá criar novos eventos por aqui.</p></div>';
    return;
  }

  eventsShowcaseList.innerHTML = currentEvents.map((event) => {
    const active = (event.id === (mainEvent()?.id || currentEventId));
    const registeredCount = Number(event.registeredCount || event.registeredTeams?.length || 0);
    const limit = Number(event.teamLimit || 16);
    return `
      <button class="event-showcase-card ${active ? 'is-active' : ''}" type="button" data-event-card-id="${escapeHtml(event.id)}">
        <strong>${escapeHtml(event.title || event.name || 'Evento')}</strong>
        <small>${escapeHtml(formatEventMode(event))} • ${escapeHtml(event.matchFormat || 'MD3')}</small>
        <span>${registeredCount}/${limit} inscritos • ${escapeHtml(eventStartText(event))}</span>
      </button>
    `;
  }).join('');
}

function renderScrimDirectory() {
  if (!scrimDirectoryGrid) return;
  const directoryTeams = teams.filter((team) => team.ownerUserId).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (!directoryTeams.length) {
    scrimDirectoryGrid.innerHTML = '<div class="chat-empty-state"><strong>Nenhum responsável encontrado.</strong><p>Os times cadastrados com dono/capitão aparecem aqui automaticamente.</p></div>';
    return;
  }

  const canChatWithSomeone = directoryTeams.some((team) => {
    const owner = usersLookup.find((user) => user.id === team.ownerUserId);
    return owner && owner.id !== currentUser?.id;
  });

  scrimDirectoryGrid.innerHTML = directoryTeams.map((team) => {
    const owner = usersLookup.find((user) => user.id === team.ownerUserId);
    const captain = (team.players || [])[0] || 'Capitão não definido';
    const ownerName = owner ? publicUserName(owner) : captain;
    const isOwnTeam = owner && owner.id === currentUser?.id;
    const note = !owner
      ? 'Responsável ainda sem conta vinculada no site.'
      : isOwnTeam
        ? 'Esse é um dos seus times.'
        : 'Chat direto disponível.';
    return `
      <article class="scrim-directory-card" data-team-id="${escapeHtml(team.id)}">
        <div class="scrim-directory-head">
          <span class="scrim-directory-logo">${teamLogoHtml(team)}</span>
          <div>
            <strong>${escapeHtml(team.name || 'Time')}</strong>
            <small>${escapeHtml(team.tag || 'SEM TAG')} • ${escapeHtml(ownerName)}</small>
          </div>
        </div>
        <div class="scrim-directory-actions">
          ${owner ? `<button class="mini-btn" type="button" data-user-id="${escapeHtml(owner.id)}">Perfil público</button>` : ''}
          ${owner && owner.id !== currentUser?.id ? `<button class="mini-btn primary-mini" type="button" data-open-screen-user="${escapeHtml(owner.id)}">Abrir chat</button>` : `<span class="scrim-directory-note">${escapeHtml(note)}</span>`}
        </div>
      </article>
    `;
  }).join('');

  if (!canChatWithSomeone) {
    scrimDirectoryGrid.insertAdjacentHTML('afterbegin', '<div class="chat-empty-state scrim-help-banner"><strong>Nenhum outro capitão com conta vinculada ainda.</strong><p>Quando outro responsável entrar no site e criar o próprio perfil, o botão de chat direto aparece aqui.</p></div>');
  }
}

function renderTeams() {
  if (teamCounter) teamCounter.textContent = `${teams.length} ${teams.length === 1 ? 'time cadastrado' : 'times cadastrados'}`;

  if (!teams.length) {
    teamsList.innerHTML = `
      <div class="empty-teams">
        <strong>Nenhum time cadastrado ainda.</strong>
        <p>Clique em <b>Cadastrar time</b> para criar a primeira equipe.</p>
      </div>
    `;
    return;
  }

  teamsList.innerHTML = teams.map((team) => {
    const players = (team.players || []).filter(Boolean);
    const reserves = (team.reserves || []).filter(Boolean);
    const logo = team.logo
      ? `<img src="${escapeHtml(team.logo)}" alt="Logo ${escapeHtml(team.name)}" loading="lazy" onerror="this.remove()" />`
      : `<span>${escapeHtml((team.tag || team.name || '?').slice(0, 2).toUpperCase())}</span>`;

    return `
      <article class="team-card" data-team-id="${escapeHtml(team.id)}">
        <div class="team-logo">${logo}</div>
        <div class="team-info">
          <strong>${escapeHtml(team.name)}</strong>
          <span>${escapeHtml(team.tag)} • ${players.length} titular${players.length === 1 ? '' : 'es'}${reserves.length ? ` • ${reserves.length} reserva${reserves.length === 1 ? '' : 's'}` : ''}</span>
          <p>${players.map(escapeHtml).join(', ') || 'Sem titulares.'}</p>
        </div>
        <div class="team-actions">
          ${isAdminUser() ? `
            <button class="mini-btn" type="button" data-action="edit" data-id="${escapeHtml(team.id)}">Editar</button>
            <button class="mini-btn danger" type="button" data-action="delete" data-id="${escapeHtml(team.id)}">Excluir</button>
          ` : '<span class="team-actions-lock">Somente administrador</span>'}
        </div>
      </article>
    `;
  }).join('');
}


function mainEvent() {
  return currentEvents.find((event) => event.id === currentEventId)
    || currentEvents.find((event) => event.id === 'coliseu-void-arena')
    || currentEvents[0]
    || null;
}

function renderEventRegisteredTeams(event = mainEvent()) {
  if (!eventRegisteredTeams) return;
  currentMainEvent = event || null;

  const limit = Number(event?.teamLimit || tournamentSettings.teamLimit || 16);
  const registeredTeams = Array.isArray(event?.registeredTeams) ? event.registeredTeams : [];
  const count = registeredTeams.length;
  const progress = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0;

  if (eventVagasLabel) eventVagasLabel.textContent = `${count}/${limit}`;
  if (eventProgressBar) eventProgressBar.style.width = `${progress}%`;

  if (!registeredTeams.length) {
    eventRegisteredTeams.innerHTML = `
      <div class="chat-empty-state">
        <strong>Nenhum time inscrito ainda.</strong>
        <p>Quando um capitão inscrever um time nesse evento, ele aparece aqui automaticamente.</p>
      </div>
    `;
    return;
  }

  eventRegisteredTeams.innerHTML = registeredTeams.map((team) => `
    <button class="registered-team registered-team-btn" type="button" data-team-id="${escapeHtml(team.id)}">
      <span class="registered-team-media">${teamLogoHtml(team)}</span>
      <strong>${escapeHtml(team.name || 'Time')}</strong>
    </button>
  `).join('');
}

function renderPublicTeamsGrid() {
  if (!publicTeamsGrid) return;

  if (!teams.length) {
    publicTeamsGrid.innerHTML = `
      <div class="chat-empty-state">
        <strong>Nenhum time público ainda.</strong>
        <p>Os times cadastrados no site aparecem aqui automaticamente.</p>
      </div>
    `;
    return;
  }

  publicTeamsGrid.innerHTML = teams.map((team) => {
    const players = (team.players || []).filter(Boolean);
    const reserves = (team.reserves || []).filter(Boolean);
    const captain = players[0] || 'Capitão não definido';
    const isRegistered = Boolean(currentMainEvent?.registeredTeams?.some((registered) => registered.id === team.id));

    return `
      <article class="public-team-directory-card" data-team-id="${escapeHtml(team.id)}">
        <button class="public-team-directory-main" type="button" data-team-id="${escapeHtml(team.id)}">
          <span class="public-team-directory-logo">${teamLogoHtml(team)}</span>
          <span class="public-team-directory-info">
            <strong>${escapeHtml(team.name || 'Time')}</strong>
            <small>${escapeHtml(team.tag || 'SEM TAG')} • Capitão: ${escapeHtml(captain)}</small>
          </span>
        </button>
        <div class="public-team-directory-meta">
          <span>${players.length} titular${players.length === 1 ? '' : 'es'}</span>
          <span>${reserves.length} reserva${reserves.length === 1 ? '' : 's'}</span>
          <span class="${isRegistered ? 'is-registered' : ''}">${isRegistered ? 'Inscrito no Coliseu' : 'Não inscrito'}</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderPlayerHomeData() {
  const event = mainEvent();
  renderMainEventSummary(event);
  renderEventRegisteredTeams(event);
  renderEventsShowcase();
  renderPublicTeamsGrid();
  renderScrimDirectory();
}

async function loadEvents() {
  const data = await apiJson('/api/events');
  currentEvents = data.events || [];
  if (!currentEvents.some((event) => event.id === currentEventId) && currentEvents[0]) currentEventId = currentEvents[0].id;
  currentMainEvent = mainEvent();
  renderPlayerHomeData();
  return currentEvents;
}

function openEventRegisterModal() {
  if (!eventRegisterModal || !eventRegisterChoices) return;
  const myTeams = getUserTeams();
  const event = mainEvent();
  const registeredIds = new Set((event?.registeredTeams || []).map((team) => team.id));

  if (!myTeams.length) {
    eventRegisterChoices.innerHTML = `
      <div class="chat-empty-state">
        <strong>Você ainda não tem time vinculado.</strong>
        <p>Cadastre seu time primeiro. Depois volte aqui para concluir a inscrição no evento selecionado.</p>
      </div>
      <button class="btn primary" type="button" data-event-create-team>Cadastrar meu time</button>
    `;
  } else {
    eventRegisterChoices.innerHTML = myTeams.map((team) => {
      const already = registeredIds.has(team.id);
      return `
        <button class="event-register-choice ${already ? 'already-registered' : ''}" type="button" data-register-team-id="${escapeHtml(team.id)}" ${already ? 'disabled' : ''}>
          <span class="event-register-logo">${teamLogoHtml(team)}</span>
          <span>
            <strong>${escapeHtml(team.name)}</strong>
            <small>${already ? 'Já inscrito nesse evento' : `${escapeHtml(team.tag || 'SEM TAG')} • pronto para inscrição`}</small>
          </span>
        </button>
      `;
    }).join('');
  }

  if (eventRegisterStatus) {
    eventRegisterStatus.textContent = '';
    eventRegisterStatus.className = 'auth-message';
  }
  eventRegisterModal.hidden = false;
}

function closeEventRegisterModal() {
  if (eventRegisterModal) eventRegisterModal.hidden = true;
}

async function registerTeamInMainEvent(teamId) {
  const event = mainEvent();
  if (!event) throw new Error('Nenhum campeonato disponível para inscrição.');

  if (eventRegisterStatus) {
    eventRegisterStatus.textContent = 'Inscrevendo time...';
    eventRegisterStatus.className = 'auth-message';
  }

  const data = await apiJson(`/api/events/${encodeURIComponent(event.id)}/register`, {
    method: 'POST',
    body: JSON.stringify({ teamId })
  });

  const index = currentEvents.findIndex((item) => item.id === data.event?.id);
  if (index >= 0) currentEvents[index] = data.event;
  else if (data.event) currentEvents.push(data.event);
  renderPlayerHomeData();

  if (eventRegisterStatus) {
    eventRegisterStatus.textContent = data.alreadyRegistered ? 'Esse time já estava inscrito.' : 'Time inscrito no evento com sucesso.';
    eventRegisterStatus.className = 'auth-message success';
  }

  setTimeout(closeEventRegisterModal, 550);
}


function openEventEditorModal(eventData = null) {
  if (!eventEditorModal || !eventEditorForm || !isAdminUser()) return;
  const form = eventEditorForm;
  form.reset();
  form.elements.eventId.value = eventData?.id || '';
  form.elements.title.value = eventData?.title || eventData?.name || '';
  form.elements.status.value = eventData?.status || 'open';
  form.elements.mode.value = formatEventMode(eventData) || 'Mata-mata';
  form.elements.matchFormat.value = eventData?.matchFormat || 'MD3';
  form.elements.teamLimit.value = String(eventData?.teamLimit || 16);
  form.elements.minimumTeams.value = String(eventData?.minimumTeams || 4);
  form.elements.startAt.value = eventData?.startAt || '';
  form.elements.structure.value = eventData?.structure || '';
  form.elements.description.value = eventData?.description || '';
  initCustomSelects(form);
  refreshCustomSelects(form);
  if (eventEditorTitle) eventEditorTitle.textContent = eventData ? 'Editar evento' : 'Novo evento';
  if (eventEditorMessage) {
    eventEditorMessage.textContent = '';
    eventEditorMessage.className = 'auth-message';
  }
  eventEditorModal.hidden = false;
}

function closeEventEditorModal() {
  if (eventEditorModal) eventEditorModal.hidden = true;
}

async function saveEventEditor(event) {
  event.preventDefault();
  if (!eventEditorForm) return;
  const form = new FormData(eventEditorForm);
  const eventId = String(form.get('eventId') || '').trim();
  const payload = {
    title: String(form.get('title') || '').trim(),
    status: String(form.get('status') || 'open').trim(),
    mode: String(form.get('mode') || 'Mata-mata').trim(),
    matchFormat: String(form.get('matchFormat') || 'MD3').trim(),
    teamLimit: Number(form.get('teamLimit') || 16),
    minimumTeams: Number(form.get('minimumTeams') || 4),
    startAt: String(form.get('startAt') || '').trim(),
    structure: String(form.get('structure') || '').trim(),
    description: String(form.get('description') || '').trim()
  };

  try {
    if (eventEditorMessage) {
      eventEditorMessage.textContent = 'Salvando evento...';
      eventEditorMessage.className = 'auth-message';
    }
    const url = eventId ? `/api/events/${encodeURIComponent(eventId)}` : '/api/events';
    const method = eventId ? 'PUT' : 'POST';
    const data = await apiJson(url, { method, body: JSON.stringify(payload) });
    const savedEvent = data.event;
    const index = currentEvents.findIndex((item) => item.id === savedEvent.id);
    if (index >= 0) currentEvents[index] = savedEvent;
    else currentEvents.push(savedEvent);
    currentEventId = savedEvent.id;
    renderPlayerHomeData();
    if (eventEditorMessage) {
      eventEditorMessage.textContent = 'Evento salvo com sucesso.';
      eventEditorMessage.className = 'auth-message success';
    }
    setTimeout(closeEventEditorModal, 500);
  } catch (error) {
    if (eventEditorMessage) {
      eventEditorMessage.textContent = error.message;
      eventEditorMessage.className = 'auth-message error';
    }
  }
}

function openRulesModal() {
  if (rulesModal) rulesModal.hidden = false;
}

function closeRulesModal() {
  if (rulesModal) rulesModal.hidden = true;
}

async function openScreenWithUser(userId) {
  const safeUserId = String(userId || '').trim();
  if (!safeUserId || safeUserId === currentUser?.id) return;

  try {
    const data = await apiJson('/api/team-chats', {
      method: 'POST',
      body: JSON.stringify({ participantUserId: safeUserId })
    });
    activeTeamChatId = data.conversation?.id || activeTeamChatId;
    if (userProfileModal) userProfileModal.hidden = true;
    if (teamProfileModal) teamProfileModal.hidden = true;
    openTeamChatModal();
  } catch (error) {
    window.alert(error.message);
  }
}

function teamLinkedAccounts(team) {
  const playerAccounts = team.playerAccounts || {};
  return [
    ...(Array.isArray(playerAccounts.players) ? playerAccounts.players : []),
    ...(Array.isArray(playerAccounts.reserves) ? playerAccounts.reserves : [])
  ].map(normalizeIdentifier).filter(Boolean);
}

function teamRosterNames(team) {
  return [...(team.players || []), ...(team.reserves || [])]
    .map((name) => normalizeIdentifier(name))
    .filter(Boolean);
}

function currentUserIdentifiers() {
  if (!currentUser) return [];

  return [
    currentUser.id,
    currentUser.discordId,
    currentUser.name
  ].map(normalizeIdentifier).filter(Boolean);
}

function teamMatchesLinkedUser(team) {
  const ids = currentUserIdentifiers();
  const linkedAccounts = teamLinkedAccounts(team);
  const roster = teamRosterNames(team);

  return ids.some((id) => linkedAccounts.includes(id)) || ids.some((id) => roster.includes(id));
}

function getUserTeams() {
  if (!currentUser) return [];

  const linkedMatches = teams.filter(teamMatchesLinkedUser);

  // Se algum time tem vínculo direto com o ID/Discord/nome do usuário,
  // esse vínculo manda. Assim o dono/admin que cadastrou todos os times
  // não vê todos em "Meu time".
  if (linkedMatches.length) return linkedMatches;

  const userId = normalizeIdentifier(currentUser.id);
  return teams.filter((team) => normalizeIdentifier(team.ownerUserId) === userId);
}


function safeExternalUrl(url) {
  const value = String(url || '').trim();
  return /^https?:\/\//i.test(value) ? value : '';
}

function normalizeSteamProfileId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const profileMatch = raw.match(/steamcommunity\.com\/profiles\/(\d{16,20})/i);
  if (profileMatch) return profileMatch[1];

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length >= 16 && digitsOnly.length <= 20) return digitsOnly;

  return raw;
}

function steamProfileUrl(steamId = '') {
  const id = normalizeSteamProfileId(steamId);
  return /^\d{16,20}$/.test(id) ? `https://steamcommunity.com/profiles/${id}` : '';
}

function steamConnectionHtml(steamId = '') {
  const id = normalizeSteamProfileId(steamId);
  const url = steamProfileUrl(id);

  if (!url) {
    return `<strong>Não vinculada</strong>`;
  }

  return `<a class="steam-profile-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver perfil Steam ↗</a>`;
}

function normalizeXboxGamertag(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const playUserMatch = raw.match(/xbox\.com\/[a-z-]+\/play\/user\/([^/?#]+)/i);
  if (playUserMatch) {
    try {
      return decodeURIComponent(playUserMatch[1]).trim();
    } catch {
      return playUserMatch[1].trim();
    }
  }

  const legacyMatch = raw.match(/[?&](?:gamertag|gamerTag)=([^&#]+)/i);
  if (legacyMatch) {
    try {
      return decodeURIComponent(legacyMatch[1]).trim();
    } catch {
      return legacyMatch[1].trim();
    }
  }

  return raw.slice(0, 80);
}

function xboxProfileUrl(gamertag = '') {
  const tag = normalizeXboxGamertag(gamertag);
  return tag ? `https://www.xbox.com/pt-BR/play/user/${encodeURIComponent(tag)}` : '';
}

function getUserXboxGamertag(user = {}) {
  const profile = effectiveUserProfile(user);
  const fallback = isSameAsCurrentUser(user) ? (getSavedUserProfileFallback().profile || {}) : {};
  const formXbox = isSameAsCurrentUser(user)
    ? normalizeXboxGamertag(settingsForm?.elements?.xboxGamertag?.value || '')
    : '';

  return normalizeXboxGamertag(
    formXbox ||
    profile.xboxGamertag ||
    fallback.xboxGamertag ||
    user.profile?.xboxGamertag ||
    user.xboxGamertag ||
    user.xbox ||
    user.socials?.xbox ||
    ''
  );
}

function xboxConnectionCardHtml(user = {}) {
  const gamertag = getUserXboxGamertag(user);
  const url = xboxProfileUrl(gamertag);

  if (!url) return '';

  return `
    <a class="profile-connection-card xbox-connection-profile-card discord-style-connection-card xbox-discord-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir perfil Xbox de ${escapeHtml(publicUserName(user))}" title="Abrir perfil Xbox de ${escapeHtml(publicUserName(user))}">
      <span class="profile-connection-icon xbox-connection-icon xbox-logo-badge" aria-hidden="true">
        <img class="platform-official-logo" src="../assets/xbox-official.png" alt="" loading="lazy" decoding="async" />
      </span>
      <span class="profile-connection-info">
        <strong>Xbox</strong>
        <small>Ver perfil Xbox</small>
      </span>
      <span class="profile-connection-arrow">↗</span>
    </a>
  `;
}

function publicConnectionCardsHtml(user = {}) {
  const cards = [
    steamConnectionCardHtml(user),
    xboxConnectionCardHtml(user)
  ].filter(Boolean);

  if (!cards.length) {
    return '<p class="muted-text">Nenhuma conexão vinculada nesse perfil ainda.</p>';
  }

  return cards.join('');
}


function isSameAsCurrentUser(user = {}) {
  if (!currentUser || !user) return false;

  return Boolean(
    (currentUser.id && user.id && currentUser.id === user.id) ||
    (currentUser.discordId && user.discordId && currentUser.discordId === user.discordId) ||
    (currentUser.email && user.email && currentUser.email === user.email) ||
    (currentUser.name && user.name && normalizeIdentifier(currentUser.name) === normalizeIdentifier(user.name))
  );
}

function currentSettingsSteamValue() {
  const value = settingsForm?.elements?.steamId?.value || '';
  return normalizeSteamProfileId(value);
}

function effectiveUserProfile(user = {}) {
  const profile = userProfileData(user);
  const isCurrentUser = isSameAsCurrentUser(user);
  if (!isCurrentUser) return profile;

  const fallback = getSavedUserProfileFallback();
  const fallbackProfile = fallback.profile || {};
  const formSteamId = currentSettingsSteamValue();
  const merged = { ...profile };

  Object.entries(fallbackProfile).forEach(([key, value]) => {
    if (String(value || '').trim() && !String(merged[key] || '').trim()) {
      merged[key] = value;
    }
  });

  if (formSteamId) {
    merged.steamId = formSteamId;
  }

  return merged;
}

function getUserSteamId(user = {}) {
  const profile = effectiveUserProfile(user);
  const fallback = isSameAsCurrentUser(user) ? (getSavedUserProfileFallback().profile || {}) : {};
  const formSteamId = isSameAsCurrentUser(user) ? currentSettingsSteamValue() : '';

  return normalizeSteamProfileId(
    formSteamId ||
    profile.steamId ||
    fallback.steamId ||
    user.profile?.steamId ||
    user.steamId ||
    user.steam ||
    user.socials?.steam ||
    ''
  );
}

function steamConnectionCardHtml(user = {}) {
  const steamId = getUserSteamId(user);
  const url = steamProfileUrl(steamId);

  if (!url) {
    return '';
  }

  return `
    <a class="profile-connection-card steam-connection-profile-card discord-style-connection-card steam-discord-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir perfil Steam de ${escapeHtml(publicUserName(user))}" title="Abrir perfil Steam de ${escapeHtml(publicUserName(user))}">
      <span class="profile-connection-icon steam-connection-icon steam-logo-badge" aria-hidden="true">
        <img class="platform-official-logo" src="../assets/steam-official.png" alt="" loading="lazy" decoding="async" />
      </span>
      <span class="profile-connection-info">
        <strong>Steam</strong>
        <small>Ver perfil Steam</small>
      </span>
      <span class="profile-connection-arrow">↗</span>
    </a>
  `;
}

function userProfileData(user = {}) {
  return user.profile && typeof user.profile === 'object' ? user.profile : {};
}

function publicUserName(user = {}) {
  const profile = userProfileData(user);
  return profile.username || user.name || 'Usuário Abyss';
}

function userGameMeta(user = {}) {
  const profile = userProfileData(user);
  const parts = [profile.region, profile.primaryPosition].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Perfil competitivo em construção';
}

function profileValue(user, key, fallback = 'Não definido') {
  const value = String(userProfileData(user)[key] || '').trim();
  return value || fallback;
}

function normalizeIdentifier(value = '') {
  return String(value || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

function findUserForPlayer(playerName, accountId = '') {
  const wantedAccount = normalizeIdentifier(accountId);
  const wantedName = normalizeIdentifier(playerName);

  if (!wantedAccount && !wantedName) return null;

  return usersLookup.find((user) => {
    const profile = userProfileData(user);
    const byId = normalizeIdentifier(user.id);
    const byDiscord = normalizeIdentifier(user.discordId);
    const byName = normalizeIdentifier(user.name);
    const byPublicName = normalizeIdentifier(profile.username);
    const bySteam = normalizeIdentifier(profile.steamId);

    return (
      (wantedAccount && [byId, byDiscord, byName, byPublicName, bySteam].filter(Boolean).includes(wantedAccount)) ||
      (!wantedAccount && wantedName && [byName, byPublicName].filter(Boolean).includes(wantedName))
    );
  }) || null;
}

function playerAvatarHtml(playerName, accountId = '') {
  const user = findUserForPlayer(playerName, accountId);

  if (user?.avatar) {
    return `<span class="ranking-player-avatar"><img src="${escapeHtml(user.avatar)}" alt="Avatar ${escapeHtml(publicUserName(user) || playerName)}" /></span>`;
  }

  return `<span class="ranking-player-avatar no-avatar">${escapeHtml((playerName || '?').slice(0, 1).toUpperCase())}</span>`;
}

function playerNameRankingHtml(playerName, accountId = '') {
  const user = findUserForPlayer(playerName, accountId);
  const safeName = escapeHtml(playerName);

  if (!user) return `<strong>${safeName}</strong>`;

  return `<button class="ranking-player-profile-btn" type="button" data-user-id="${escapeHtml(user.id)}" title="Abrir perfil de ${escapeHtml(publicUserName(user) || playerName)}">${safeName}</button>`;
}

function getTeamsLinkedToUser(user) {
  return getTeamsWhereUserPlays(user);
}

function getTeamsWhereUserPlays(user) {
  if (!user) return [];
  const identifiers = [user.id, user.discordId, user.name].map(normalizeIdentifier).filter(Boolean);

  return teams.filter((team) => {
    const accounts = teamLinkedAccounts(team);
    const roster = teamRosterNames(team);
    return identifiers.some((id) => accounts.includes(id)) || identifiers.some((id) => roster.includes(id));
  });
}

function getSocialUrl(key, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (key === 'email') return `mailto:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;

  const normalized = raw.replace(/^@/, '').trim();
  if (!normalized) return '';

  const builders = {
    instagram: (name) => `https://instagram.com/${name}`,
    twitter: (name) => `https://x.com/${name}`,
    twitch: (name) => `https://twitch.tv/${name}`,
    tiktok: (name) => `https://tiktok.com/@${name}`,
    youtube: (name) => `https://youtube.com/@${name}`
  };

  return builders[key] ? builders[key](normalized) : '';
}

function socialLinksFromObject(socials = {}, options = {}) {
  const items = options.items || [
    ['site', 'Site'],
    ['email', 'E-mail'],
    ['discord', 'Discord'],
    ['instagram', 'Instagram'],
    ['twitch', 'Twitch'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['twitter', 'Twitter/X']
  ];

  const links = items.map(([key, label]) => {
    const value = String(socials[key] || '').trim();

    if (!value) {
      return options.showEmpty ? `<span class="social-empty">${label}</span>` : '';
    }

    if (key === 'discord' && !/^https?:\/\//i.test(value)) {
      return `<span class="social-pill static-pill" title="${escapeHtml(value)}">${label}: ${escapeHtml(value)}</span>`;
    }

    const url = getSocialUrl(key, value);
    if (!url) return `<span class="social-pill static-pill" title="${escapeHtml(value)}">${label}</span>`;

    return `<a class="social-pill" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }).filter(Boolean);

  if (!links.length) {
    return options.emptyText ? `<p class="muted-text">${escapeHtml(options.emptyText)}</p>` : '';
  }

  return links.join('');
}


function formatChatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function chatAvatarHtml(message = {}) {
  if (message.authorAvatar) {
    return `<span class="chat-avatar"><img src="${escapeHtml(message.authorAvatar)}" alt="Avatar ${escapeHtml(message.authorName || 'Usuário')}" /></span>`;
  }

  return `<span class="chat-avatar no-avatar">${escapeHtml((message.authorName || '?').slice(0, 1).toUpperCase())}</span>`;
}

function mentionLabelById(id = '', type = 'member') {
  const collection = type === 'role' ? discordMentionCache.roles : discordMentionCache.members;
  const item = collection.find((entry) => entry.id === String(id));
  return item?.name || item?.username || id;
}

function formatChatContent(content = '') {
  let html = escapeHtml(content || '');

  html = html.replace(/&lt;@&amp;(\d+)&gt;/g, (_match, id) => (
    `<span class="chat-mention role-mention">@${escapeHtml(mentionLabelById(id, 'role'))}</span>`
  ));

  html = html.replace(/&lt;@!?(\d+)&gt;/g, (_match, id) => (
    `<span class="chat-mention member-mention">@${escapeHtml(mentionLabelById(id, 'member'))}</span>`
  ));

  return html.replace(/\n/g, '<br>');
}

function chatAttachmentUrl(attachment = {}) {
  return String(attachment.url || attachment.proxyUrl || '').trim();
}

function chatAttachmentFallbackUrl(attachment = {}) {
  const primary = String(attachment.url || '').trim();
  const fallback = String(attachment.proxyUrl || '').trim();

  return fallback && fallback !== primary ? fallback : '';
}

function isImageAttachment(attachment = {}) {
  const contentType = String(attachment.contentType || '').toLowerCase();
  const url = chatAttachmentUrl(attachment).toLowerCase();
  const name = String(attachment.name || '').toLowerCase();

  return contentType.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|bmp|avif)(\?|#|$)/i.test(url)
    || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(name);
}

function renderChatAttachment(attachment = {}, index = 0) {
  const url = chatAttachmentUrl(attachment);
  if (!url) return '';

  const fallbackUrl = chatAttachmentFallbackUrl(attachment);
  const name = attachment.name || `Anexo ${index + 1}`;

  if (isImageAttachment(attachment)) {
    return `
      <a class="chat-attachment chat-attachment-image" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name)}">
        <img src="${escapeHtml(url)}" ${fallbackUrl ? `data-fallback-src="${escapeHtml(fallbackUrl)}"` : ''} alt="${escapeHtml(name)}" loading="lazy" />
      </a>
    `;
  }

  return `
    <a class="chat-attachment chat-attachment-file" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(name)}">
      <span>📎</span>
      <strong>${escapeHtml(name)}</strong>
    </a>
  `;
}

function renderChatAttachments(attachments = []) {
  const safeAttachments = Array.isArray(attachments) ? attachments.filter((attachment) => chatAttachmentUrl(attachment)) : [];
  if (!safeAttachments.length) return '';

  return `
    <div class="chat-attachments">
      ${safeAttachments.map(renderChatAttachment).join('')}
    </div>
  `;
}

function renderEmptyDiscordPayloadNotice(message = {}) {
  const hasContent = String(message.content || '').trim().length > 0;
  const hasAttachments = Array.isArray(message.attachments) && message.attachments.some((attachment) => chatAttachmentUrl(attachment));

  if (hasContent || hasAttachments || message.source !== 'discord') return '';

  return `
    <div class="chat-message-notice">
      ⚠️ Mensagem recebida do Discord sem texto/anexo no payload.
      Ative <strong>Message Content Intent</strong> no Developer Portal e confira se o bot tem permissão de ver mensagens/anexos nesse canal.
    </div>
  `;
}

function hydrateChatAttachmentFallbacks(target) {
  if (!target) return;

  target.querySelectorAll('img[data-fallback-src]').forEach((img) => {
    if (img.dataset.fallbackBound === 'true') return;
    img.dataset.fallbackBound = 'true';

    img.addEventListener('error', () => {
      const fallback = img.getAttribute('data-fallback-src');
      if (!fallback || img.src === fallback) return;
      img.src = fallback;
      img.removeAttribute('data-fallback-src');
    }, { once: true });
  });
}

function canEditChatMessage(message = {}) {
  return Boolean(
    currentUser?.id &&
    message.source === 'site' &&
    message.authorId === currentUser.id
  );
}

function chatEditButtonHtml(message = {}) {
  if (!canEditChatMessage(message)) return '';
  return `<button class="chat-message-edit-btn" type="button" data-chat-edit-id="${escapeHtml(message.id)}">Editar</button>`;
}

function renderChatMessages(target, messages = [], emptyText = 'Nenhuma mensagem ainda.') {
  if (!target) return;

  if (!messages.length) {
    target.innerHTML = `<div class="chat-empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }

  target.innerHTML = messages.map((message) => `
    <article class="chat-message ${message.source === 'discord' ? 'from-discord' : 'from-site'}" data-message-id="${escapeHtml(message.id)}" data-channel-id="${escapeHtml(message.channelId || '')}">
      ${chatAvatarHtml(message)}
      <div class="chat-message-body">
        <div class="chat-message-meta">
          <strong>${escapeHtml(message.authorName || 'Usuário')}</strong>
          <span>${message.source === 'discord' ? 'Discord' : 'Site'} • ${escapeHtml(formatChatTime(message.createdAt))}${message.editedAt ? ' • editada' : ''}</span>
        </div>
        <div class="chat-message-text">${formatChatContent(message.content || '')}</div>
        ${renderChatAttachments(message.attachments)}
        ${renderEmptyDiscordPayloadNotice(message)}
        <div class="chat-message-actions">${chatEditButtonHtml(message)}</div>
      </div>
    </article>
  `).join('');

  hydrateChatAttachmentFallbacks(target);
  target.scrollTop = target.scrollHeight;
}

async function editChatMessage(scope, messageId, currentContent = '') {
  const nextContent = window.prompt('Editar mensagem:', currentContent || '');
  if (nextContent === null) return;

  const content = String(nextContent || '').trim();
  if (!content) return;

  try {
    if (scope === 'team') {
      if (!activeTeamChatId) return;
      await apiJson(`/api/team-chats/${encodeURIComponent(activeTeamChatId)}/messages/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ content })
      });
      await loadTeamChatMessages();
      await loadTeamChats();
      return;
    }

    if (scope === 'stats') {
      await apiJson(`/api/stats/messages/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ channelId: statsBridgeSettings.siteChannelId || 'stats-main', content })
      });
      await loadStatsChatMessages();
      return;
    }

    await apiJson(`/api/chat/messages/${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ channelId: chatBridgeSettings.siteChannelId || 'site-main', content })
    });
    await loadSiteChatMessages();
  } catch (error) {
    const targetStatus = scope === 'team' ? teamChatStatus : (scope === 'stats' ? statsChatStatus : siteChatStatus);
    if (targetStatus) {
      targetStatus.textContent = error.message;
      targetStatus.className = 'auth-message error';
    }
  }
}

function openHowToModal() {
  if (howToModal) howToModal.hidden = false;
}

function closeHowToModal() {
  if (howToModal) howToModal.hidden = true;
}

function openTermsModal() {
  if (termsModal) termsModal.hidden = false;
}

function closeTermsModal() {
  if (termsModal) termsModal.hidden = true;
}

function readMusicSettings() {
  try {
    return JSON.parse(window.localStorage.getItem(MUSIC_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMusicSettings() {
  const settings = {
    track: musicTrackSelect?.value || 'arena-01',
    volume: Number(musicVolumeRange?.value || 42)
  };
  window.localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

function ensureBackgroundMusic() {
  if (!backgroundMusic) {
    backgroundMusic = new Audio();
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'none';
  }
  return backgroundMusic;
}

function selectedMusicTrack() {
  const key = musicTrackSelect?.value || 'arena-01';
  return MUSIC_TRACKS[key] || MUSIC_TRACKS['arena-01'];
}

function applyMusicSettings() {
  const settings = readMusicSettings();
  if (musicTrackSelect) musicTrackSelect.value = settings.track && MUSIC_TRACKS[settings.track] ? settings.track : 'arena-01';
  if (musicVolumeRange) musicVolumeRange.value = Number.isFinite(Number(settings.volume)) ? String(settings.volume) : '42';
  refreshCustomSelects(musicSettingsPanel || document);
}

async function startBackgroundMusic() {
  const audio = ensureBackgroundMusic();
  const track = selectedMusicTrack();
  const volume = Math.max(0, Math.min(100, Number(musicVolumeRange?.value || 42))) / 100;

  audio.volume = volume;
  if (!audio.src || !audio.src.endsWith(track.src)) {
    audio.src = track.src;
  }

  saveMusicSettings();

  try {
    await audio.play();
    if (musicStatus) musicStatus.textContent = `Tocando: ${track.label}`;
  } catch {
    if (musicStatus) musicStatus.textContent = 'Não foi possível iniciar. Confira se o arquivo MP3 existe em assets/audio/ e clique novamente.';
  }
}

function stopBackgroundMusic() {
  const audio = ensureBackgroundMusic();
  audio.pause();
  if (musicStatus) musicStatus.textContent = 'Música pausada.';
}

function openMusicSettingsPanel() {
  if (!musicSettingsPanel) return;
  musicSettingsPanel.hidden = false;
  requestAnimationFrame(() => musicSettingsPanel.classList.add('is-open'));
  initCustomSelects(musicSettingsPanel);
  applyMusicSettings();
}

function closeMusicSettingsPanel() {
  if (!musicSettingsPanel) return;
  musicSettingsPanel.classList.remove('is-open');
  setTimeout(() => {
    if (!musicSettingsPanel.classList.contains('is-open')) musicSettingsPanel.hidden = true;
  }, 180);
}


async function loadDiscordMentions() {
  try {
    const data = await apiJson('/api/discord/mentions');
    discordMentionCache = {
      members: Array.isArray(data.members) ? data.members : [],
      roles: Array.isArray(data.roles) ? data.roles : []
    };
  } catch {
    discordMentionCache = discordMentionCache || { members: [], roles: [] };
  }
}

function mentionItems() {
  return [
    ...discordMentionCache.members.map((member) => ({
      type: 'member',
      id: member.id,
      label: member.name || member.username || 'Membro',
      sub: member.guildName || 'Discord',
      mention: member.mention || `<@${member.id}>`
    })),
    ...discordMentionCache.roles.map((role) => ({
      type: 'role',
      id: role.id,
      label: role.name || 'Cargo',
      sub: role.guildName || 'Cargo do servidor',
      mention: role.mention || `<@&${role.id}>`
    }))
  ];
}

function mentionPanelFor(form) {
  if (!form) return null;
  let panel = form.querySelector('.mention-suggestions-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'mention-suggestions-panel';
    panel.hidden = true;
    form.appendChild(panel);
  }
  return panel;
}

function hideMentionPanels() {
  document.querySelectorAll('.mention-suggestions-panel').forEach((panel) => {
    panel.hidden = true;
    panel.innerHTML = '';
  });
}

function currentMentionQuery(input) {
  const value = input?.value || '';
  const cursor = input?.selectionStart ?? value.length;
  const before = value.slice(0, cursor);
  const match = before.match(/(^|\s)@([\wÀ-ÿ.-]{0,32})$/);
  if (!match) return null;

  return {
    query: match[2].toLowerCase(),
    start: before.length - match[2].length - 1,
    end: cursor
  };
}

function renderMentionSuggestions(input) {
  const form = input?.closest?.('form');
  const panel = mentionPanelFor(form);
  if (!panel) return;

  const current = currentMentionQuery(input);
  if (!current) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  const items = mentionItems()
    .filter((item) => item.label.toLowerCase().includes(current.query))
    .slice(0, 10);

  if (!items.length) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = items.map((item) => `
    <button class="mention-suggestion" type="button" data-mention="${escapeHtml(item.mention)}">
      <span>${item.type === 'role' ? '@&' : '@'}</span>
      <strong>${escapeHtml(item.label)}</strong>
      <small>${escapeHtml(item.sub)}</small>
    </button>
  `).join('');

  panel.hidden = false;
}

function insertMention(input, mention) {
  if (!input || !mention) return;
  const value = input.value || '';
  const cursor = input.selectionStart ?? value.length;
  const current = currentMentionQuery(input);
  const start = current ? current.start : cursor;
  const end = current ? current.end : cursor;
  const before = value.slice(0, start);
  const after = value.slice(end);
  input.value = `${before}${mention} ${after}`.slice(0, Number(input.maxLength || 2000));
  input.focus();
  const nextCursor = before.length + mention.length + 1;
  input.setSelectionRange(nextCursor, nextCursor);
  hideMentionPanels();
}

function setupMentionInput(form) {
  const input = form?.elements?.content;
  if (!input || input.dataset.mentionReady === 'true') return;
  input.dataset.mentionReady = 'true';

  input.addEventListener('input', () => {
    autoGrowChatInput(input);
    renderMentionSuggestions(input);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideMentionPanels();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
}

function autoGrowChatInput(input) {
  if (!input || input.tagName !== 'TEXTAREA') return;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 138)}px`;
}


function siteChatMessageTime(message = {}) {
  const time = new Date(message.createdAt || message.updatedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function siteChatMessageMarker(message = {}) {
  return {
    id: String(message.id || ''),
    time: siteChatMessageTime(message)
  };
}

function readStoredChatMarker(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { id: '', time: 0 };
    const data = JSON.parse(raw);
    return {
      id: String(data.id || ''),
      time: Number(data.time || 0)
    };
  } catch {
    return { id: '', time: 0 };
  }
}

function saveStoredChatMarker(key, marker = {}) {
  window.localStorage.setItem(key, JSON.stringify({
    id: String(marker.id || ''),
    time: Number(marker.time || 0)
  }));
}

function isAfterChatMarker(message = {}, marker = {}) {
  const time = siteChatMessageTime(message);
  if (time > Number(marker.time || 0)) return true;
  return Boolean(time && time === Number(marker.time || 0) && String(message.id || '') !== String(marker.id || ''));
}

function isOwnSiteChatMessage(message = {}) {
  return Boolean(
    currentUser?.id &&
    message.source === 'site' &&
    String(message.authorId || '') === String(currentUser.id)
  );
}

function latestSiteChatMessage(messages = []) {
  return [...messages].sort((a, b) => siteChatMessageTime(a) - siteChatMessageTime(b)).at(-1) || null;
}

function setSiteChatUnread(count = 0) {
  siteChatUnreadCount = Math.max(0, Number(count || 0));

  if (siteChatNotificationBadge) {
    siteChatNotificationBadge.hidden = siteChatUnreadCount <= 0;
    siteChatNotificationBadge.textContent = siteChatUnreadCount > 99 ? '99+' : String(siteChatUnreadCount);
  }

  openSiteChatBtn?.classList.toggle('has-chat-alert', siteChatUnreadCount > 0);
}

function markSiteChatMessagesAsSeen(messages = []) {
  const latest = latestSiteChatMessage(messages);
  if (!latest) return;

  const marker = siteChatMessageMarker(latest);
  saveStoredChatMarker(SITE_CHAT_SEEN_STORAGE_KEY, marker);
  saveStoredChatMarker(SITE_CHAT_NOTIFIED_STORAGE_KEY, marker);
  setSiteChatUnread(0);
}

function compactChatPreview(content = '', attachments = []) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 96 ? `${text.slice(0, 96)}...` : text;

  const safeAttachments = Array.isArray(attachments) ? attachments.filter((attachment) => chatAttachmentUrl(attachment)) : [];
  if (safeAttachments.length === 1) {
    return isImageAttachment(safeAttachments[0]) ? 'Enviou uma imagem.' : `Enviou um anexo: ${safeAttachments[0].name || 'arquivo'}.`;
  }

  if (safeAttachments.length > 1) {
    return `Enviou ${safeAttachments.length} anexos.`;
  }

  return 'Enviou uma mensagem.';
}

function showSiteChatNotification(message = {}, amount = 1) {
  if (!siteNotificationStack) return;

  const toast = document.createElement('button');
  toast.type = 'button';
  toast.className = 'site-notification-toast';
  toast.innerHTML = `
    <span class="site-notification-icon">💬</span>
    <span class="site-notification-copy">
      <strong>${amount > 1 ? `${amount} novas mensagens` : 'Nova mensagem no chat'}</strong>
      <small>${escapeHtml(message.authorName || 'Usuário')} ${message.source === 'discord' ? 'no Discord' : 'no site'}: ${escapeHtml(compactChatPreview(message.content || '', message.attachments))}</small>
    </span>
  `;

  toast.addEventListener('click', () => {
    openSiteChatModal();
    toast.remove();
  });

  siteNotificationStack.appendChild(toast);
  window.setTimeout(() => toast.classList.add('is-visible'), 20);
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 6200);
}

async function pollSiteChatNotifications() {
  if (!currentUser) return;

  try {
    const channelId = chatBridgeSettings.siteChannelId || 'site-main';
    const data = await apiJson(`/api/chat/messages?channelId=${encodeURIComponent(channelId)}&limit=30`);
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const latest = latestSiteChatMessage(messages);

    if (!latest) {
      setSiteChatUnread(0);
      return;
    }

    if (!siteChatModal?.hidden) {
      markSiteChatMessagesAsSeen(messages);
      return;
    }

    const seenMarker = readStoredChatMarker(SITE_CHAT_SEEN_STORAGE_KEY);
    if (!seenMarker.time && !seenMarker.id) {
      const marker = siteChatMessageMarker(latest);
      saveStoredChatMarker(SITE_CHAT_SEEN_STORAGE_KEY, marker);
      saveStoredChatMarker(SITE_CHAT_NOTIFIED_STORAGE_KEY, marker);
      siteChatNotifyBootstrapped = true;
      return;
    }

    const unreadMessages = messages.filter((message) => isAfterChatMarker(message, seenMarker));
    const visibleUnreadMessages = unreadMessages.filter((message) => !isOwnSiteChatMessage(message));
    setSiteChatUnread(visibleUnreadMessages.length);

    const notifiedMarker = readStoredChatMarker(SITE_CHAT_NOTIFIED_STORAGE_KEY);
    const newNotificationMessages = visibleUnreadMessages.filter((message) => isAfterChatMarker(message, notifiedMarker));

    if (siteChatNotifyBootstrapped && newNotificationMessages.length) {
      const newest = latestSiteChatMessage(newNotificationMessages);
      showSiteChatNotification(newest, newNotificationMessages.length);
      saveStoredChatMarker(SITE_CHAT_NOTIFIED_STORAGE_KEY, siteChatMessageMarker(newest));
    }

    siteChatNotifyBootstrapped = true;
  } catch (error) {
    // Notificação não deve travar o painel caso a API oscile.
  }
}

function startSiteChatNotifications() {
  if (siteChatNotificationTimer) clearInterval(siteChatNotificationTimer);

  loadChatBridgeSettings()
    .catch(() => {})
    .finally(() => pollSiteChatNotifications());

  siteChatNotificationTimer = setInterval(pollSiteChatNotifications, 3500);
}


async function loadSiteChatMessages() {
  if (!siteChatMessages || siteChatModal?.hidden) return [];

  try {
    const channelId = chatBridgeSettings.siteChannelId || 'site-main';
    const data = await apiJson(`/api/chat/messages?channelId=${encodeURIComponent(channelId)}&limit=80`);
    const messages = data.messages || [];
    renderChatMessages(siteChatMessages, messages, 'Nenhuma mensagem no chat do torneio ainda.');
    markSiteChatMessagesAsSeen(messages);
    if (siteChatStatus) siteChatStatus.textContent = '';
    return messages;
  } catch (error) {
    if (siteChatStatus) {
      siteChatStatus.textContent = error.message;
      siteChatStatus.className = 'auth-message error';
    }
    return [];
  }
}

function openSiteChatModal() {
  if (!siteChatModal) return;
  siteChatModal.hidden = false;
  setSiteChatUnread(0);
  setupMentionInput(siteChatForm);
  loadDiscordMentions();
  loadChatBridgeSettings().finally(loadSiteChatMessages);
  clearInterval(siteChatTimer);
  siteChatTimer = setInterval(loadSiteChatMessages, 3000);
}

function closeSiteChatModal() {
  if (siteChatModal) siteChatModal.hidden = true;
  clearInterval(siteChatTimer);
  siteChatTimer = null;
}

function discordChannelTypeLabel(channel = {}) {
  const type = String(channel.kind || channel.typeName || '').toLowerCase();
  if (type.includes('category')) return 'Categoria';
  if (type.includes('voice') || type.includes('stage')) return 'Voz';
  if (type.includes('forum')) return 'Fórum';
  if (type.includes('announcement')) return 'Anúncios';
  return 'Texto';
}

function updateBridgeMeta() {
  if (!siteChatBridgeMeta) return;
  const channel = discordChannelsCache.find((item) => item.id === chatBridgeSettings.discordChannelId);
  if (chatBridgeSettings.enabled && channel) {
    siteChatBridgeMeta.textContent = `Canal Discord: ${channel.displayName || channel.name}`;
    return;
  }
  if (chatBridgeSettings.discordChannelId) {
    siteChatBridgeMeta.textContent = `Canal Discord: ${chatBridgeSettings.discordChannelId}`;
    return;
  }
  siteChatBridgeMeta.textContent = 'Canal Discord: não vinculado';
}

function renderBridgeChannelSelect() {
  if (!bridgeChannelSelect) return;

  const grouped = discordChannelsCache.reduce((acc, channel) => {
    const guild = channel.guildName || 'Servidor';
    if (!acc[guild]) acc[guild] = [];
    acc[guild].push(channel);
    return acc;
  }, {});

  const options = ['<option value="">Selecionar canal de texto</option>'];

  Object.entries(grouped).forEach(([guildName, channels]) => {
    options.push(`<option value="" disabled>── ${escapeHtml(guildName)} ──</option>`);
    channels.forEach((channel) => {
      const label = `${channel.canBridge ? '#' : '•'} ${channel.displayName || channel.name} — ${discordChannelTypeLabel(channel)}`;
      const disabled = channel.canBridge ? '' : ' disabled';
      const selected = channel.id === chatBridgeSettings.discordChannelId ? ' selected' : '';
      options.push(`<option value="${escapeHtml(channel.id)}"${disabled}${selected}>${escapeHtml(label)}</option>`);
    });
  });

  bridgeChannelSelect.innerHTML = options.join('');
  if (chatBridgeSettings.discordChannelId) bridgeChannelSelect.value = chatBridgeSettings.discordChannelId;
  rebuildCustomSelect(bridgeChannelSelect);
  updateBridgeMeta();
}

async function loadChatBridgeSettings() {
  try {
    const data = await apiJson('/api/chat/bridge/settings');
    chatBridgeSettings = data.settings || chatBridgeSettings;
    if (bridgeChannelSelect && chatBridgeSettings.discordChannelId) {
      bridgeChannelSelect.value = chatBridgeSettings.discordChannelId;
    }
    updateBridgeMeta();
  } catch (error) {
    if (siteChatSettingsStatus) {
      siteChatSettingsStatus.textContent = error.message;
      siteChatSettingsStatus.className = 'auth-message error';
    }
  }
}

async function loadDiscordChannels() {
  if (!bridgeChannelSelect) return;
  bridgeChannelSelect.innerHTML = '<option value="">Carregando canais...</option>';
  rebuildCustomSelect(bridgeChannelSelect);

  try {
    const data = await apiJson('/api/discord/channels');
    discordChannelsCache = data.channels || [];
    renderBridgeChannelSelect();
    if (siteChatSettingsStatus) {
      siteChatSettingsStatus.textContent = discordChannelsCache.length ? 'Canais carregados do servidor.' : 'Nenhum canal encontrado. Verifique se o bot está online no servidor.';
      siteChatSettingsStatus.className = discordChannelsCache.length ? 'auth-message success' : 'auth-message';
    }
  } catch (error) {
    if (siteChatSettingsStatus) {
      siteChatSettingsStatus.textContent = error.message;
      siteChatSettingsStatus.className = 'auth-message error';
    }
  }
}

async function saveBridgeSettings() {
  const discordChannelId = String(bridgeChannelSelect?.value || '').trim();

  try {
    if (siteChatSettingsStatus) {
      siteChatSettingsStatus.textContent = 'Salvando ponte...';
      siteChatSettingsStatus.className = 'auth-message';
    }

    const data = await apiJson('/api/chat/bridge/settings', {
      method: 'PUT',
      body: JSON.stringify({
        enabled: Boolean(discordChannelId),
        siteChannelId: 'site-main',
        discordChannelId
      })
    });

    chatBridgeSettings = data.settings || chatBridgeSettings;
    updateBridgeMeta();
    await loadSiteChatMessages();
    if (siteChatSettingsStatus) {
      siteChatSettingsStatus.textContent = discordChannelId ? `Ponte vinculada com sucesso. Histórico importado: ${Number(data.history?.imported || 0)} mensagem(ns).` : 'Ponte desativada.';
      siteChatSettingsStatus.className = 'auth-message success';
    }
  } catch (error) {
    if (siteChatSettingsStatus) {
      siteChatSettingsStatus.textContent = error.message;
      siteChatSettingsStatus.className = 'auth-message error';
    }
  }
}

function toggleSiteChatSettings() {
  if (!siteChatSettingsPanel) return;
  siteChatSettingsPanel.hidden = !siteChatSettingsPanel.hidden;
  if (!siteChatSettingsPanel.hidden) {
    loadChatBridgeSettings().then(loadDiscordChannels);
  }
}

async function sendSiteChatMessage(event) {
  event.preventDefault();
  const input = siteChatForm?.elements?.content;
  const content = String(input?.value || '').trim();
  if (!content) return;

  try {
    if (siteChatStatus) {
      siteChatStatus.textContent = 'Enviando...';
      siteChatStatus.className = 'auth-message';
    }

    await apiJson('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ channelId: chatBridgeSettings.siteChannelId || 'site-main', content })
    });

    input.value = '';
    autoGrowChatInput(input);
    await loadSiteChatMessages();
    if (siteChatStatus) siteChatStatus.textContent = '';
  } catch (error) {
    if (siteChatStatus) {
      siteChatStatus.textContent = error.message;
      siteChatStatus.className = 'auth-message error';
    }
  }
}


function latestStatsChatMessage(messages = []) {
  return latestSiteChatMessage(messages);
}

function setStatsChatUnread(count = 0) {
  statsChatUnreadCount = Math.max(0, Number(count || 0));

  if (statsNotificationBadge) {
    statsNotificationBadge.hidden = statsChatUnreadCount <= 0;
    statsNotificationBadge.textContent = statsChatUnreadCount > 99 ? '99+' : String(statsChatUnreadCount);
  }

  openStatsBtn?.classList.toggle('has-chat-alert', statsChatUnreadCount > 0);
}

function markStatsChatMessagesAsSeen(messages = []) {
  const latest = latestStatsChatMessage(messages);
  if (!latest) return;

  const marker = siteChatMessageMarker(latest);
  saveStoredChatMarker(STATS_CHAT_SEEN_STORAGE_KEY, marker);
  saveStoredChatMarker(STATS_CHAT_NOTIFIED_STORAGE_KEY, marker);
  setStatsChatUnread(0);
}

function showStatsChatNotification(message = {}, amount = 1) {
  if (!siteNotificationStack) return;

  const toast = document.createElement('button');
  toast.type = 'button';
  toast.className = 'site-notification-toast';
  toast.innerHTML = `
    <span class="site-notification-icon">📊</span>
    <span class="site-notification-copy">
      <strong>${amount > 1 ? `${amount} novas mensagens` : 'Nova mensagem em Estatísticas'}</strong>
      <small>${escapeHtml(message.authorName || 'Usuário')} ${message.source === 'discord' ? 'no Discord' : 'no site'}: ${escapeHtml(compactChatPreview(message.content || '', message.attachments))}</small>
    </span>
  `;

  toast.addEventListener('click', () => {
    openStatsChatModal();
    toast.remove();
  });

  siteNotificationStack.appendChild(toast);
  window.setTimeout(() => toast.classList.add('is-visible'), 20);
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 6200);
}

async function pollStatsChatNotifications() {
  if (!currentUser) return;

  try {
    const channelId = statsBridgeSettings.siteChannelId || 'stats-main';
    const data = await apiJson(`/api/stats/messages?channelId=${encodeURIComponent(channelId)}&limit=30`);
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const latest = latestStatsChatMessage(messages);

    if (!latest) {
      setStatsChatUnread(0);
      return;
    }

    if (!statsChatModal?.hidden) {
      markStatsChatMessagesAsSeen(messages);
      return;
    }

    const seenMarker = readStoredChatMarker(STATS_CHAT_SEEN_STORAGE_KEY);
    if (!seenMarker.time && !seenMarker.id) {
      const marker = siteChatMessageMarker(latest);
      saveStoredChatMarker(STATS_CHAT_SEEN_STORAGE_KEY, marker);
      saveStoredChatMarker(STATS_CHAT_NOTIFIED_STORAGE_KEY, marker);
      statsChatNotifyBootstrapped = true;
      return;
    }

    const unreadMessages = messages.filter((message) => isAfterChatMarker(message, seenMarker));
    const visibleUnreadMessages = unreadMessages.filter((message) => !isOwnSiteChatMessage(message));
    setStatsChatUnread(visibleUnreadMessages.length);

    const notifiedMarker = readStoredChatMarker(STATS_CHAT_NOTIFIED_STORAGE_KEY);
    const newNotificationMessages = visibleUnreadMessages.filter((message) => isAfterChatMarker(message, notifiedMarker));

    if (statsChatNotifyBootstrapped && newNotificationMessages.length) {
      const newest = latestStatsChatMessage(newNotificationMessages);
      showStatsChatNotification(newest, newNotificationMessages.length);
      saveStoredChatMarker(STATS_CHAT_NOTIFIED_STORAGE_KEY, siteChatMessageMarker(newest));
    }

    statsChatNotifyBootstrapped = true;
  } catch {
    // Notificação de estatísticas não deve travar o painel caso a API oscile.
  }
}

function startStatsChatNotifications() {
  if (statsChatNotificationTimer) clearInterval(statsChatNotificationTimer);

  loadStatsBridgeSettings()
    .catch(() => {})
    .finally(() => pollStatsChatNotifications());

  statsChatNotificationTimer = setInterval(pollStatsChatNotifications, 3500);
}

async function loadStatsChatMessages() {
  if (!statsChatMessages || statsChatModal?.hidden) return [];

  try {
    const channelId = statsBridgeSettings.siteChannelId || 'stats-main';
    const data = await apiJson(`/api/stats/messages?channelId=${encodeURIComponent(channelId)}&limit=80`);
    const messages = data.messages || [];
    renderChatMessages(statsChatMessages, messages, 'Nenhuma mensagem em Estatísticas ainda.');
    markStatsChatMessagesAsSeen(messages);
    if (statsChatStatus) statsChatStatus.textContent = '';
    return messages;
  } catch (error) {
    if (statsChatStatus) {
      statsChatStatus.textContent = error.message;
      statsChatStatus.className = 'auth-message error';
    }
    return [];
  }
}

function openStatsChatModal() {
  if (!statsChatModal) return;
  statsChatModal.hidden = false;
  setStatsChatUnread(0);
  setupMentionInput(statsChatForm);
  loadDiscordMentions();
  loadStatsBridgeSettings().finally(loadStatsChatMessages);
  clearInterval(statsChatTimer);
  statsChatTimer = setInterval(loadStatsChatMessages, 3000);
}

function closeStatsChatModal() {
  if (statsChatModal) statsChatModal.hidden = true;
  clearInterval(statsChatTimer);
  statsChatTimer = null;
}

function updateStatsBridgeMeta() {
  if (!statsChatBridgeMeta) return;
  const channel = discordChannelsCache.find((item) => item.id === statsBridgeSettings.discordChannelId);
  if (statsBridgeSettings.enabled && channel) {
    statsChatBridgeMeta.textContent = `Canal Discord: ${channel.displayName || channel.name}`;
    return;
  }
  if (statsBridgeSettings.discordChannelId) {
    statsChatBridgeMeta.textContent = `Canal Discord: ${statsBridgeSettings.discordChannelId}`;
    return;
  }
  statsChatBridgeMeta.textContent = 'Canal Discord: não vinculado';
}

function renderStatsBridgeChannelSelect() {
  if (!statsBridgeChannelSelect) return;

  const grouped = discordChannelsCache.reduce((acc, channel) => {
    const guild = channel.guildName || 'Servidor';
    if (!acc[guild]) acc[guild] = [];
    acc[guild].push(channel);
    return acc;
  }, {});

  const options = ['<option value="">Selecionar canal de texto</option>'];

  Object.entries(grouped).forEach(([guildName, channels]) => {
    options.push(`<option value="" disabled>── ${escapeHtml(guildName)} ──</option>`);
    channels.forEach((channel) => {
      const label = `${channel.canBridge ? '#' : '•'} ${channel.displayName || channel.name} — ${discordChannelTypeLabel(channel)}`;
      const disabled = channel.canBridge ? '' : ' disabled';
      const selected = channel.id === statsBridgeSettings.discordChannelId ? ' selected' : '';
      options.push(`<option value="${escapeHtml(channel.id)}"${disabled}${selected}>${escapeHtml(label)}</option>`);
    });
  });

  statsBridgeChannelSelect.innerHTML = options.join('');
  if (statsBridgeSettings.discordChannelId) statsBridgeChannelSelect.value = statsBridgeSettings.discordChannelId;
  rebuildCustomSelect(statsBridgeChannelSelect);
  updateStatsBridgeMeta();
}

async function loadStatsBridgeSettings() {
  try {
    const data = await apiJson('/api/stats/bridge/settings');
    statsBridgeSettings = data.settings || statsBridgeSettings;
    if (statsBridgeChannelSelect && statsBridgeSettings.discordChannelId) {
      statsBridgeChannelSelect.value = statsBridgeSettings.discordChannelId;
    }
    updateStatsBridgeMeta();
  } catch (error) {
    if (statsChatSettingsStatus) {
      statsChatSettingsStatus.textContent = error.message;
      statsChatSettingsStatus.className = 'auth-message error';
    }
  }
}

async function loadStatsDiscordChannels() {
  if (!statsBridgeChannelSelect) return;
  statsBridgeChannelSelect.innerHTML = '<option value="">Carregando canais...</option>';
  rebuildCustomSelect(statsBridgeChannelSelect);

  try {
    const data = await apiJson('/api/discord/channels');
    discordChannelsCache = data.channels || [];
    renderStatsBridgeChannelSelect();
    if (statsChatSettingsStatus) {
      statsChatSettingsStatus.textContent = discordChannelsCache.length ? 'Canais carregados do servidor.' : 'Nenhum canal encontrado. Verifique se o bot está online no servidor.';
      statsChatSettingsStatus.className = discordChannelsCache.length ? 'auth-message success' : 'auth-message';
    }
  } catch (error) {
    if (statsChatSettingsStatus) {
      statsChatSettingsStatus.textContent = error.message;
      statsChatSettingsStatus.className = 'auth-message error';
    }
  }
}

async function saveStatsBridgeSettings() {
  const discordChannelId = String(statsBridgeChannelSelect?.value || '').trim();

  try {
    if (statsChatSettingsStatus) {
      statsChatSettingsStatus.textContent = 'Salvando ponte...';
      statsChatSettingsStatus.className = 'auth-message';
    }

    const data = await apiJson('/api/stats/bridge/settings', {
      method: 'PUT',
      body: JSON.stringify({
        enabled: Boolean(discordChannelId),
        siteChannelId: 'stats-main',
        discordChannelId
      })
    });

    statsBridgeSettings = data.settings || statsBridgeSettings;
    updateStatsBridgeMeta();
    await loadStatsChatMessages();
    if (statsChatSettingsStatus) {
      statsChatSettingsStatus.textContent = discordChannelId ? `Ponte vinculada com sucesso. Histórico importado: ${Number(data.history?.imported || 0)} mensagem(ns).` : 'Ponte desativada.';
      statsChatSettingsStatus.className = 'auth-message success';
    }
  } catch (error) {
    if (statsChatSettingsStatus) {
      statsChatSettingsStatus.textContent = error.message;
      statsChatSettingsStatus.className = 'auth-message error';
    }
  }
}

function toggleStatsChatSettings() {
  if (!statsChatSettingsPanel) return;
  statsChatSettingsPanel.hidden = !statsChatSettingsPanel.hidden;
  if (!statsChatSettingsPanel.hidden) {
    loadStatsBridgeSettings().then(loadStatsDiscordChannels);
  }
}

async function sendStatsChatMessage(event) {
  event.preventDefault();
  const input = statsChatForm?.elements?.content;
  const content = String(input?.value || '').trim();
  if (!content) return;

  try {
    if (statsChatStatus) {
      statsChatStatus.textContent = 'Enviando...';
      statsChatStatus.className = 'auth-message';
    }

    await apiJson('/api/stats/messages', {
      method: 'POST',
      body: JSON.stringify({ channelId: statsBridgeSettings.siteChannelId || 'stats-main', content })
    });

    input.value = '';
    autoGrowChatInput(input);
    await loadStatsChatMessages();
    if (statsChatStatus) statsChatStatus.textContent = '';
  } catch (error) {
    if (statsChatStatus) {
      statsChatStatus.textContent = error.message;
      statsChatStatus.className = 'auth-message error';
    }
  }
}

function fillTeamChatSelects() {
  renderScrimDirectory();
}

function renderTeamChatList() {
  if (!teamChatList) return;

  if (!teamChatConversations.length) {
    teamChatList.innerHTML = '<div class="chat-empty-state"><strong>Nenhuma conversa aberta ainda.</strong><p>Abra um chat pelo catálogo de scrim acima para ele aparecer aqui.</p></div>';
    return;
  }

  teamChatList.innerHTML = teamChatConversations.map((conversation) => `
    <button class="team-chat-item ${conversation.id === activeTeamChatId ? 'is-active' : ''}" type="button" data-team-chat-id="${escapeHtml(conversation.id)}">
      <strong>${escapeHtml(conversation.title || 'Chat direto')}</strong>
      <small>${conversation.lastMessageAt ? `Última mensagem ${escapeHtml(formatChatTime(conversation.lastMessageAt))}` : 'Conversa criada'}</small>
    </button>
  `).join('');
}

function setActiveTeamChat(conversationId) {
  activeTeamChatId = conversationId || '';
  const conversation = teamChatConversations.find((item) => item.id === activeTeamChatId);
  if (activeTeamChatTitle) activeTeamChatTitle.textContent = conversation?.title || 'Selecione uma conversa';

  if (teamChatForm) {
    const disabled = !conversation;
    teamChatForm.elements.content.disabled = disabled;
    teamChatForm.querySelector('button[type="submit"]').disabled = disabled;
    teamChatForm.querySelector('[data-mention-button]')?.toggleAttribute('disabled', disabled);
  }

  renderTeamChatList();
  if (conversation) loadTeamChatMessages();
  else renderChatMessages(teamChatMessages, [], 'Abra ou selecione uma conversa.');
}

async function loadTeamChats() {
  if (!teamChatModal || teamChatModal.hidden) return;

  try {
    const data = await apiJson('/api/team-chats');
    teamChatConversations = data.conversations || [];

    if (!activeTeamChatId && teamChatConversations[0]) {
      activeTeamChatId = teamChatConversations[0].id;
    }

    if (activeTeamChatId && !teamChatConversations.some((item) => item.id === activeTeamChatId)) {
      activeTeamChatId = teamChatConversations[0]?.id || '';
    }

    renderTeamChatList();
    setActiveTeamChat(activeTeamChatId);
    if (teamChatStatus) teamChatStatus.textContent = '';
  } catch (error) {
    if (teamChatStatus) {
      teamChatStatus.textContent = error.message;
      teamChatStatus.className = 'auth-message error';
    }
  }
}

async function loadTeamChatMessages() {
  if (!activeTeamChatId || !teamChatMessages || teamChatModal?.hidden) return;

  try {
    const data = await apiJson(`/api/team-chats/${encodeURIComponent(activeTeamChatId)}/messages?limit=80`);
    renderChatMessages(teamChatMessages, data.messages || [], 'Nenhuma mensagem nessa conversa ainda.');
  } catch (error) {
    renderChatMessages(teamChatMessages, [], error.message);
  }
}

function openTeamChatModal() {
  if (!teamChatModal) return;
  fillTeamChatSelects();
  renderScrimDirectory();
  activeTeamChatId = activeTeamChatId || '';
  teamChatModal.hidden = false;
  setupMentionInput(teamChatForm);
  loadDiscordMentions();
  loadTeamChats();
  clearInterval(teamChatTimer);
  teamChatTimer = setInterval(() => {
    loadTeamChats();
    loadTeamChatMessages();
  }, 3500);
}

function closeTeamChatModal() {
  if (teamChatModal) teamChatModal.hidden = true;
  clearInterval(teamChatTimer);
  teamChatTimer = null;
}

async function createTeamChat(event) {
  event.preventDefault();
  const participantUserId = teamChatCreateForm?.elements?.participantUserId?.value || '';
  if (!participantUserId) return;

  try {
    if (teamChatStatus) {
      teamChatStatus.textContent = 'Abrindo chat...';
      teamChatStatus.className = 'auth-message';
    }

    const data = await apiJson('/api/team-chats', {
      method: 'POST',
      body: JSON.stringify({ participantUserId })
    });

    activeTeamChatId = data.conversation?.id || activeTeamChatId;
    await loadTeamChats();
    if (teamChatStatus) {
      teamChatStatus.textContent = 'Chat pronto.';
      teamChatStatus.className = 'auth-message success';
    }
  } catch (error) {
    if (teamChatStatus) {
      teamChatStatus.textContent = error.message;
      teamChatStatus.className = 'auth-message error';
    }
  }
}

async function sendTeamChatMessage(event) {
  event.preventDefault();
  if (!activeTeamChatId) return;

  const input = teamChatForm?.elements?.content;
  const content = String(input?.value || '').trim();
  if (!content) return;

  try {
    await apiJson(`/api/team-chats/${encodeURIComponent(activeTeamChatId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    input.value = '';
    autoGrowChatInput(input);
    await loadTeamChatMessages();
    await loadTeamChats();
  } catch (error) {
    if (teamChatStatus) {
      teamChatStatus.textContent = error.message;
      teamChatStatus.className = 'auth-message error';
    }
  }
}

function openUserProfile(userId) {
  if (!userProfileModal || !userProfileContent) return;

  const user = usersLookup.find((item) => item.id === userId);
  if (!user) return;

  const profile = effectiveUserProfile(user);
  const linkedTeams = getTeamsWhereUserPlays(user);
  const displayName = publicUserName(user);
  const avatar = user.avatar
    ? `<img src="${escapeHtml(user.avatar)}" alt="Avatar ${escapeHtml(displayName)}" />`
    : `<span>${escapeHtml((displayName || '?').slice(0, 1).toUpperCase())}</span>`;
  const socialHtml = socialLinksFromObject(user.socials || {}, {
    emptyText: 'Nenhuma rede social adicionada nesse perfil ainda.'
  });
  const bio = String(profile.bio || '').trim();
  const createdText = user.createdAt ? `Membro há ${formatDaysActive(user.createdAt)}` : 'Membro do torneio';
  const positionText = [profile.primaryPosition, profile.secondaryPosition].filter(Boolean).join(' / ') || 'Posição não definida';

  if (userProfileTitle) userProfileTitle.textContent = displayName;

  userProfileContent.innerHTML = `
    <section class="profile-hero-card public-profile-hero">
      <div class="profile-hero-banner"${profileBannerStyleAttr(profile.banner)}></div>
      <div class="profile-hero-main">
        <div class="public-user-avatar large-avatar">${avatar}</div>
        <div class="profile-hero-info">
          <strong>${escapeHtml(displayName)}</strong>
          <p>${escapeHtml(createdText)}${profile.country ? ` • ${escapeHtml(profile.country)}` : ''}</p>
          ${user.id !== currentUser?.id ? `<button class="mini-btn" type="button" data-open-screen-user="${escapeHtml(user.id)}">Abrir chat</button>` : ''}
        </div>
      </div>
    </section>

    <section class="public-user-section profile-summary-section">
      <h3>Sobre</h3>
      <p>${bio ? escapeHtml(bio) : 'Esse jogador ainda não adicionou uma bio pública.'}</p>
    </section>

    <section class="public-user-section">
      <h3>Informações de jogo</h3>
      <div class="profile-info-grid game-info-grid-only">
        <div><span>Região</span><strong>${escapeHtml(profile.region || 'Não definida')}</strong></div>
        <div><span>Posição</span><strong>${escapeHtml(positionText)}</strong></div>
        <div><span>Times</span><strong>${linkedTeams.length}</strong></div>
      </div>
    </section>

    <section class="public-user-section public-connections-section">
      <h3>Conexões</h3>
      <div class="profile-connections-list">${publicConnectionCardsHtml(user)}</div>
    </section>

    <section class="public-user-section">
      <h3>Redes sociais</h3>
      <div class="public-social-links enhanced-social-links">${socialHtml}</div>
    </section>

    <section class="public-user-section">
      <h3>Times vinculados</h3>
      ${linkedTeams.length ? `
        <div class="public-linked-teams">
          ${linkedTeams.map((team) => `
            <button class="public-linked-team clickable-linked-team" type="button" data-profile-team-id="${escapeHtml(team.id)}">
              <span class="ranking-team-logo">${teamLogoHtml(team)}</span>
              <div>
                <strong>${escapeHtml(team.name)}</strong>
                <small>${escapeHtml(team.tag || 'SEM TAG')}</small>
              </div>
            </button>
          `).join('')}
        </div>
      ` : '<p class="muted-text">Nenhum time vinculado a essa conta ainda.</p>'}
    </section>

    <section class="public-user-section">
      <h3>Estatísticas do perfil</h3>
      <div class="team-stats-grid profile-stats-grid">
        <div><span>Times</span><strong>${linkedTeams.length}</strong></div>
        <div><span>Partidas</span><strong>0</strong></div>
        <div><span>Vitórias</span><strong>0</strong></div>
        <div><span>Pontos</span><strong>0</strong></div>
      </div>
    </section>
  `;

  userProfileModal.hidden = false;
  userProfileModal.classList.add('is-front-modal');
}
function closeUserProfile() {
  if (userProfileModal) {
    userProfileModal.hidden = true;
    userProfileModal.classList.remove('is-front-modal');
  }
}

function teamRosterProfileHtml(team) {
  const players = Array.isArray(team.players) ? team.players : [];
  const reserves = Array.isArray(team.reserves) ? team.reserves : [];
  const playerAccounts = team.playerAccounts || {};
  const playerAccountIds = Array.isArray(playerAccounts.players) ? playerAccounts.players : [];
  const reserveAccountIds = Array.isArray(playerAccounts.reserves) ? playerAccounts.reserves : [];

  const renderMember = (name, accountId, label) => {
    const user = findUserForPlayer(name, accountId);
    const avatar = user?.avatar
      ? `<span class="ranking-player-avatar"><img src="${escapeHtml(user.avatar)}" alt="Avatar ${escapeHtml(user.name || name)}" /></span>`
      : `<span class="ranking-player-avatar no-avatar">${escapeHtml((name || '?').slice(0, 1).toUpperCase())}</span>`;
    const title = user
      ? `<button class="ranking-player-profile-btn" type="button" data-user-id="${escapeHtml(user.id)}">${escapeHtml(name)}</button>`
      : `<strong>${escapeHtml(name)}</strong>`;

    return `
      <article class="team-roster-member">
        ${avatar}
        <div>
          ${title}
          <small>${escapeHtml(label)}${user ? ' • Conta vinculada' : ''}</small>
        </div>
      </article>
    `;
  };

  const members = [
    ...players.map((name, index) => renderMember(name, playerAccountIds[index] || '', `Titular ${index + 1}`)),
    ...reserves.map((name, index) => renderMember(name, reserveAccountIds[index] || '', `Reserva ${index + 1}`))
  ];

  return members.join('') || '<p class="muted-text">Nenhum jogador cadastrado nesse time.</p>';
}

function openTeamProfile(teamId) {
  if (!teamProfileModal || !teamProfileContent) return;

  const team = teams.find((item) => item.id === teamId);
  if (!team) return;

  const players = (team.players || []).filter(Boolean);
  const reserves = (team.reserves || []).filter(Boolean);
  const matches = Number(team.matchesPlayed || 0);
  const wins = Number(team.wins || 0);
  const points = Number(team.points || wins * 3);
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const socialHtml = socialLinksFromObject(team.socials || {}, {
    showEmpty: true,
    emptyText: 'Nenhuma rede ou contato cadastrado para esse time.'
  });

  teamProfileContent.innerHTML = `
    <section class="public-user-card public-team-card">
      <div class="public-user-avatar public-team-avatar">${teamLogoHtml(team)}</div>
      <div class="public-user-info">
        <strong>${escapeHtml(team.name || 'Time')}</strong>
        <p>${escapeHtml(team.tag || 'SEM TAG')} • ${players.length} titular${players.length === 1 ? '' : 'es'}${reserves.length ? ` • ${reserves.length} reserva${reserves.length === 1 ? '' : 's'}` : ''}</p>
      </div>
    </section>

    <section class="public-user-section">
      <h3>Estatísticas do time</h3>
      <div class="team-stats-grid">
        <div><span>Membros</span><strong>${players.length + reserves.length}</strong></div>
        <div><span>Partidas</span><strong>${matches}</strong></div>
        <div><span>Vitórias</span><strong>${wins}</strong></div>
        <div><span>Pontos</span><strong>${points}</strong></div>
        <div><span>Taxa</span><strong>${winRate}%</strong></div>
      </div>
    </section>

    <section class="public-user-section">
      <h3>Elenco</h3>
      <div class="team-roster-profile-list">${teamRosterProfileHtml(team)}</div>
    </section>

    <section class="public-user-section">
      <h3>Redes e contato</h3>
      <div class="public-social-links">${socialHtml}</div>
    </section>
  `;

  teamProfileModal.hidden = false;
}

function closeTeamProfile() {
  if (teamProfileModal) teamProfileModal.hidden = true;
}

function socialLinksHtml(team) {
  return socialLinksFromObject(team.socials || {}, { showEmpty: true });
}

function userSocialStorageKey() {
  return currentUser?.id ? `abyss:user-socials:${currentUser.id}` : 'abyss:user-socials:guest';
}

function getSavedUserSocialsFallback() {
  const raw = window.localStorage.getItem(userSocialStorageKey());
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function profileStorageKey() {
  return currentUser?.id ? `abyss:user-profile:${currentUser.id}` : 'abyss:user-profile:guest';
}

function getSavedUserProfileFallback() {
  const raw = window.localStorage.getItem(profileStorageKey());
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeProfileBanner(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^data:image\//i.test(text)) return text;
  if (/^https?:\/\//i.test(text)) return text;
  return '';
}

function cssUrlValue(value = '') {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function profileBannerStyleAttr(value = '') {
  const safe = safeProfileBanner(value);
  if (!safe) return '';
  return ` style="background-image: linear-gradient(135deg, rgba(5, 8, 20, .18), rgba(8, 7, 20, .28)), url(&quot;${escapeHtml(cssUrlValue(safe))}&quot;);"`;
}

function setProfileBannerPreview(value = '', source = '') {
  const safe = safeProfileBanner(value);
  currentProfileBannerData = safe;
  currentProfileBannerSource = source || (safe ? 'custom' : '');

  if (profileBannerUrlInput && document.activeElement !== profileBannerUrlInput) {
    profileBannerUrlInput.value = safe && !safe.startsWith('data:image/') ? safe : '';
  }

  if (!settingsBannerPreview) return;

  if (!safe) {
    settingsBannerPreview.style.backgroundImage = '';
    settingsBannerPreview.classList.remove('has-image');
    return;
  }

  settingsBannerPreview.style.backgroundImage = `linear-gradient(135deg, rgba(5, 8, 20, .18), rgba(8, 7, 20, .28)), url("${cssUrlValue(safe)}")`;
  settingsBannerPreview.classList.add('has-image');
}

function refreshDiscordBannerButton(profile = {}) {
  if (!useDiscordBannerBtn) return;
  const discordBanner = safeProfileBanner(profile.discordBanner || '');
  useDiscordBannerBtn.hidden = !discordBanner;
  useDiscordBannerBtn.title = discordBanner ? 'Aplicar o banner atual do Discord no perfil.' : '';
}

async function handleProfileBannerFile(file) {
  if (!file) return;

  const dataUrl = await fileToDataUrl(file);
  if (profileBannerFileName) profileBannerFileName.textContent = file.name || 'Imagem selecionada';
  setProfileBannerPreview(dataUrl, 'custom');

  if (settingsMessage) {
    settingsMessage.textContent = 'Banner carregado. Clique em Salvar alterações para aplicar.';
    settingsMessage.className = 'auth-message success';
  }
}

function setFormValue(name, value = '') {
  if (settingsForm?.elements[name]) settingsForm.elements[name].value = value || '';
}

function collectProfileFormData() {
  const formData = Object.fromEntries(new FormData(settingsForm).entries());
  return {
    profile: {
      username: String(formData.username || '').trim(),
      realName: String(formData.realName || '').trim(),
      country: String(formData.country || '').trim(),
      timezone: String(formData.timezone || '').trim(),
      bio: String(formData.bio || '').trim(),
      steamId: normalizeSteamProfileId(formData.steamId || ''),
      xboxGamertag: normalizeXboxGamertag(formData.xboxGamertag || ''),
      region: String(formData.region || '').trim(),
      primaryPosition: String(formData.primaryPosition || '').trim(),
      secondaryPosition: String(formData.secondaryPosition || '').trim(),
      banner: safeProfileBanner(currentProfileBannerData || formData.banner || ''),
      discordBanner: safeProfileBanner(userProfileData(currentUser || {}).discordBanner || ''),
      bannerSource: currentProfileBannerSource || 'custom'
    },
    socials: {
      instagram: String(formData.instagram || '').trim(),
      twitter: String(formData.twitter || '').trim(),
      tiktok: String(formData.tiktok || '').trim(),
      twitch: String(formData.twitch || '').trim(),
      youtube: String(formData.youtube || '').trim(),
      discord: String(formData.discord || '').trim(),
      site: String(formData.site || '').trim()
    }
  };
}

function refreshSettingsPreview(data = {}) {
  const profile = data.profile || userProfileData(currentUser || {});
  const displayName = profile.username || currentUser?.name || 'Usuário Abyss';

  if (settingsName) settingsName.textContent = displayName;
  if (settingsMeta) {
    const parts = [profile.country, profile.primaryPosition].filter(Boolean);
    settingsMeta.textContent = parts.length ? parts.join(' • ') : 'Perfil competitivo do torneio';
  }
  if (settingsPreviewSteam) settingsPreviewSteam.textContent = profile.steamId ? `Steam ID / Perfil Steam: ${normalizeSteamProfileId(profile.steamId)}` : '';
  if (settingsPreviewRegion) settingsPreviewRegion.textContent = profile.region || 'Região não definida';
  refreshDiscordBannerButton(profile);
  const source = profile.bannerSource || (profile.discordBanner && profile.banner === profile.discordBanner ? 'discord' : 'custom');
  setProfileBannerPreview(profile.banner || profile.discordBanner || '', source);
}


function closeAllCustomSelects(except = null) {
  document.querySelectorAll('.custom-select.is-open').forEach((selectEl) => {
    if (except && selectEl === except) return;
    selectEl.classList.remove('is-open');
  });
}

function syncCustomSelect(select) {
  const wrapper = select.closest('.custom-select');
  if (!wrapper) return;

  const trigger = wrapper.querySelector('.custom-select-trigger');
  const valueEl = wrapper.querySelector('.custom-select-value');
  const optionEls = wrapper.querySelectorAll('.custom-select-option');
  const selectedOption = select.options[select.selectedIndex] || select.options[0];
  const label = selectedOption ? selectedOption.textContent.trim() : 'Selecionar';

  if (valueEl) valueEl.textContent = label;
  if (trigger) trigger.setAttribute('aria-expanded', wrapper.classList.contains('is-open') ? 'true' : 'false');

  optionEls.forEach((optionEl) => {
    const isSelected = optionEl.dataset.value === String(select.value);
    optionEl.classList.toggle('is-selected', isSelected);
    optionEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
}

function buildCustomSelect(select) {
  if (!select || select.dataset.customSelectReady === 'true') return;
  select.dataset.customSelectReady = 'true';
  select.classList.add('custom-select-native');

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  trigger.innerHTML = '<span class="custom-select-value"></span><span class="custom-select-arrow" aria-hidden="true">⌄</span>';

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');

  Array.from(select.options).forEach((option, index) => {
    const optionBtn = document.createElement('button');
    optionBtn.type = 'button';
    optionBtn.className = 'custom-select-option';
    optionBtn.setAttribute('role', 'option');
    optionBtn.dataset.value = option.value;
    optionBtn.dataset.index = String(index);
    optionBtn.textContent = option.textContent.trim();
    if (option.disabled) {
      optionBtn.disabled = true;
      optionBtn.classList.add('is-disabled');
      optionBtn.setAttribute('aria-disabled', 'true');
    }
    optionBtn.addEventListener('click', () => {
      if (option.disabled) return;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      wrapper.classList.remove('is-open');
      syncCustomSelect(select);
    });
    menu.appendChild(optionBtn);
  });

  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  trigger.addEventListener('click', () => {
    const willOpen = !wrapper.classList.contains('is-open');
    closeAllCustomSelects(wrapper);
    wrapper.classList.toggle('is-open', willOpen);
    syncCustomSelect(select);
  });

  trigger.addEventListener('keydown', (event) => {
    const options = Array.from(select.options);
    const currentIndex = Math.max(0, select.selectedIndex);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = event.key === 'ArrowDown'
        ? Math.min(options.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      select.selectedIndex = nextIndex;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncCustomSelect(select);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      trigger.click();
      return;
    }

    if (event.key === 'Escape') {
      wrapper.classList.remove('is-open');
      syncCustomSelect(select);
    }
  });

  select.addEventListener('change', () => syncCustomSelect(select));
  syncCustomSelect(select);
}

function rebuildCustomSelect(select) {
  if (!select) return;
  const wrapper = select.closest('.custom-select');
  if (wrapper) {
    wrapper.parentNode.insertBefore(select, wrapper);
    wrapper.remove();
  }
  select.dataset.customSelectReady = 'false';
  select.classList.remove('custom-select-native');
  buildCustomSelect(select);
}

function customSelectTargets(root = document) {
  return root.querySelectorAll('.settings-form select, select[data-custom-select], .team-chat-create-form select, .site-chat-settings-select, .music-settings-select');
}

function initCustomSelects(root = document) {
  customSelectTargets(root).forEach((select) => buildCustomSelect(select));
}

function refreshCustomSelects(root = document) {
  customSelectTargets(root).forEach((select) => syncCustomSelect(select));
}

function fillUserSocialSettings(data = {}) {
  const fallback = getSavedUserProfileFallback();
  const profile = { ...(fallback.profile || {}), ...(currentUser?.profile || {}), ...(data.profile || {}) };
  const socials = { ...(fallback.socials || {}), ...(currentUser?.socials || {}), ...(data.socials || {}) };

  ['username', 'realName', 'country', 'timezone', 'bio', 'steamId', 'xboxGamertag', 'region', 'primaryPosition', 'secondaryPosition', 'banner'].forEach((key) => {
    setFormValue(key, profile[key] || '');
  });

  ['instagram', 'twitter', 'twitch', 'tiktok', 'youtube', 'discord', 'site'].forEach((key) => {
    setFormValue(key, socials[key] || '');
  });

  refreshSettingsPreview({ profile, socials });
  refreshCustomSelects(settingsForm || document);
}

function loadUserSocialSettings() {
  if (!settingsForm) return;
  fillUserSocialSettings({ profile: currentUser?.profile || {}, socials: currentUser?.socials || {} });
}

async function saveUserSocialSettings(event) {
  event.preventDefault();

  const data = collectProfileFormData();
  window.localStorage.setItem(profileStorageKey(), JSON.stringify(data));
  settingsMessage.textContent = 'Salvando perfil...';
  settingsMessage.className = 'auth-message';

  try {
    const response = await apiJson('/api/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    currentUser = response.user || currentUser;
    if (currentUser?.id) {
      const index = usersLookup.findIndex((item) => item.id === currentUser.id);
      if (index >= 0) usersLookup[index] = currentUser;
      else usersLookup.push(currentUser);
    }
    fillUserSocialSettings({ profile: currentUser.profile || data.profile, socials: currentUser.socials || data.socials });
    userChipName.textContent = publicUserName(currentUser);
    userDropdownName.textContent = publicUserName(currentUser);
    settingsMessage.textContent = 'Perfil atualizado com sucesso.';
    settingsMessage.className = 'auth-message success';

    try {
      await loadUsersLookup();
    } catch {}
  } catch (error) {
    settingsMessage.textContent = 'Salvo neste navegador. Não foi possível sincronizar agora.';
    settingsMessage.className = 'auth-message error';
  }
}
function renderMyMatches() {
  if (!myMatchesContent) return;

  const myTeams = getUserTeams();

  if (!myTeams.length) {
    myMatchesContent.innerHTML = `
      <div class="empty-teams large-empty">
        <strong>Nenhum histórico disponível.</strong>
        <p>Quando você estiver em um time e ele jogar partidas de campeonato, o histórico aparecerá aqui.</p>
      </div>
    `;
    return;
  }

  myMatchesContent.innerHTML = myTeams.map((team) => {
    const matches = Array.isArray(team.matches) ? team.matches : [];

    return `
      <article class="my-team-card">
        <div class="my-team-main">
          <div class="my-team-logo">${teamLogoHtml(team)}</div>
          <div class="my-team-title">
            <span class="mini-badge">${escapeHtml(team.tag || 'TIME')}</span>
            <h3>${escapeHtml(team.name)}</h3>
            <p>Histórico de partidas em campeonatos.</p>
          </div>
        </div>

        ${
          matches.length
            ? `<div class="match-history-list">${matches.map((match) => `
                <div class="match-history-item">
                  <strong>${escapeHtml(match.opponent || 'Adversário')}</strong>
                  <span>${escapeHtml(match.result || 'Resultado pendente')}</span>
                </div>
              `).join('')}</div>`
            : `<p class="muted-text match-empty">Ainda não existem partidas registradas para este time.</p>`
        }
      </article>
    `;
  }).join('');
}

function openMyMatchesModal() {
  renderMyMatches();
  myMatchesModal.hidden = false;
  userDropdown.hidden = true;
  userChip.setAttribute('aria-expanded', 'false');
}

function closeMyMatchesModal() {
  myMatchesModal.hidden = true;
}

function openSettingsModal() {
  loadUserSocialSettings();
  settingsMessage.textContent = '';
  settingsMessage.className = 'auth-message';
  settingsModal.hidden = false;
  userDropdown.hidden = true;
  userChip.setAttribute('aria-expanded', 'false');
}

function closeSettingsModal() {
  settingsModal.hidden = true;
}

function renderMyTeams() {
  if (!myTeamsContent) return;

  const myTeams = getUserTeams();

  if (!myTeams.length) {
    myTeamsContent.innerHTML = `
      <div class="empty-teams large-empty">
        <strong>Você ainda não tem times cadastrados.</strong>
        <p>Crie seu primeiro time pelo botão <b>Cadastrar time</b>.</p>
      </div>
    `;
    return;
  }

  myTeamsContent.innerHTML = myTeams.map((team) => {
    const players = (team.players || []).filter(Boolean);
    const reserves = (team.reserves || []).filter(Boolean);
    const roster = [...players, ...reserves];
    const captain = players[0] || 'Capitão não definido';
    const tournaments = team.tournamentsPlayed || 0;
    const matches = team.matchesPlayed || 0;
    const wins = team.wins || 0;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
    const canManage = true;

    return `
      <article class="my-team-card" data-team-id="${escapeHtml(team.id)}">
        <div class="my-team-main">
          <div class="my-team-logo">${teamLogoHtml(team)}</div>
          <div class="my-team-title">
            <span class="mini-badge">${escapeHtml(team.tag || 'TIME')}</span>
            <h3>${escapeHtml(team.name)}</h3>
            <p>Capitão: <b>${escapeHtml(captain)}</b> • Ativo há ${formatDaysActive(team.createdAt)}</p>
          </div>
        </div>

        <div class="team-stats-grid">
          <div><span>Membros</span><strong>${roster.length}</strong></div>
          <div><span>Campeonatos</span><strong>${tournaments}</strong></div>
          <div><span>Partidas</span><strong>${matches}</strong></div>
          <div><span>Vitória</span><strong>${winRate}%</strong></div>
        </div>

        <section class="team-profile-section">
          <h4>Elenco</h4>
          <div class="roster-list">
            ${players.map((player, index) => `<span>Titular ${index + 1}: ${escapeHtml(player)}</span>`).join('') || '<span>Nenhum titular cadastrado.</span>'}
            ${reserves.map((reserve, index) => `<span>Reserva ${index + 1}: ${escapeHtml(reserve)}</span>`).join('')}
          </div>
        </section>

        <section class="team-profile-section">
          <h4>Últimas partidas</h4>
          <p class="muted-text">Nenhuma partida registrada ainda.</p>
        </section>

        <section class="team-profile-section">
          <h4>Redes e contato</h4>
          <div class="social-link-grid">
            ${socialLinksHtml(team)}
            <button class="share-team-btn" type="button" data-my-team-action="share" data-id="${escapeHtml(team.id)}">Compartilhar time</button>
          </div>
        </section>

        <div class="my-team-actions">
          <button class="mini-btn" type="button" data-my-team-action="manage" data-id="${escapeHtml(team.id)}" ${canManage ? '' : 'disabled'}>Gerenciar time</button>
          <button class="mini-btn danger" type="button" data-my-team-action="leave" data-id="${escapeHtml(team.id)}">Sair do time</button>
        </div>
      </article>
    `;
  }).join('');
}

function openMyTeamsModal() {
  renderMyTeams();
  myTeamsModal.hidden = false;
  userDropdown.hidden = true;
  userChip.setAttribute('aria-expanded', 'false');
}

function closeMyTeamsModal() {
  myTeamsModal.hidden = true;
}


function showPlayerHomeScreen() {
  if (playerHomeScreen) playerHomeScreen.hidden = false;
  if (bracketScreen) bracketScreen.hidden = true;
  openBracketScreenBtn?.classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showBracketScreen() {
  if (playerHomeScreen) playerHomeScreen.hidden = true;
  if (bracketScreen) bracketScreen.hidden = false;
  openBracketScreenBtn?.classList.add('active');
  setTimeout(() => renderBracket(), 60);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function proxyClick(target) {
  if (target && typeof target.click === 'function') target.click();
}


const MATCH_FORMAT_MAX_GAMES = {
  MD1: 1,
  MD2: 2,
  MD3: 3,
  MD5: 5
};

function getMatchMaxGames() {
  return MATCH_FORMAT_MAX_GAMES[tournamentSettings.matchFormat] || 1;
}

function clampMatchProgress(value) {
  const max = getMatchMaxGames();
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(max, Math.max(1, Math.floor(number)));
}

function getProgressArray(roundName) {
  const progress = currentBracketData.matchProgress || {};
  const fallbackSize = { slots: 16, quarters: 8, semis: 4, finals: 2 }[roundName] || 0;
  if (!Array.isArray(progress[roundName])) {
    progress[roundName] = Array(fallbackSize).fill(1);
  }
  return progress[roundName];
}

function getSeriesProgress(roundName, index) {
  const values = getProgressArray(roundName);
  return clampMatchProgress(values[index] || 1);
}

function seriesBadgeHtml(roundName, index) {
  const current = getSeriesProgress(roundName, index);
  const max = getMatchMaxGames();
  const intensity = max === 1 ? 'series-progress-one' : current >= max ? 'series-progress-three' : current > 1 ? 'series-progress-two' : 'series-progress-one';
  return `<span class="series-badge ${intensity}" aria-label="Partida atual ${current}/${max}">${current}/${max}</span>`;
}

function teamSlotHtml(team, fallback, roundName = 'slots', index = 0) {
  if (!team) return `<span class="empty-slot">${fallback}</span>`;

  const logo = team.logo
    ? `<img src="${escapeHtml(team.logo)}" alt="" loading="lazy" onerror="this.remove()" />`
    : `<b>${escapeHtml((team.tag || team.name || '?').slice(0, 2).toUpperCase())}</b>`;

  return `${logo}<span class="slot-name">${escapeHtml(team.name)}</span>${seriesBadgeHtml(roundName, index)}`;
}

function renderRound(selector, data, fallbackPrefix) {
  document.querySelectorAll(selector).forEach((slot) => {
    const index = Number(slot.dataset.index ?? slot.dataset.slot);
    const team = data[index];
    const roundName = slot.dataset.round || 'slots';
    slot.innerHTML = teamSlotHtml(team, `${fallbackPrefix} ${String(index + 1).padStart(2, '0')}`, roundName, index);
    slot.classList.toggle('is-empty', !team);
    slot.title = team ? `Clique para avançar ${team.name}` : '';
  });
}


function updateTournamentChoiceCards() {
  if (!tournamentConfigForm) return;

  tournamentConfigForm.querySelectorAll('.choice-card').forEach((card) => {
    const input = card.querySelector('input[type="radio"]');
    card.classList.toggle('is-selected', Boolean(input?.checked));
  });
}


function normalizeTournamentTeamLimit(value) {
  const number = Number(value || 16);
  return [4, 8, 16, 32].includes(number) ? number : 16;
}

function normalizeTournamentGroupCount(value, teamLimit = 16) {
  const number = Number(value || 4);
  const max = Math.max(2, Math.min(8, Math.floor(normalizeTournamentTeamLimit(teamLimit) / 2)));
  if ([2, 4, 8].includes(number) && number <= max) return number;
  return Math.min(4, max);
}

function buildTournamentGroupsPreview() {
  if (!groupsPreview) return;

  const teamLimit = normalizeTournamentTeamLimit(teamLimitSelect?.value || tournamentSettings.teamLimit);
  const groupCount = normalizeTournamentGroupCount(groupCountSelect?.value || tournamentSettings.groupCount, teamLimit);
  const selectedTeams = teams.slice(0, teamLimit);
  const groups = Array.from({ length: groupCount }, (_item, index) => ({
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    teams: []
  }));

  selectedTeams.forEach((team, index) => {
    groups[index % groupCount].teams.push(team);
  });

  groupsPreview.innerHTML = groups.map((group) => `
    <div class="group-preview-card">
      <strong>${escapeHtml(group.name)}</strong>
      <span>${group.teams.length} time(s)</span>
      <ul>
        ${group.teams.length
          ? group.teams.map((team) => `<li>${escapeHtml(team.name)}</li>`).join('')
          : '<li class="muted-group-item">Aguardando times</li>'}
      </ul>
    </div>
  `).join('');
}

async function fillMatchCategorySelect() {
  if (!matchCategorySelect) return;

  const current = tournamentSettings.discordMatchCategoryId || matchCategorySelect.value || '';

  try {
    const data = await apiJson('/api/discord/channels');
    const categories = (data.channels || [])
      .filter((channel) => channel.kind === 'category' || channel.typeName === 'Categoria' || channel.type === 'category');

    matchCategorySelect.innerHTML = '<option value="">Usar servidor/categoria padrão</option>' + categories.map((channel) => (
      `<option value="${escapeHtml(channel.id)}">${escapeHtml(channel.name || 'Categoria')}</option>`
    )).join('');

    matchCategorySelect.value = current;
  } catch {
    matchCategorySelect.innerHTML = '<option value="">Usar servidor/categoria padrão</option>';
  }
}

function describeMatchChannelResult(matchChannels = {}) {
  const results = Array.isArray(matchChannels.results) ? matchChannels.results : [];
  if (!matchChannels.enabled) return '';
  if (!results.length) return ' Nenhum canal privado foi criado porque não havia confrontos completos.';

  const created = results.filter((item) => item.created).length;
  const reused = results.filter((item) => item.reused).length;
  const failed = results.filter((item) => item.ok === false && !item.skipped).length;
  const skipped = results.filter((item) => item.skipped).length;

  return ` Canais privados: ${created} criado(s), ${reused} reutilizado(s), ${failed} falha(s), ${skipped} ignorado(s).`;
}


function applyTournamentSettings(settings = {}) {
  const teamLimit = normalizeTournamentTeamLimit(settings.teamLimit);
  const groupCount = normalizeTournamentGroupCount(settings.groupCount, teamLimit);

  tournamentSettings = {
    tournamentName: settings.tournamentName || 'Rematch Championship',
    matchFormat: settings.matchFormat || 'MD1',
    structure: settings.structure || 'single_elimination',
    teamLimit,
    groupCount,
    groups: Array.isArray(settings.groups) ? settings.groups : [],
    autoCreateMatchChannels: settings.autoCreateMatchChannels !== false,
    discordMatchCategoryId: settings.discordMatchCategoryId || ''
  };

  if (boardTournamentName) {
    boardTournamentName.textContent = tournamentSettings.tournamentName;
  }

  if (boardMatchFormatLabel) {
    boardMatchFormatLabel.textContent = `${tournamentSettings.matchFormat} • ${tournamentSettings.teamLimit} times`;
  }

  if (currentBracketData) {
    renderBracket();
  }

  if (tournamentConfigForm) {
    tournamentConfigForm.elements.tournamentName.value = tournamentSettings.tournamentName;

    const matchInput = tournamentConfigForm.querySelector(`input[name="matchFormat"][value="${CSS.escape(tournamentSettings.matchFormat)}"]`);
    const structureInput = tournamentConfigForm.querySelector(`input[name="structure"][value="${CSS.escape(tournamentSettings.structure)}"]`);

    if (matchInput) matchInput.checked = true;
    if (structureInput) structureInput.checked = true;
    if (teamLimitSelect) teamLimitSelect.value = String(tournamentSettings.teamLimit);
    if (groupCountSelect) groupCountSelect.value = String(tournamentSettings.groupCount);
    if (autoCreateMatchChannelsInput) autoCreateMatchChannelsInput.checked = tournamentSettings.autoCreateMatchChannels;
    if (matchCategorySelect) matchCategorySelect.value = tournamentSettings.discordMatchCategoryId;

    updateTournamentChoiceCards();
    buildTournamentGroupsPreview();
  }
}

async function loadTournamentSettings() {
  const data = await apiJson('/api/tournament/settings');
  applyTournamentSettings(data.settings || {});
}

async function saveTournamentSettings(event) {
  event.preventDefault();
  tournamentConfigMessage.textContent = 'Salvando modelo...';
  tournamentConfigMessage.className = 'auth-message';

  try {
    const form = new FormData(tournamentConfigForm);
    const payload = {
      tournamentName: String(form.get('tournamentName') || '').trim(),
      matchFormat: form.get('matchFormat') || 'MD1',
      structure: form.get('structure') || 'single_elimination',
      teamLimit: Number(form.get('teamLimit') || 16),
      groupCount: Number(form.get('groupCount') || 4),
      autoCreateMatchChannels: Boolean(form.get('autoCreateMatchChannels')),
      discordMatchCategoryId: String(form.get('discordMatchCategoryId') || '').trim()
    };

    const data = await apiJson('/api/tournament/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    applyTournamentSettings(data.settings || {});
    tournamentConfigMessage.textContent = 'Modelo salvo. Use "Gerar automático" para aplicar no chaveamento.';
    tournamentConfigMessage.className = 'auth-message success';
  } catch (error) {
    tournamentConfigMessage.textContent = error.message;
    tournamentConfigMessage.className = 'auth-message error';
  }
}

function openTournamentConfig() {
  applyTournamentSettings(tournamentSettings);
  buildTournamentGroupsPreview();
  fillMatchCategorySelect();
  tournamentConfigMessage.textContent = '';
  tournamentConfigMessage.className = 'auth-message';
  tournamentConfigModal.hidden = false;
  if (tournamentActionsMenu) tournamentActionsMenu.hidden = true;
  toggleTournamentActionsBtn?.setAttribute('aria-expanded', 'false');
}

function closeTournamentConfig() {
  tournamentConfigModal.hidden = true;
}

function renderBracket() {
  document.querySelectorAll('.team-slot[data-slot]').forEach((slot) => {
    const index = Number(slot.dataset.slot);
    const team = currentBracketData.slots[index];
    slot.innerHTML = teamSlotHtml(team, `Vaga ${String(index + 1).padStart(2, '0')}`, 'slots', index);
    slot.classList.toggle('is-empty', !team);
    slot.title = team ? `Clique para avançar ${team.name}` : '';
  });

  renderRound('.advance-slot[data-round="quarters"]', currentBracketData.quarters, 'A definir');
  renderRound('.advance-slot[data-round="semis"]', currentBracketData.semis, 'A definir');
  renderRound('.final-slot[data-round="finals"]', currentBracketData.finals, 'Finalista');

  if (bracketStatus) bracketStatus.textContent = '';
}

async function persistBracket(statusText = 'Chaveamento atualizado.') {
  const payload = {
    slots: currentBracketData.slots.map(teamIdOf),
    quarters: currentBracketData.quarters.map(teamIdOf),
    semis: currentBracketData.semis.map(teamIdOf),
    finals: currentBracketData.finals.map(teamIdOf),
    matchProgress: currentBracketData.matchProgress
  };

  const data = await apiJson('/api/bracket', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  currentBracketData = normalizeBracketData(data.bracket);
  renderBracket();
  bracketStatus.textContent = statusText;
}

function promoteFromInitial(index) {
  const team = currentBracketData.slots[index];
  if (!team) return;
  const target = Math.floor(index / 2);
  currentBracketData.quarters[target] = team;
}

function promoteFromQuarter(index) {
  const team = currentBracketData.quarters[index];
  if (!team) return;
  const target = Math.floor(index / 2);
  currentBracketData.semis[target] = team;
}

function promoteFromSemi(index) {
  const team = currentBracketData.semis[index];
  if (!team) return;
  const target = index < 2 ? 0 : 1;
  currentBracketData.finals[target] = team;
}

async function handleBracketClick(event) {
  const teamSlot = event.target.closest('.team-slot[data-slot]');
  const roundSlot = event.target.closest('[data-round][data-index]');

  try {
    if (teamSlot) {
      promoteFromInitial(Number(teamSlot.dataset.slot));
      await persistBracket('Time avançado para as quartas.');
      return;
    }

    if (roundSlot) {
      const round = roundSlot.dataset.round;
      const index = Number(roundSlot.dataset.index);

      if (round === 'quarters') {
        promoteFromQuarter(index);
        await persistBracket('Time avançado para a semifinal.');
      } else if (round === 'semis') {
        promoteFromSemi(index);
        await persistBracket('Time avançado para a final.');
      }
    }
  } catch (error) {
    bracketStatus.textContent = error.message;
  }
}

async function loadUsersLookup() {
  const data = await apiJson('/api/users/lookup');
  usersLookup = data.users || [];
  return usersLookup;
}

async function loadTeamsAndBracket() {
  const [teamData, userData, eventData] = await Promise.all([
    apiJson('/api/teams'),
    apiJson('/api/users/lookup').catch(() => ({ users: [] })),
    apiJson('/api/events').catch(() => ({ events: [] }))
  ]);

  teams = teamData.teams || [];
  usersLookup = userData.users || [];
  currentEvents = eventData.events || [];
  if (!currentEvents.some((event) => event.id === currentEventId) && currentEvents[0]) currentEventId = currentEvents[0].id;
  currentMainEvent = mainEvent();
  currentBracketData = normalizeBracketData(teamData.bracket || {});

  renderTeams();
  renderMyTeams();
  renderPlayerHomeData();
  renderBracket();
  buildTournamentGroupsPreview();
}

async function saveTeam(event) {
  event.preventDefault();
  teamFormMessage.textContent = 'Salvando...';
  teamFormMessage.className = 'auth-message';

  try {
    const form = new FormData(teamForm);
    const logoFile = teamLogoInput.files?.[0] || null;
    const fileLogo = await fileToDataUrl(logoFile);
    const linkLogo = String(form.get('logoUrl') || '').trim();
    const logo = fileLogo || currentLogoData || linkLogo || null;

    const players = [1, 2, 3, 4, 5]
      .map((index) => String(form.get(`player${index}`) || '').trim())
      .filter(Boolean);

    const reserves = Array.from(teamForm.querySelectorAll('input[name="reserve"]'))
      .map((input) => String(input.value || '').trim())
      .filter(Boolean);

    const playerAccounts = [1, 2, 3, 4, 5]
      .map((index) => String(form.get(`playerAccount${index}`) || '').trim());

    const reserveAccounts = Array.from(teamForm.querySelectorAll('input[name="reserveAccount"]'))
      .map((input) => String(input.value || '').trim());

    const payload = {
      name: String(form.get('name') || '').trim(),
      tag: String(form.get('tag') || '').trim().toUpperCase(),
      players,
      reserves,
      playerAccounts: {
        players: playerAccounts,
        reserves: reserveAccounts
      },
      socials: {
        site: String(form.get('socialSite') || '').trim(),
        email: String(form.get('socialEmail') || '').trim(),
        discord: String(form.get('socialDiscord') || '').trim(),
        twitter: String(form.get('socialTwitter') || '').trim(),
        youtube: String(form.get('socialYoutube') || '').trim(),
        tiktok: String(form.get('socialTiktok') || '').trim(),
        instagram: String(form.get('socialInstagram') || '').trim()
      }
    };

    if (logo) payload.logo = logo;

    const id = teamId.value;
    const url = id ? `/api/teams/${encodeURIComponent(id)}` : '/api/teams';
    const method = id ? 'PUT' : 'POST';

    await apiJson(url, { method, body: JSON.stringify(payload) });
    teamFormMessage.textContent = 'Time salvo com sucesso.';
    teamFormMessage.className = 'auth-message success';
    await loadTeamsAndBracket();

    setTimeout(closeTeamModal, 350);
  } catch (error) {
    teamFormMessage.textContent = error.message;
    teamFormMessage.className = 'auth-message error';
  }
}

async function generateBracket() {
  try {
    bracketStatus.textContent = 'Gerando chaveamento e canais privados...';
    const data = await apiJson('/api/bracket/generate', { method: 'POST' });
    currentBracketData = normalizeBracketData(data.bracket);
    if (data.settings) applyTournamentSettings(data.settings);
    renderBracket();
    bracketStatus.textContent = `Chaveamento gerado.${describeMatchChannelResult(data.matchChannels)}`;
  } catch (error) {
    bracketStatus.textContent = error.message;
  }
}

async function handleLogoFile(file) {
  const dataUrl = await fileToDataUrl(file);
  setLogoPreview(dataUrl);
  teamLogoUrlInput.value = '';
}

function buildTeamOptions(selectedId) {
  const options = ['<option value="">Vazio</option>'];
  teams.forEach((team) => {
    const selected = team.id === selectedId ? 'selected' : '';
    options.push(`<option value="${escapeHtml(team.id)}" ${selected}>${escapeHtml(team.name)} (${escapeHtml(team.tag)})</option>`);
  });
  return options.join('');
}

function getEditorSectionDescription(roundKey) {
  const map = {
    slots: 'Defina quem ocupa cada vaga inicial do chaveamento.',
    quarters: 'Ajuste manualmente os confrontos das quartas de final.',
    semis: 'Controle quem chega até as semifinais.',
    finals: 'Escolha os dois finalistas do torneio.'
  };

  return map[roundKey] || '';
}

function buildMatchProgressOptions(selectedValue = 1) {
  const max = getMatchMaxGames();
  const selected = clampMatchProgress(selectedValue);
  return Array.from({ length: max }, (_, index) => {
    const value = index + 1;
    return `<option value="${value}" ${value === selected ? 'selected' : ''}>Jogo ${value}/${max}</option>`;
  }).join('');
}

function buildEditorSection(title, roundKey, items, labelFactory) {
  const progressItems = getProgressArray(roundKey);

  return `
    <section class="editor-section editor-section-${escapeHtml(roundKey)}">
      <header class="editor-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(getEditorSectionDescription(roundKey))}</p>
        </div>
        <span class="editor-count">${items.length} ${items.length === 1 ? 'vaga' : 'vagas'}</span>
      </header>
      <div class="editor-section-grid">
        ${items.map((team, index) => `
          <label class="editor-slot-card">
            <span class="editor-slot-label">${escapeHtml(labelFactory(index))}</span>
            <div class="editor-manual-row">
              <div class="editor-select-wrap">
                <select data-editor-round="${escapeHtml(roundKey)}" data-editor-index="${index}">
                  ${buildTeamOptions(team?.id || '')}
                </select>
              </div>
              <div class="editor-select-wrap editor-progress-wrap">
                <select data-editor-progress-round="${escapeHtml(roundKey)}" data-editor-progress-index="${index}" aria-label="Jogo atual da série">
                  ${buildMatchProgressOptions(progressItems[index] || 1)}
                </select>
              </div>
            </div>
          </label>
        `).join('')}
      </div>
    </section>
  `;
}

function openBracketEditor() {
  bracketEditorMessage.textContent = '';
  bracketEditorMessage.className = 'auth-message';

  const initialLabels = [
    'Oitavas 01', 'Oitavas 02', 'Oitavas 03', 'Oitavas 04',
    'Oitavas 05', 'Oitavas 06', 'Oitavas 07', 'Oitavas 08',
    'Oitavas 09', 'Oitavas 10', 'Oitavas 11', 'Oitavas 12',
    'Oitavas 13', 'Oitavas 14', 'Oitavas 15', 'Oitavas 16'
  ];

  bracketEditorGrid.innerHTML = [
    buildEditorSection('Oitavas', 'slots', currentBracketData.slots, (index) => initialLabels[index] || `Vaga ${index + 1}`),
    buildEditorSection('Quartas', 'quarters', currentBracketData.quarters, (index) => `Quartas ${String(index + 1).padStart(2, '0')}`),
    buildEditorSection('Semifinais', 'semis', currentBracketData.semis, (index) => `Semifinal ${String(index + 1).padStart(2, '0')}`),
    buildEditorSection('Final', 'finals', currentBracketData.finals, (index) => index === 0 ? 'Finalista esquerdo' : 'Finalista direito')
  ].join('');

  bracketEditorModal.hidden = false;
}

function closeBracketEditor() {
  bracketEditorModal.hidden = true;
}

async function saveBracketEditor() {
  try {
    bracketEditorMessage.textContent = 'Salvando posições...';
    bracketEditorMessage.className = 'auth-message';
    const teamById = new Map(teams.map((team) => [team.id, team]));
    const nextData = {
      slots: Array(16).fill(null),
      quarters: Array(8).fill(null),
      semis: Array(4).fill(null),
      finals: Array(2).fill(null),
      matchProgress: {
        slots: Array(16).fill(1),
        quarters: Array(8).fill(1),
        semis: Array(4).fill(1),
        finals: Array(2).fill(1)
      }
    };

    bracketEditorGrid.querySelectorAll('select[data-editor-round][data-editor-index]').forEach((select) => {
      const round = select.dataset.editorRound;
      const index = Number(select.dataset.editorIndex);
      if (!nextData[round]) return;
      nextData[round][index] = teamById.get(select.value) || null;
    });

    bracketEditorGrid.querySelectorAll('select[data-editor-progress-round][data-editor-progress-index]').forEach((select) => {
      const round = select.dataset.editorProgressRound;
      const index = Number(select.dataset.editorProgressIndex);
      if (!nextData.matchProgress[round]) return;
      nextData.matchProgress[round][index] = clampMatchProgress(select.value);
    });

    currentBracketData = { ...currentBracketData, ...nextData };
    await persistBracket('Posições salvas manualmente.');
    bracketEditorMessage.textContent = 'Posições salvas.';
    bracketEditorMessage.className = 'auth-message success';
    setTimeout(closeBracketEditor, 350);
  } catch (error) {
    bracketEditorMessage.textContent = error.message;
    bracketEditorMessage.className = 'auth-message error';
  }
}

async function clearBracket() {
  try {
    currentBracketData = normalizeBracketData({});
    await persistBracket('Chaveamento limpo. Times cadastrados mantidos.');
  } catch (error) {
    bracketStatus.textContent = error.message;
  }
}


openHowToBtn?.addEventListener('click', openHowToModal);
closeHowToBtn?.addEventListener('click', closeHowToModal);
howToModal?.addEventListener('click', (event) => {
  if (event.target === howToModal) closeHowToModal();
});

openTermsBtn?.addEventListener('click', openTermsModal);
closeTermsBtn?.addEventListener('click', closeTermsModal);
termsModal?.addEventListener('click', (event) => {
  if (event.target === termsModal) closeTermsModal();
});

openMusicSettingsBtn?.addEventListener('click', openMusicSettingsPanel);
closeMusicSettingsBtn?.addEventListener('click', closeMusicSettingsPanel);
musicStartBtn?.addEventListener('click', startBackgroundMusic);
musicStopBtn?.addEventListener('click', stopBackgroundMusic);
musicTrackSelect?.addEventListener('change', () => {
  saveMusicSettings();
  const audio = ensureBackgroundMusic();
  if (!audio.paused) startBackgroundMusic();
});
musicVolumeRange?.addEventListener('input', () => {
  const audio = ensureBackgroundMusic();
  audio.volume = Math.max(0, Math.min(100, Number(musicVolumeRange.value || 42))) / 100;
  saveMusicSettings();
});

openSiteChatBtn?.addEventListener('click', openSiteChatModal);
closeSiteChatBtn?.addEventListener('click', closeSiteChatModal);
openSiteChatSettingsBtn?.addEventListener('click', toggleSiteChatSettings);
refreshBridgeChannelsBtn?.addEventListener('click', loadDiscordChannels);
saveBridgeSettingsBtn?.addEventListener('click', saveBridgeSettings);
siteChatModal?.addEventListener('click', (event) => {
  if (event.target === siteChatModal) closeSiteChatModal();
});
siteChatForm?.addEventListener('submit', sendSiteChatMessage);

openStatsBtn?.addEventListener('click', openStatsChatModal);
closeStatsChatBtn?.addEventListener('click', closeStatsChatModal);
openStatsChatSettingsBtn?.addEventListener('click', toggleStatsChatSettings);
refreshStatsBridgeChannelsBtn?.addEventListener('click', loadStatsDiscordChannels);
saveStatsBridgeSettingsBtn?.addEventListener('click', saveStatsBridgeSettings);
statsChatModal?.addEventListener('click', (event) => {
  if (event.target === statsChatModal) closeStatsChatModal();
});
statsChatForm?.addEventListener('submit', sendStatsChatMessage);

openTeamChatBtn?.addEventListener('click', openTeamChatModal);
closeTeamChatBtn?.addEventListener('click', closeTeamChatModal);
teamChatModal?.addEventListener('click', (event) => {
  if (event.target === teamChatModal) closeTeamChatModal();
});
teamChatCreateForm?.addEventListener('submit', createTeamChat);
teamChatForm?.addEventListener('submit', sendTeamChatMessage);
teamChatList?.addEventListener('click', (event) => {
  const item = event.target.closest('[data-team-chat-id]');
  if (!item) return;
  setActiveTeamChat(item.dataset.teamChatId || '');
});

userChip.addEventListener('click', () => {
  const isOpen = !userDropdown.hidden;
  userDropdown.hidden = isOpen;
  userChip.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.user-menu-wrap')) {
    userDropdown.hidden = true;
    userChip.setAttribute('aria-expanded', 'false');
  }
});



function getTeamRankingRows() {
  return teams
    .map((team) => {
      const players = (team.players || []).filter(Boolean);
      const reserves = (team.reserves || []).filter(Boolean);
      const matches = Number(team.matchesPlayed || 0);
      const wins = Number(team.wins || 0);
      const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
      const points = Number(team.points || wins * 3);

      return {
        team,
        members: players.length + reserves.length,
        tournaments: Number(team.tournamentsPlayed || 0),
        matches,
        wins,
        winRate,
        points
      };
    })
    .sort((a, b) => b.points - a.points || b.winRate - a.winRate || b.matches - a.matches || a.team.name.localeCompare(b.team.name));
}

function getPlayerRankingRows() {
  const rows = [];

  teams.forEach((team) => {
    const players = (team.players || []).filter(Boolean);
    const reserves = (team.reserves || []).filter(Boolean);
    const playerAccounts = team.playerAccounts || {};
    const playerAccountIds = Array.isArray(playerAccounts.players) ? playerAccounts.players : [];
    const reserveAccountIds = Array.isArray(playerAccounts.reserves) ? playerAccounts.reserves : [];

    players.forEach((playerName, index) => {
      rows.push({
        name: playerName,
        accountId: playerAccountIds[index] || '',
        team,
        role: `Titular ${index + 1}`,
        goals: 0,
        interceptions: 0,
        passes: 0,
        saves: 0,
        score: 0,
        averageScore: 0,
        winRate: 0
      });
    });

    reserves.forEach((playerName, index) => {
      rows.push({
        name: playerName,
        accountId: reserveAccountIds[index] || '',
        team,
        role: `Reserva ${index + 1}`,
        goals: 0,
        interceptions: 0,
        passes: 0,
        saves: 0,
        score: 0,
        averageScore: 0,
        winRate: 0
      });
    });
  });

  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function renderRankings(type = 'teams') {
  if (!rankingsContent) return;

  rankingTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.rankingTab === type);
  });

  if (type === 'players') {
    const players = getPlayerRankingRows();

    if (!players.length) {
      rankingsContent.innerHTML = `
        <div class="empty-teams large-empty">
          <strong>Nenhum jogador no ranking ainda.</strong>
          <p>Cadastre jogadores nos times para montar o ranking individual.</p>
        </div>
      `;
      return;
    }

    rankingsContent.innerHTML = `
      <div class="ranking-table-wrap">
        <table class="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Time</th>
              <th>Gols</th>
              <th>Interceptações</th>
              <th>Passes</th>
              <th>Defesas</th>
              <th>Pontos</th>
              <th>Média</th>
              <th>Vitória</th>
            </tr>
          </thead>
          <tbody>
            ${players.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <div class="ranking-player-cell">
                    ${playerAvatarHtml(row.name, row.accountId)}
                    <div>
                      ${playerNameRankingHtml(row.name, row.accountId)}
                      <small>${escapeHtml(findUserForPlayer(row.name, row.accountId) ? 'Conta autenticada vinculada' : 'Sem conta vinculada')}</small>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(row.team.tag || row.team.name)} • ${escapeHtml(row.role)}</td>
                <td>${row.goals}</td>
                <td>${row.interceptions}</td>
                <td>${row.passes}</td>
                <td>${row.saves}</td>
                <td>${row.score}</td>
                <td>${row.averageScore}</td>
                <td>${row.winRate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  const teamRows = getTeamRankingRows();

  if (!teamRows.length) {
    rankingsContent.innerHTML = `
      <div class="empty-teams large-empty">
        <strong>Nenhum time no ranking ainda.</strong>
        <p>Cadastre times para montar o ranking geral.</p>
      </div>
    `;
    return;
  }

  rankingsContent.innerHTML = `
    <div class="ranking-table-wrap">
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Membros</th>
            <th>Campeonatos</th>
            <th>Partidas</th>
            <th>Vitórias</th>
            <th>Taxa</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          ${teamRows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <div class="ranking-team-cell">
                  <span class="ranking-team-logo">${teamLogoHtml(row.team)}</span>
                  <div>
                    <button class="ranking-team-profile-btn" type="button" data-team-id="${escapeHtml(row.team.id)}" title="Abrir perfil do time ${escapeHtml(row.team.name)}">${escapeHtml(row.team.name)}</button>
                    <small>${escapeHtml(row.team.tag || 'SEM TAG')}</small>
                  </div>
                </div>
              </td>
              <td>${row.members}</td>
              <td>${row.tournaments}</td>
              <td>${row.matches}</td>
              <td>${row.wins}</td>
              <td>${row.winRate}%</td>
              <td>${row.points}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openRankingsModal() {
  if (!rankingsModal) return;
  rankingsModal.hidden = false;

  if (rankingsContent) {
    rankingsContent.innerHTML = `
      <div class="empty-teams large-empty">
        <strong>Carregando rankings...</strong>
        <p>Buscando times cadastrados e jogadores vinculados.</p>
      </div>
    `;
  }

  try {
    await loadTeamsAndBracket();
    fillTeamChatSelects();
  } catch (error) {
    if (rankingsContent) {
      rankingsContent.innerHTML = `
        <div class="empty-teams large-empty">
          <strong>Não foi possível carregar o ranking.</strong>
          <p>${escapeHtml(error.message || 'Tente atualizar a página.')}</p>
        </div>
      `;
    }
    return;
  }

  renderRankings('teams');
}

function closeRankingsModal() {
  rankingsModal.hidden = true;
}




openTournamentConfigBtn?.addEventListener('click', openTournamentConfig);
closeTournamentConfigBtn?.addEventListener('click', closeTournamentConfig);
tournamentConfigModal?.addEventListener('click', (event) => {
  if (event.target === tournamentConfigModal) closeTournamentConfig();
});
tournamentConfigForm?.addEventListener('submit', saveTournamentSettings);
teamLimitSelect?.addEventListener('change', buildTournamentGroupsPreview);
groupCountSelect?.addEventListener('change', buildTournamentGroupsPreview);
tournamentConfigForm?.addEventListener('change', updateTournamentChoiceCards);

openManualFromConfigBtn?.addEventListener('click', () => {
  closeTournamentConfig();
  openBracketEditor();
});

openRankingsBtn?.addEventListener('click', openRankingsModal);
closeRankingsBtn?.addEventListener('click', closeRankingsModal);
rankingsModal?.addEventListener('click', (event) => {
  if (event.target === rankingsModal) closeRankingsModal();
});
rankingTabs.forEach((tab) => {
  tab.addEventListener('click', () => renderRankings(tab.dataset.rankingTab || 'teams'));
});

rankingsContent?.addEventListener('click', (event) => {
  const userButton = event.target.closest('[data-user-id]');
  if (userButton) {
    openUserProfile(userButton.dataset.userId);
    return;
  }

  const teamButton = event.target.closest('[data-team-id]');
  if (teamButton) {
    openTeamProfile(teamButton.dataset.teamId);
  }
});

userProfileContent?.addEventListener('click', (event) => {
  const screenButton = event.target.closest('[data-open-screen-user]');
  if (screenButton) {
    openScreenWithUser(screenButton.dataset.openScreenUser);
    return;
  }

  const teamButton = event.target.closest('[data-profile-team-id]');
  if (!teamButton) return;
  openTeamProfile(teamButton.dataset.profileTeamId);
});

teamProfileContent?.addEventListener('click', (event) => {
  const screenButton = event.target.closest('[data-open-screen-user]');
  if (screenButton) {
    openScreenWithUser(screenButton.dataset.openScreenUser);
    return;
  }

  const userButton = event.target.closest('[data-user-id]');
  if (!userButton) return;
  openUserProfile(userButton.dataset.userId);
});

closeUserProfileBtn?.addEventListener('click', closeUserProfile);
userProfileModal?.addEventListener('click', (event) => {
  if (event.target === userProfileModal) closeUserProfile();
});

closeTeamProfileBtn?.addEventListener('click', closeTeamProfile);
teamProfileModal?.addEventListener('click', (event) => {
  if (event.target === teamProfileModal) closeTeamProfile();
});

toggleTournamentActionsBtn?.addEventListener('click', () => {
  const isOpen = !tournamentActionsMenu.hidden;
  tournamentActionsMenu.hidden = isOpen;
  toggleTournamentActionsBtn.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.tournament-actions')) {
    if (tournamentActionsMenu) tournamentActionsMenu.hidden = true;
    toggleTournamentActionsBtn?.setAttribute('aria-expanded', 'false');
  }
});

openMyTeamsBtn?.addEventListener('click', openMyTeamsModal);
closeMyTeamsBtn?.addEventListener('click', closeMyTeamsModal);
myTeamsModal?.addEventListener('click', (event) => {
  if (event.target === myTeamsModal) closeMyTeamsModal();
});

myTeamsContent?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-my-team-action]');
  if (!button) return;

  const team = teams.find((item) => item.id === button.dataset.id);
  if (!team) return;

  if (button.dataset.myTeamAction === 'manage') {
    closeMyTeamsModal();
    openTeamModal(team);
    return;
  }

  if (button.dataset.myTeamAction === 'share') {
    const text = `${team.name} (${team.tag}) no Abyss Tourment Game`;
    navigator.clipboard?.writeText(text);
    window.alert('Informações do time copiadas para compartilhar.');
    return;
  }

  if (button.dataset.myTeamAction === 'leave') {
    window.alert('Saída de time será ativada quando o sistema de membros/permissões estiver pronto.');
  }
});

myMatchesBtn?.addEventListener('click', openMyMatchesModal);
closeMyMatchesBtn?.addEventListener('click', closeMyMatchesModal);
myMatchesModal?.addEventListener('click', (event) => {
  if (event.target === myMatchesModal) closeMyMatchesModal();
});

settingsBtn?.addEventListener('click', openSettingsModal);
closeSettingsBtn?.addEventListener('click', closeSettingsModal);
settingsModal?.addEventListener('click', (event) => {
  if (event.target === settingsModal) closeSettingsModal();
});
settingsForm?.addEventListener('submit', saveUserSocialSettings);

changeProfileBannerBtn?.addEventListener('click', () => {
  profileBannerInput?.click();
});

clearProfileBannerBtn?.addEventListener('click', () => {
  setProfileBannerPreview('', 'custom');
  if (profileBannerInput) profileBannerInput.value = '';
  if (profileBannerFileName) profileBannerFileName.textContent = 'Nenhum arquivo escolhido';
  if (profileBannerUrlInput) profileBannerUrlInput.value = '';
});

useDiscordBannerBtn?.addEventListener('click', () => {
  const discordBanner = safeProfileBanner(userProfileData(currentUser || {}).discordBanner || '');
  if (!discordBanner) return;
  setProfileBannerPreview(discordBanner, 'discord');
  if (settingsMessage) {
    settingsMessage.textContent = 'Banner do Discord aplicado. Clique em Salvar alterações para confirmar.';
    settingsMessage.className = 'auth-message success';
  }
});


selectProfileBannerFileBtn?.addEventListener('click', () => {
  profileBannerInput?.click();
});

profileBannerInput?.addEventListener('change', async () => {
  const file = profileBannerInput.files?.[0];
  if (profileBannerFileName) {
    profileBannerFileName.textContent = file?.name || 'Nenhum arquivo escolhido';
  }
  if (!file) return;

  try {
    await handleProfileBannerFile(file);
  } catch (error) {
    settingsMessage.textContent = error.message;
    settingsMessage.className = 'auth-message error';
  }
});

profileBannerUrlInput?.addEventListener('input', () => {
  const value = profileBannerUrlInput.value.trim();
  if (!value) {
    setProfileBannerPreview('');
    return;
  }
  if (/^https?:\/\//i.test(value)) setProfileBannerPreview(value, 'custom');
});

profileBannerPasteBox?.addEventListener('dragover', (event) => {
  event.preventDefault();
  profileBannerPasteBox.classList.add('is-dragging');
});

profileBannerPasteBox?.addEventListener('dragleave', () => {
  profileBannerPasteBox.classList.remove('is-dragging');
});

profileBannerPasteBox?.addEventListener('drop', async (event) => {
  event.preventDefault();
  profileBannerPasteBox.classList.remove('is-dragging');
  const file = event.dataTransfer.files?.[0];
  if (!file) return;

  try {
    await handleProfileBannerFile(file);
  } catch (error) {
    settingsMessage.textContent = error.message;
    settingsMessage.className = 'auth-message error';
  }
});

profileBannerPasteBox?.addEventListener('paste', async (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  const text = event.clipboardData?.getData('text')?.trim();

  try {
    if (imageItem) {
      event.preventDefault();
      await handleProfileBannerFile(imageItem.getAsFile());
      return;
    }

    if (/^https?:\/\//i.test(text)) {
      event.preventDefault();
      profileBannerUrlInput.value = text;
      setProfileBannerPreview(text, 'custom');
    }
  } catch (error) {
    settingsMessage.textContent = error.message;
    settingsMessage.className = 'auth-message error';
  }
});

profileBannerPasteBox?.addEventListener('click', () => {
  profileBannerPasteBox.focus();
});

// v0.9 profile banner preview click upload: o preview inteiro também abre o seletor.
settingsBannerPreview?.addEventListener('click', (event) => {
  if (event.target.closest('button')) return;
  profileBannerInput?.click();
});


dropdownLogoutBtn?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
});


logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
});

topCreateTeamBtn?.addEventListener('click', () => openTeamModal());
openBracketScreenBtn?.addEventListener('click', showBracketScreen);
openBracketFromHomeBtn?.addEventListener('click', showBracketScreen);
backToPlayerHomeBtn?.addEventListener('click', showPlayerHomeScreen);
homeCreateTeamBtn?.addEventListener('click', () => openTeamModal());
openCreateEventBtn?.addEventListener('click', () => openEventEditorModal());
editMainEventBtn?.addEventListener('click', () => {
  const eventData = currentEvents.find((item) => item.id === editMainEventBtn.dataset.eventId) || mainEvent();
  openEventEditorModal(eventData);
});
homeCreateTeamStepBtn?.addEventListener('click', () => openTeamModal());
homeJoinEventBtn?.addEventListener('click', openEventRegisterModal);
homeTeamChatBtn?.addEventListener('click', () => proxyClick(openTeamChatBtn));
homeRulesBtn?.addEventListener('click', openRulesModal);
closeEventRegisterBtn?.addEventListener('click', closeEventRegisterModal);
eventRegisterModal?.addEventListener('click', (event) => {
  if (event.target === eventRegisterModal) closeEventRegisterModal();
});
eventRegisterChoices?.addEventListener('click', async (event) => {
  const createBtn = event.target.closest('[data-event-create-team]');
  if (createBtn) {
    closeEventRegisterModal();
    openTeamModal();
    return;
  }

  const teamButton = event.target.closest('[data-register-team-id]');
  if (!teamButton) return;
  try {
    await registerTeamInMainEvent(teamButton.dataset.registerTeamId);
  } catch (error) {
    if (eventRegisterStatus) {
      eventRegisterStatus.textContent = error.message;
      eventRegisterStatus.className = 'auth-message error';
    }
  }
});

closeEventEditorBtn?.addEventListener('click', closeEventEditorModal);
cancelEventEditorBtn?.addEventListener('click', closeEventEditorModal);
eventEditorModal?.addEventListener('click', (event) => {
  if (event.target === eventEditorModal) closeEventEditorModal();
});
eventEditorForm?.addEventListener('submit', saveEventEditor);

closeRulesBtn?.addEventListener('click', closeRulesModal);
rulesModal?.addEventListener('click', (event) => {
  if (event.target === rulesModal) closeRulesModal();
});
eventRegisteredTeams?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-team-id]');
  if (button) openTeamProfile(button.dataset.teamId);
});
eventsShowcaseList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-event-card-id]');
  if (!button) return;
  setCurrentMainEvent(button.dataset.eventCardId);
});
scrimDirectoryGrid?.addEventListener('click', (event) => {
  const userButton = event.target.closest('[data-user-id]');
  if (userButton) {
    openUserProfile(userButton.dataset.userId);
    return;
  }
  const chatButton = event.target.closest('[data-open-screen-user]');
  if (chatButton) {
    openScreenWithUser(chatButton.dataset.openScreenUser);
  }
});
publicTeamsGrid?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-team-id]');
  if (button) openTeamProfile(button.dataset.teamId);
});
closeTeamModalBtn.addEventListener('click', closeTeamModal);
cancelTeamBtn.addEventListener('click', closeTeamModal);
teamModal.addEventListener('click', (event) => {
  if (event.target === teamModal) closeTeamModal();
});
teamForm.addEventListener('submit', saveTeam);
generateBracketBtn.addEventListener('click', generateBracket);
refreshTeamsBtn.addEventListener('click', loadTeamsAndBracket);
clearBracketBtn?.addEventListener('click', clearBracket);
openBracketEditorBtn?.addEventListener('click', openBracketEditor);
closeBracketEditorBtn?.addEventListener('click', closeBracketEditor);
cancelBracketEditorBtn?.addEventListener('click', closeBracketEditor);
saveBracketEditorBtn?.addEventListener('click', saveBracketEditor);
bracketEditorModal?.addEventListener('click', (event) => {
  if (event.target === bracketEditorModal) closeBracketEditor();
});
document.querySelector('.bracket-board')?.addEventListener('click', handleBracketClick);

document.addEventListener('click', (event) => {
  if (!event.target.closest('.custom-select')) {
    closeAllCustomSelects();
  }
});

teamLogoInput.addEventListener('change', async () => {
  const file = teamLogoInput.files?.[0];
  if (!file) return;

  try {
    await handleLogoFile(file);
  } catch (error) {
    teamFormMessage.textContent = error.message;
    teamFormMessage.className = 'auth-message error';
  }
});

teamLogoUrlInput.addEventListener('input', () => {
  const value = teamLogoUrlInput.value.trim();
  if (/^https?:\/\//i.test(value)) setLogoPreview(value);
});

logoPasteBox.addEventListener('dragover', (event) => {
  event.preventDefault();
  logoPasteBox.classList.add('is-dragging');
});

logoPasteBox.addEventListener('dragleave', () => {
  logoPasteBox.classList.remove('is-dragging');
});

logoPasteBox.addEventListener('drop', async (event) => {
  event.preventDefault();
  logoPasteBox.classList.remove('is-dragging');
  const file = event.dataTransfer.files?.[0];
  if (!file) return;

  try {
    await handleLogoFile(file);
  } catch (error) {
    teamFormMessage.textContent = error.message;
    teamFormMessage.className = 'auth-message error';
  }
});

logoPasteBox.addEventListener('paste', async (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  const text = event.clipboardData?.getData('text')?.trim();

  try {
    if (imageItem) {
      event.preventDefault();
      await handleLogoFile(imageItem.getAsFile());
      return;
    }

    if (/^https?:\/\//i.test(text)) {
      event.preventDefault();
      teamLogoUrlInput.value = text;
      setLogoPreview(text);
    }
  } catch (error) {
    teamFormMessage.textContent = error.message;
    teamFormMessage.className = 'auth-message error';
  }
});

logoPasteBox.addEventListener('click', () => {
  logoPasteBox.focus();
});

addReserveBtn.addEventListener('click', () => addReserveField());

reservesGrid.addEventListener('click', (event) => {
  const button = event.target.closest('.remove-reserve');
  if (!button) return;
  button.closest('.reserve-field')?.remove();

  reservesGrid.querySelectorAll('.reserve-field').forEach((field, index) => {
    const text = field.childNodes[0];
    if (text) text.textContent = `Reserva ${index + 1}`;
  });
});

teamsList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const team = teams.find((item) => item.id === button.dataset.id);
  if (!team) return;

  if (button.dataset.action === 'edit') {
    openTeamModal(team);
    return;
  }

  if (button.dataset.action === 'delete') {
    const ok = window.confirm(`Excluir o time ${team.name}?`);
    if (!ok) return;

    await apiJson(`/api/teams/${encodeURIComponent(team.id)}`, { method: 'DELETE' });
    await loadTeamsAndBracket();
  }
});


siteChatMessages?.addEventListener('click', (event) => {
  const editBtn = event.target.closest('[data-chat-edit-id]');
  if (!editBtn) return;
  const messageEl = editBtn.closest('.chat-message');
  const text = messageEl?.querySelector('.chat-message-text')?.innerText || '';
  editChatMessage('site', editBtn.dataset.chatEditId, text);
});

statsChatMessages?.addEventListener('click', (event) => {
  const editBtn = event.target.closest('[data-chat-edit-id]');
  if (!editBtn) return;
  const messageEl = editBtn.closest('.chat-message');
  const text = messageEl?.querySelector('.chat-message-text')?.innerText || '';
  editChatMessage('stats', editBtn.dataset.chatEditId, text);
});

teamChatMessages?.addEventListener('click', (event) => {
  const editBtn = event.target.closest('[data-chat-edit-id]');
  if (!editBtn) return;
  const messageEl = editBtn.closest('.chat-message');
  const text = messageEl?.querySelector('.chat-message-text')?.innerText || '';
  editChatMessage('team', editBtn.dataset.chatEditId, text);
});

document.addEventListener('click', (event) => {
  const suggestion = event.target.closest('.mention-suggestion');
  if (suggestion) {
    const form = suggestion.closest('form');
    insertMention(form?.elements?.content, suggestion.dataset.mention);
    return;
  }

  const mentionButton = event.target.closest('[data-mention-button]');
  if (mentionButton) {
    const form = mentionButton.closest('form');
    const input = form?.elements?.content;
    loadDiscordMentions().then(() => {
      const panel = mentionPanelFor(form);
      const items = mentionItems().slice(0, 10);
      if (!panel || !items.length) return;
      panel.innerHTML = items.map((item) => `
        <button class="mention-suggestion" type="button" data-mention="${escapeHtml(item.mention)}">
          <span>${item.type === 'role' ? '@&' : '@'}</span>
          <strong>${escapeHtml(item.label)}</strong>
          <small>${escapeHtml(item.sub)}</small>
        </button>
      `).join('');
      panel.hidden = false;
      input?.focus();
    });
    return;
  }

  if (!event.target.closest('.mention-suggestions-panel') && !event.target.closest('[data-mention-button]')) {
    hideMentionPanels();
  }
});


async function bootDashboard() {
  try {
    await loadMe();
  } catch {
    window.location.href = '/';
    return;
  }

  startSiteChatNotifications();
  startStatsChatNotifications();
  startBotProfileAutoRefresh();
  loadTournamentSettings().catch(() => applyTournamentSettings({}));

  try {
    await loadTeamsAndBracket();
    fillTeamChatSelects();
  } catch (error) {
    console.error('Erro ao carregar times/chaveamento:', error);
    if (teamsList) {
      teamsList.innerHTML = `
        <div class="empty-teams">
          <strong>Não foi possível carregar os times agora.</strong>
          <p>${escapeHtml(error.message || 'Tente atualizar a página.')}</p>
        </div>
      `;
    }
    if (bracketStatus) {
      bracketStatus.textContent = 'Não foi possível carregar o chaveamento agora.';
    }
  }
}

initCustomSelects(document);
applyMusicSettings();
bootDashboard();
