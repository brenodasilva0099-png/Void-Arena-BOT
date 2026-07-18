const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BOT_DIR = __dirname;
const SITE_URL = 'https://hollow-nexus-league.onrender.com';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) { if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; } }

function patchDiscordClient() {
  const file = path.join(BOT_DIR, 'discordClient.js');
  let src = read(file);
  if (!src) return;

  if (!src.includes("require('./publicPanelRefresh')")) {
    src = src.replace(
      "const { installRematchAnnouncement } = require('./oneTimeRematchAnnouncement');",
      "const { installRematchAnnouncement } = require('./oneTimeRematchAnnouncement');\nconst { registerPublicPanelRefresh } = require('./publicPanelRefresh');"
    );
  }

  if (!src.includes('registerPublicPanelRefresh(client);')) {
    src = src.replace(
      '  registerLegalCommands(client);\n  installRematchAnnouncement(client);',
      '  registerLegalCommands(client);\n  registerPublicPanelRefresh(client);\n  installRematchAnnouncement(client);'
    );
  }

  write(file, src);
}

function patchControlPanel() {
  const file = path.join(BOT_DIR, 'controlPanel.js');
  let src = read(file);
  if (!src) return;

  if (!src.includes("require('./publicPanelRefresh')")) {
    src = src.replace(
      "const { syncResultHubsForBracket } = require('./matchResults');",
      "const { syncResultHubsForBracket } = require('./matchResults');\nconst { siteUrl } = require('./publicPanelRefresh');"
    );
  }

  src = src.replace(
    "content: '📋 **Formulários Hollow Nexus**\nSite: https://void-arena-site.onrender.com/pages/formularios.html\nInscrição: https://void-arena-site.onrender.com/pages/inscricao.html\n\nPara criar painel público de inscrição no Discord, use `.inscricao-painel` no canal desejado.'",
    "content: ['📋 **Formulários Hollow Nexus League**', `Site: ${siteUrl('/pages/formularios.html')}`, `Inscrição: ${siteUrl('/pages/inscricao.html')}`, '', 'Para criar painel público de inscrição no Discord, use `.inscricao-painel` no canal desejado.'].join('\\n')"
  );

  src = src.replace(
    "content: '🎥 **Análise de Partidas**\nSite: https://void-arena-site.onrender.com/pages/treinos.html\n\nPara criar painel público de envio de partida, use `.partidas-painel` no canal desejado.'",
    "content: ['🎥 **Análise de Partidas**', `Site: ${siteUrl('/pages/treinos.html')}`, '', 'Para criar painel público de envio de partida, use `.partidas-painel` ou `.treinos-painel` no canal desejado.'].join('\\n')"
  );

  src = src.replace(
    "'Site: https://void-arena-site.onrender.com/pages/dashboard.html',",
    "`Site: ${siteUrl('/pages/dashboard.html')}`,")

  write(file, src);
}

function patchPlacarSystem() {
  const file = path.join(BOT_DIR, 'placarSystem.js');
  let src = read(file);
  if (!src) return;

  if (!src.includes("require('./publicPanelRefresh')")) {
    src = src.replace(
      "const placar = require('./placarStorage');",
      "const placar = require('./placarStorage');\nconst { siteUrl } = require('./publicPanelRefresh');"
    );
  }

  src = src.replace(
    "const SITE_PLACAR_URL = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com/pages/placar.html').trim();",
    "const SITE_PLACAR_URL = String(process.env.SITE_PLACAR_URL || siteUrl('/pages/placar.html')).trim();"
  );

  write(file, src);
}

function patchPlainOldLinks() {
  const files = fs.readdirSync(BOT_DIR).filter((name) => name.endsWith('.js')).map((name) => path.join(BOT_DIR, name));
  for (const file of files) {
    let src = read(file);
    if (!src) continue;
    const before = src;
    src = src.replace(/https:\/\/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/gi, SITE_URL);
    if (src !== before) write(file, src);
  }
}

patchDiscordClient();
patchControlPanel();
patchPlacarSystem();
patchPlainOldLinks();

console.log(changed ? '[Links/Painéis] Bot corrigido para novo site e refresh de painéis.' : '[Links/Painéis] Bot ja estava corrigido.');
