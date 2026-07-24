const { BaseGuildTextChannel, Message } = require('discord.js');

const PROTECTED_CHANNEL_IDS = new Set([
  '1529298839121428592',
  '1524621308682436740'
]);

const MANUAL_SEND = Symbol.for('hnl.manualDiscordSend');
let installed = false;
const logged = new Set();

function isProtectedChannel(channelId = '') {
  return PROTECTED_CHANNEL_IDS.has(String(channelId || '').trim());
}

function isManualPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && (payload[MANUAL_SEND] === true || payload.__hnlManualSend === true));
}

function cleanPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (!Object.prototype.hasOwnProperty.call(payload, '__hnlManualSend')) return payload;
  const clone = { ...payload };
  delete clone.__hnlManualSend;
  return clone;
}

function blockedMessage(channelId, operation = 'send') {
  const id = `blocked_${operation}_${Date.now()}`;
  return {
    id,
    channelId: String(channelId || ''),
    blocked: true,
    createdAt: new Date(),
    createdTimestamp: Date.now(),
    async delete() { return this; },
    async edit() { return this; },
    async pin() { return this; }
  };
}

function logBlocked(channelId, operation) {
  const key = `${channelId}:${operation}`;
  if (logged.has(key)) return;
  logged.add(key);
  console.warn(`[Discord/Guard] ${operation} automático bloqueado no canal protegido ${channelId}.`);
}

function markManualSend(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  Object.defineProperty(payload, MANUAL_SEND, { value: true, enumerable: false, configurable: true });
  return payload;
}

function installOutboundMessageGuard() {
  if (installed) return;
  installed = true;

  if (BaseGuildTextChannel?.prototype?.send && !BaseGuildTextChannel.prototype.send.__hnlGuarded) {
    const originalSend = BaseGuildTextChannel.prototype.send;
    const guardedSend = async function guardedSend(payload) {
      if (isProtectedChannel(this?.id) && !isManualPayload(payload)) {
        logBlocked(this.id, 'send');
        return blockedMessage(this.id, 'send');
      }
      return originalSend.call(this, cleanPayload(payload));
    };
    guardedSend.__hnlGuarded = true;
    guardedSend.__hnlOriginal = originalSend;
    BaseGuildTextChannel.prototype.send = guardedSend;
  }

  if (Message?.prototype?.reply && !Message.prototype.reply.__hnlGuarded) {
    const originalReply = Message.prototype.reply;
    const guardedReply = async function guardedReply(payload) {
      if (isProtectedChannel(this?.channelId) && !isManualPayload(payload)) {
        logBlocked(this.channelId, 'reply');
        return blockedMessage(this.channelId, 'reply');
      }
      return originalReply.call(this, cleanPayload(payload));
    };
    guardedReply.__hnlGuarded = true;
    guardedReply.__hnlOriginal = originalReply;
    Message.prototype.reply = guardedReply;
  }

  if (Message?.prototype?.edit && !Message.prototype.edit.__hnlGuarded) {
    const originalEdit = Message.prototype.edit;
    const guardedEdit = async function guardedEdit(payload) {
      if (isProtectedChannel(this?.channelId) && !isManualPayload(payload)) {
        logBlocked(this.channelId, 'edit');
        return this;
      }
      return originalEdit.call(this, cleanPayload(payload));
    };
    guardedEdit.__hnlGuarded = true;
    guardedEdit.__hnlOriginal = originalEdit;
    Message.prototype.edit = guardedEdit;
  }

  console.log('[Discord/Guard] Envios automáticos bloqueados nos canais de avisos e regras.');
}

module.exports = {
  PROTECTED_CHANNEL_IDS,
  MANUAL_SEND,
  isProtectedChannel,
  markManualSend,
  installOutboundMessageGuard
};
