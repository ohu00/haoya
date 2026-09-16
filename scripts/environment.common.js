const fs = require('fs');
const path = require('path');

const indexPath = path.join('/usr/share/nginx/html', 'index.html');
const swPath = path.join('/usr/share/nginx/html', 'service-worker.js');

if (!fs.existsSync(indexPath)) {
  console.error(`Error: File not found at ${indexPath}`);
  return;
}

let indexContent = fs.readFileSync(indexPath, 'utf8');
const swContent = fs.readFileSync(swPath, 'utf8');

const match = swContent.match(/const APP_VERSION = ['"](.+?)['"]/);
const version = match ? match[1] : null;

if (!version) {
  console.error(`Error: APP_VERSION not found in ${swPath}`);
  return
}

const versionTag = `<span>•</span><span>${version}</span>`;
indexContent = indexContent.replace('<!-- app-version-placeholder -->', versionTag);
fs.writeFileSync(indexPath, indexContent, 'utf8');