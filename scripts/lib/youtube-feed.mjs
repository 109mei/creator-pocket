import { JSDOM } from 'jsdom';
export const CHANNELS = Object.freeze([
  { id: 'UCLA_DiR1FfKNvjuUpBHmylQ', title: 'NASA', genres: ['space', 'science'] },
  { id: 'UCfMIdADo6FQayQCOkLYGhrQ', title: 'JAXA | 宇宙航空研究開発機構', genres: ['space', 'science'] },
  { id: 'UCMJiPpN_09F0aWpQrgbc_qg', title: 'キヨ。', genres: ['gaming'] },
  { id: 'UCkH3CcMfqww9RsZvPRPkAJA', title: 'Nintendo 公式チャンネル', genres: ['gaming'] },
  { id: 'UC-veA4H0QF3Ev4uZe9vpQrQ', title: '大阪・海遊館 Osaka Aquarium Kaiyukan', genres: ['nature'] },
  { id: 'UCE40kwov-UdhGikwAowjAAQ', title: 'Kurashiru [クラシル]', genres: ['food'] },
  { id: 'UCu1u0lXr88VIHpdwPn3JCNg', title: '創作折り紙 カミキィkamikey origami', genres: ['art'] },
  { id: 'UCZ3h7IyAMbrVgvmxTdj-rpA', title: 'よみぃ', genres: ['music'] }
].map(channel => Object.freeze({ ...channel, genres: Object.freeze(channel.genres), url: `https://www.youtube.com/channel/${channel.id}`, feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}` })));
export const DEPLOYED_FEED_URL = 'https://109mei.github.io/creator-pocket/data/youtube-videos.json';
export const MAX_BYTES = 524288;
const MAX_VIDEOS = 30;
const ATOM = 'http://www.w3.org/2005/Atom';
const YT = 'http://www.youtube.com/xml/schemas/2015';
const parser = new (new JSDOM('').window.DOMParser)();
const allowedUrls = new Set([...CHANNELS.map(c => c.feedUrl), DEPLOYED_FEED_URL]);
const fail = code => Object.assign(new Error(code), { code });
const children = (node, ns, name) => [...node.children].filter(child => child.namespaceURI === ns && child.localName === name);
function textField(node, ns, name) {
  const fields = children(node, ns, name);
  if (fields.length !== 1 || fields[0].children.length) throw fail('invalid_feed');
  return fields[0].textContent.trim();
}
function safeText(value) {
  if (typeof value !== 'string') throw fail('invalid_feed');
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) throw fail('invalid_feed');
  return [...text].slice(0, 300).join('');
}
function date(value) {
  if (typeof value !== 'string') return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!parts) return null;
  const [, year, month, day, hour, minute, second, offsetHour = '0', offsetMinute = '0'] = parts.map((v, i) => i ? Number(v) : v);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > days || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;
  const parsed = new Date(value);
  return Number.isFinite(+parsed) ? parsed.toISOString() : null;
}
function approvedChannel(channel) {
  const approved = CHANNELS.find(c => c.id === channel?.id);
  if (!approved || channel.feedUrl !== approved.feedUrl || channel.url !== approved.url) throw fail('invalid_feed');
  return approved;
}
function normalizeVideo(input, channel) {
  const id = input?.id;
  if (typeof id !== 'string' || !/^[\w-]{11}$/.test(id) || input.channelId !== channel.id) throw fail('invalid_feed');
  const url = `https://www.youtube.com/watch?v=${id}`;
  if (input.url !== url && input.url !== `https://www.youtube.com/shorts/${id}`) throw fail('invalid_feed');
  const publishedAt = date(input.publishedAt), updatedAt = date(input.updatedAt);
  if (!publishedAt || !updatedAt) throw fail('invalid_feed');
  return { id, channelId: channel.id, channelTitle: channel.title, genres: [...channel.genres], title: safeText(input.title), publishedAt, updatedAt, url };
}
function bounded(videos) {
  const newestFirst = (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id);
  const unique = [...new Map(videos.map(video => [video.id, video])).values()].sort(newestFirst);
  // Allocate equally across content groups, then fill unused capacity. Multiple
  // tags (space/science) belong to one bucket, not multiple quota slots. Keep
  // newest-first ordering inside each group and in the final selected snapshot.
  const groups = new Map();
  for (const video of unique) {
    const genre = CHANNELS.find(channel => channel.id === video.channelId)?.genres[0];
    if (!groups.has(genre)) groups.set(genre, []);
    groups.get(genre).push(video);
  }
  const selected = [];
  for (let round = 0; selected.length < MAX_VIDEOS; round++) {
    let added = false;
    for (const group of groups.values()) {
      if (group[round] && selected.length < MAX_VIDEOS) {
        selected.push(group[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return selected.sort(newestFirst);
}
/** Atom is untrusted input. No resource loading or script execution is enabled. */
export function parseFeed(xml, channel) {
  channel = approvedChannel(channel);
  if (typeof xml !== 'string' || Buffer.byteLength(xml, 'utf8') > MAX_BYTES) throw fail('too_large');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw fail('invalid_feed');
  const document = parser.parseFromString(xml, 'application/xml');
  const root = document.documentElement;
  if (document.querySelector('parsererror') || root.namespaceURI !== ATOM || root.localName !== 'feed') throw fail('invalid_feed');
  // YouTube currently omits the UC prefix on the feed-level ID, but not entries.
  const feedChannel = textField(root, YT, 'channelId');
  if (feedChannel !== channel.id && feedChannel !== channel.id.slice(2)) throw fail('invalid_feed');
  const links = children(root, ATOM, 'link').filter(link => link.getAttribute('rel') === 'alternate');
  if (links.length !== 1 || links[0].getAttribute('href') !== channel.url) throw fail('invalid_feed');
  const entries = children(root, ATOM, 'entry');
  if (entries.length > 100) throw fail('too_large');
  const videos = new Map();
  for (const entry of entries) {
    const alternate = children(entry, ATOM, 'link').filter(link => link.getAttribute('rel') === 'alternate');
    if (alternate.length !== 1) throw fail('invalid_feed');
    const video = normalizeVideo({
      id: textField(entry, YT, 'videoId'), channelId: textField(entry, YT, 'channelId'),
      title: textField(entry, ATOM, 'title'), publishedAt: textField(entry, ATOM, 'published'),
      updatedAt: textField(entry, ATOM, 'updated'), url: alternate[0].getAttribute('href')
    }, channel);
    if (!videos.has(video.id)) videos.set(video.id, video);
  }
  return bounded([...videos.values()]);
}
/** Validate fallback JSON; never inherit URLs, author identity, or extra fields. */
export function selectPrevious(candidates = []) {
  const valid = candidates.filter(c => c?.version === 1 && Array.isArray(c.channels) && c.channels.length <= 10 && Array.isArray(c.videos) && c.videos.length <= MAX_VIDEOS);
  const result = { version: 1, checkedAt: null, updatedAt: null, channels: [], videos: [] };
  for (const channel of CHANNELS) {
    const options = valid.map(data => {
      const record = data.channels.find(c => c?.id === channel.id);
      if (!date(record?.lastSuccessAt)) return null;
      try {
        const videos = data.videos.filter(v => v?.channelId === channel.id).map(v => normalizeVideo(v, channel));
        return { record, videos };
      } catch { return null; /* A corrupt newer candidate must not erase the older seed. */ }
    }).filter(Boolean).sort((a, b) => date(b.record.lastSuccessAt).localeCompare(date(a.record.lastSuccessAt)));
    const selected = options[0];
    const lastSuccessAt = selected ? date(selected.record.lastSuccessAt) : null;
    const videos = selected?.videos || [];
    result.channels.push({ ...channel, status: videos.length ? 'stale' : 'unavailable', lastSuccessAt, error: null });
    result.videos.push(...videos);
    if (lastSuccessAt && (!result.updatedAt || lastSuccessAt > result.updatedAt)) result.updatedAt = lastSuccessAt;
  }
  result.videos = bounded(result.videos);
  return result;
}
/** Fixed URLs only, no redirects; bounded body, time and attempts. */
export async function fetchText(url, { fetchImpl = fetch, attempts = 2, timeoutMs = 12000, retryDelayMs = 300 } = {}) {
  if (!allowedUrls.has(url)) throw fail('invalid_url');
  const tries = Math.max(1, Math.min(2, Number.isFinite(attempts) ? Math.trunc(attempts) : 2));
  for (let attempt = 0; attempt < tries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(fail('timeout')), Math.max(1, Math.min(12000, timeoutMs)));
    let reader;
    try {
      const response = await fetchImpl(url, { redirect: 'error', signal: controller.signal, headers: { Accept: url === DEPLOYED_FEED_URL ? 'application/json' : 'application/atom+xml, application/xml' } });
      if (!response.ok || response.redirected || (response.url && response.url !== url)) throw fail('http_error');
      if (Number(response.headers.get('content-length')) > MAX_BYTES) throw fail('too_large');
      if (!response.body) throw fail('invalid_feed');
      reader = response.body.getReader();
      const chunks = []; let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) throw fail('too_large');
        chunks.push(value);
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    } catch (error) {
      const code = controller.signal.aborted ? 'timeout' : ['http_error', 'too_large', 'invalid_feed'].includes(error.code) ? error.code : 'network_error';
      if (attempt === tries - 1 || code === 'too_large' || code === 'invalid_feed') throw fail(code);
    } finally {
      clearTimeout(timer);
      if (reader) { try { await reader.cancel(); } catch { /* Aborted stream. */ } }
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(1000, retryDelayMs))));
  }
}
export async function refreshFeed({ previous, now = new Date().toISOString(), ...fetchOptions } = {}) {
  const checkedAt = date(now);
  if (!checkedAt) throw fail('invalid_date');
  const old = selectPrevious([previous]);
  const results = await Promise.all(CHANNELS.map(async channel => {
    try {
      const videos = parseFeed(await fetchText(channel.feedUrl, fetchOptions), channel);
      return { channel: { ...channel, status: 'ok', lastSuccessAt: checkedAt, error: null }, videos };
    } catch (error) {
      const videos = old.videos.filter(v => v.channelId === channel.id);
      const lastSuccessAt = old.channels.find(c => c.id === channel.id)?.lastSuccessAt || null;
      const safeCode = ['http_error', 'timeout', 'invalid_feed', 'too_large', 'network_error'].includes(error.code) ? error.code : 'invalid_feed';
      return { channel: { ...channel, status: videos.length ? 'stale' : 'unavailable', lastSuccessAt, error: safeCode }, videos };
    }
  }));
  return { version: 1, checkedAt, updatedAt: results.some(r => r.channel.status === 'ok') ? checkedAt : old.updatedAt,
    channels: results.map(r => r.channel), videos: bounded(results.flatMap(r => r.videos)) };
}
