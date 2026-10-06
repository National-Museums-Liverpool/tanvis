// Usage: node scripts/versions.mjs [show | sync | set <n.n.n> | wp <n.n.n>]
import fs from 'node:fs';

const PKG = new URL('../package.json', import.meta.url);
const VERSION_JS = new URL('../src/version.js', import.meta.url);
const PLUGIN = new URL('../wordpress/tanvis/tanvis.php', import.meta.url);

const SEMVER = /^\d+\.\d+\.\d+$/;
const read = (url) => fs.readFileSync(url, 'utf8');

function readVersions() {
  return {
    package: JSON.parse(read(PKG)).version,
    versionJs: read(VERSION_JS).match(/version = '([^']+)'/)?.[1],
    wordpress: read(PLUGIN).match(/^\s*\* Version:\s*(\S+)/m)?.[1],
  };
}

function replaceOnce(url, pattern, replacement) {
  const text = read(url);
  if (!pattern.test(text)) {
    throw new Error(`Version pattern not found in ${url.pathname}`);
  }
  fs.writeFileSync(url, text.replace(pattern, replacement));
}

const [first = 'show', second] = process.argv.slice(2);
const [command, arg] = SEMVER.test(first) ? ['set', first] : [first, second];

if (command === 'show') {
  const v = readVersions();
  console.log(`package.json:  ${v.package}`);
  console.log(`src/version.js: ${v.versionJs}`);
  console.log(`WordPress plugin: ${v.wordpress}`);
} else if (command === 'sync') {
  const version = readVersions().package;
  replaceOnce(VERSION_JS, /version = '[^']*'/, `version = '${version}'`);
  console.log(`src/version.js set to ${version}`);
} else if (command === 'set') {
  if (!SEMVER.test(arg || '')) {
    console.error('Usage: npm run ver -- <n.n.n>');
    process.exit(1);
  }
  replaceOnce(PKG, /("version":\s*)"[^"]*"/, `$1"${arg}"`);
  replaceOnce(VERSION_JS, /version = '[^']*'/, `version = '${arg}'`);
  console.log(`package.json and src/version.js set to ${arg}`);
} else if (command === 'wp') {
  if (!SEMVER.test(arg || '')) {
    console.error('Usage: npm run ver:wp -- <n.n.n>');
    process.exit(1);
  }
  replaceOnce(PLUGIN, /^(\s*\* Version:\s*)\S+/m, `$1${arg}`);
  replaceOnce(PLUGIN, /(TANVIS_WP_VERSION\s*=\s*)'[^']*'/, `$1'${arg}'`);
  console.log(`WordPress plugin set to ${arg}`);
} else {
  console.error('Usage: node scripts/versions.mjs [show | sync | set <n.n.n> | wp <n.n.n>]');
  process.exit(1);
}
