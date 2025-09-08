const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const targets = [path.join(root, 'server'), path.join(root, 'client')];
const exts = new Set(['.js', '.json']);

const apply = process.argv.includes('--apply-basic');
const report = process.argv.includes('--report') || !apply;

let modified = 0, scanned = 0, issues = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(entry.name))) processFile(p);
  }
}

function processFile(file) {
  scanned++;
  let data = fs.readFileSync(file, 'utf8');
  const before = data;
  const suspicious = /[�]+|\?\?[^{\s]|\{\s*\}|\)\s*\{|\`\s*\`/g;
  if (suspicious.test(data)) {
    issues++;
    if (report) console.log(`[issue] ${file}`);
  }
  if (apply) {
    // Basic cleanup: remove U+FFFD and normalize some broken markers
    data = data.replace(/�+/g, '')
               .replace(/\?\?\{/g, '<u>')
               .replace(/\}\?\?/g, '</u>');
    if (data !== before) {
      fs.writeFileSync(file, data, 'utf8');
      modified++;
      console.log(`[fixed] ${file}`);
    }
  }
}

for (const t of targets) if (fs.existsSync(t)) walk(t);
console.log(`Scanned ${scanned} files. Issues: ${issues}. ${apply ? 'Modified: ' + modified : 'Run with --apply-basic to apply basic fixes.'}`);

