const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'server', 'storage.js');
if (!fs.existsSync(file)) process.exit(0);

let src = fs.readFileSync(file, 'utf8');
let changed = false;

function replaceOnce(from, to) {
  if (!src.includes(from)) return false;
  src = src.replace(from, to);
  changed = true;
  return true;
}

replaceOnce(
`    status,
    notes: String(raw.notes || '').trim().slice(0, 1000),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };`,
`    status,
    notes: String(raw.notes || '').trim().slice(0, 1000),
    comments: Array.isArray(raw.comments)
      ? raw.comments.map(normalizeApplicationComment).filter((comment) => comment.content).slice(-80)
      : [],
    recovery: raw.recovery && typeof raw.recovery === 'object' ? {
      mode: String(raw.recovery.mode || '').trim().slice(0, 80),
      incomplete: Boolean(raw.recovery.incomplete),
      source: String(raw.recovery.source || '').trim().slice(0, 180),
      note: String(raw.recovery.note || '').trim().slice(0, 600),
      discordMessageId: String(raw.recovery.discordMessageId || '').trim(),
      discordChannelId: String(raw.recovery.discordChannelId || '').trim(),
      recoveredAt: raw.recovery.recoveredAt || now
    } : null,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };`
);

if (!src.includes('async function recoverPlayerApplication(payload = {})')) {
  const anchor = `async function addPlayerApplicationComment(id, comment = {}) {`;
  if (!src.includes(anchor)) throw new Error('Âncora de comentários de formulário não encontrada.');
  const block = `async function recoverPlayerApplication(payload = {}) {
  const now = new Date().toISOString();
  const application = normalizePlayerApplication({
    ...payload,
    id: payload.id || \`application_recovered_\${Date.now()}_\${Math.random().toString(16).slice(2)}\`,
    recovery: {
      ...(payload.recovery && typeof payload.recovery === 'object' ? payload.recovery : {}),
      recoveredAt: payload.recovery?.recoveredAt || now
    },
    createdAt: payload.createdAt || now,
    updatedAt: payload.updatedAt || now
  });

  if (!application.userName) throw new Error('Recuperação sem nome do jogador.');
  if (!application.primaryPosition || !application.secondaryPosition || !application.playStyle) {
    throw new Error('Recuperação sem posição/estilo comprovados.');
  }

  return updateDatabase((db) => {
    db.playerApplications = Array.isArray(db.playerApplications)
      ? db.playerApplications.map(normalizePlayerApplication)
      : [];

    const recoveredMessageId = String(application.recovery?.discordMessageId || '').trim();
    const signature = [
      application.userName.toLowerCase(),
      application.primaryPosition.toLowerCase(),
      application.secondaryPosition.toLowerCase(),
      application.playStyle.toLowerCase(),
      String(application.createdAt || '').slice(0, 16)
    ].join('|');

    const existing = db.playerApplications.find((item) => {
      if (item.id === application.id) return true;
      if (recoveredMessageId && item.recovery?.discordMessageId === recoveredMessageId) return true;
      const itemSignature = [
        String(item.userName || '').toLowerCase(),
        String(item.primaryPosition || '').toLowerCase(),
        String(item.secondaryPosition || '').toLowerCase(),
        String(item.playStyle || '').toLowerCase(),
        String(item.createdAt || '').slice(0, 16)
      ].join('|');
      return itemSignature === signature;
    });

    if (existing) return { application: existing, alreadyPresent: true };

    db.playerApplications.push(application);
    db.playerApplications = db.playerApplications.slice(-500);
    return { application, alreadyPresent: false };
  });
}

`;
  src = src.replace(anchor, block + anchor);
  changed = true;
}

if (!src.includes('  recoverPlayerApplication,\n  addPlayerApplicationComment,')) {
  const anchor = '  addPlayerApplicationComment,\n';
  if (!src.includes(anchor)) throw new Error('Export de formulário não encontrado.');
  src = src.replace(anchor, '  recoverPlayerApplication,\n' + anchor);
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
const finalSource = fs.readFileSync(file, 'utf8');
new Function(finalSource);
for (const marker of [
  'async function recoverPlayerApplication(payload = {})',
  'recovery: raw.recovery && typeof raw.recovery',
  'recoverPlayerApplication,',
  'comments: Array.isArray(raw.comments)'
]) {
  if (!finalSource.includes(marker)) throw new Error(`Suporte de recuperação incompleto: ${marker}`);
}
console.log(changed
  ? '[Formularios/Recovery] Recuperação identificada, parcial ou completa, habilitada com deduplicação.'
  : '[Formularios/Recovery] Suporte de recuperação já estava aplicado.');