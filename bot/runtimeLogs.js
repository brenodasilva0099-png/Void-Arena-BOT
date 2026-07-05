const MAX_LOGS = 300;
const logs = [];

function serialize(value) {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function push(level, args) {
  logs.push({
    level,
    message: Array.from(args || []).map(serialize).join(' '),
    createdAt: new Date().toISOString()
  });
  while (logs.length > MAX_LOGS) logs.shift();
}

function installRuntimeLogs() {
  if (global.__voidArenaRuntimeLogsInstalled) return;
  global.__voidArenaRuntimeLogsInstalled = true;
  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  console.log = (...args) => { push('log', args); original.log(...args); };
  console.warn = (...args) => { push('warn', args); original.warn(...args); };
  console.error = (...args) => { push('error', args); original.error(...args); };
  push('log', ['Runtime log buffer iniciado.']);
}

function getRuntimeLogs(limit = 120) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit || 120)));
  return logs.slice(-safeLimit).reverse();
}

installRuntimeLogs();

module.exports = { installRuntimeLogs, getRuntimeLogs };
