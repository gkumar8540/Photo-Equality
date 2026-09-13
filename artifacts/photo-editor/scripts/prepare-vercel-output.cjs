const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const sourceDir = path.join(projectDir, 'dist', 'public');
const outputDir = path.join(projectDir, 'public');

fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });
