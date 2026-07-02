require('dotenv').config();

const storage = require('../server/storage');
const githubBackups = require('../server/githubBackups');

async function main() {
  const result = await githubBackups.saveBackupToGitHub(storage, {
    reason: `pre-bot-deploy:${process.env.RENDER_GIT_COMMIT || 'manual'}`
  });

  if (result?.skipped) {
    console.log('Backup pre-deploy do BOT ignorado por segurança:', result.reason, result.message || '');
    return;
  }

  console.log('Backup pre-deploy do BOT criado:', result.summary || result);
}

main().catch((error) => {
  console.error('Falha no backup pre-deploy do BOT:', error.message);
  process.exit(1);
});
