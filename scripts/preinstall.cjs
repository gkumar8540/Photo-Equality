const fs = require('node:fs');
const path = require('node:path');

const userAgent = process.env.npm_config_user_agent || '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead');
  process.exit(1);
}

for (const lockfile of ['package-lock.json', 'yarn.lock']) {
  const lockfilePath = path.resolve(lockfile);
  if (fs.existsSync(lockfilePath)) {
    fs.rmSync(lockfilePath, { force: true });
  }
}
