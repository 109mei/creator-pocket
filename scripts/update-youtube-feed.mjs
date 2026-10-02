import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DEPLOYED_FEED_URL, MAX_BYTES, fetchText, selectPrevious, refreshFeed } from './lib/youtube-feed.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'public/data/youtube-videos.json');
const candidates = [];
try {
  const raw = await readFile(output, 'utf8');
  if (Buffer.byteLength(raw) <= MAX_BYTES) candidates.push(JSON.parse(raw));
} catch { console.warn('Bundled feed unavailable; starting with an empty fallback.'); }
try { candidates.push(JSON.parse(await fetchText(DEPLOYED_FEED_URL, { attempts: 1 }))); }
catch { console.warn('Previous deployed feed unavailable; using the bundled fallback.'); }
const result = await refreshFeed({ previous: selectPrevious(candidates) });
await mkdir(dirname(output), { recursive: true });
const temporary = `${output}.tmp`;
await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
await rename(temporary, output);
for (const channel of result.channels) console.log(`${channel.title}: ${channel.status}${channel.error ? ` (${channel.error})` : ''}`);
console.log(`Prepared ${result.videos.length} public video records; checked ${result.checkedAt}.`);
