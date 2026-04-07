// sync-www.mjs — copies web assets from project root → www/ before cap sync
// Usage: node sync-www.mjs   OR via npm run build
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

mkdirSync('www/icons', { recursive: true });

// Core files
for (const f of ['index.html', 'manifest.webmanifest', 'service-worker.js']) {
  copyFileSync(f, `www/${f}`);
  console.log(`copied ${f} → www/${f}`);
}

// Icons
for (const f of readdirSync('icons')) {
  if (f.endsWith('.png')) {
    copyFileSync(`icons/${f}`, `www/icons/${f}`);
    console.log(`copied icons/${f} → www/icons/${f}`);
  }
}
console.log('sync-www done.');
