const fs = require('node:fs');
const path = require('node:path');

for (const lockfile of ['package-lock.json', 'yarn.lock']) {
  const lockfilePath = path.resolve(lockfile);
  if (fs.existsSync(lockfilePath)) {
    fs.rmSync(lockfilePath, { force: true });
  }
}
