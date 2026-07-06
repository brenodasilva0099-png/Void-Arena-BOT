const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'patch-placar-result-form.js');

if (fs.existsSync(file)) {
  let src = fs.readFileSync(file, 'utf8');

  if (src.includes('function replaceBetween')) {
    const fixed = [
      'function replaceFunction(src, name, replacement) {',
      '  const asyncNeedle = `async function ${name}`;',
      '  const plainNeedle = `function ${name}`;',
      '  let start = src.indexOf(asyncNeedle);',
      '  if (start < 0) start = src.indexOf(plainNeedle);',
      '  if (start < 0) return src;',
      '  const braceStart = src.indexOf("{", start);',
      '  if (braceStart < 0) return src;',
      '  let depth = 0;',
      '  for (let i = braceStart; i < src.length; i += 1) {',
      '    const ch = src[i];',
      '    if (ch === "{") depth += 1;',
      '    else if (ch === "}") {',
      '      depth -= 1;',
      '      if (depth === 0) return src.slice(0, start) + replacement + src.slice(i + 1);',
      '    }',
      '  }',
      '  return src;',
      '}',
      ''
    ].join('\n');

    const start = src.indexOf('function replaceBetween');
    const end = src.indexOf('\n\nfunction patchSystem', start);
    if (start >= 0 && end > start) src = src.slice(0, start) + fixed + src.slice(end + 2);

    src = src.replace("src = replaceBetween(src, /function resultModal\\([^)]*\\) \\{/, /\\n\\}/, newResultModal);", "src = replaceFunction(src, 'resultModal', newResultModal);");
    src = src.replace("src = replaceBetween(src, /async function handleResultModal\\([^)]*\\) \\{/, /\\n\\}/, newHandle);", "src = replaceFunction(src, 'handleResultModal', newHandle);");
    src = src.replace("src = replaceBetween(src, /async function updateRankRoles\\([^)]*\\) \\{/, /\\n\\}/, rankFn);", "src = replaceFunction(src, 'updateRankRoles', rankFn);");

    fs.writeFileSync(file, src, 'utf8');
  }
}

require('./patch-placar-result-form');
try { require('./patch-placar-form-preview-handler'); } catch (error) { console.error('Patch preview formulário placar falhou:', error.message); }
console.log('Patch seguro aplicado: formulário validado do placar.');
