import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, DEPLOYED_FEED_URL, MAX_BYTES, parseFeed, selectPrevious, refreshFeed, fetchText } from '../scripts/lib/youtube-feed.mjs';
const channel = CHANNELS[0];
const now = '2026-10-02T13:45:00.000Z';
const earlier = '2026-10-01T13:45:00.000Z';
const videoId = 'FCCJRyhxZSo';
function entry({ id = videoId, title = 'Science &amp; space', channelId = channel.id, published = earlier, url = `https://www.youtube.com/watch?v=${id}` } = {}) {
  return `<entry><yt:videoId>${id}</yt:videoId><yt:channelId>${channelId}</yt:channelId><title>${title}</title><published>${published}</published><updated>${published}</updated><link rel="alternate" href="${url}"/></entry>`;
}
function xml(entries = entry(), c = channel) {
  return `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>${c.id.slice(2)}</yt:channelId><link rel="alternate" href="${c.url}"/>${entries}</feed>`;
}
function previous() {
  return { version: 1, checkedAt: earlier, updatedAt: earlier, channels: CHANNELS.map(c => ({ ...c, status: 'ok', lastSuccessAt: earlier, error: null })), videos: [{ id: videoId, channelId: channel.id, channelTitle: channel.title, title: 'Old title', publishedAt: earlier, updatedAt: earlier, url: `https://www.youtube.com/watch?v=${videoId}` }] };
}
test('parses official Atom metadata and canonicalizes Shorts without adding media requests', () => {
  const videos = parseFeed(xml(entry({ url: `https://www.youtube.com/shorts/${videoId}` })), channel);
  assert.deepEqual(videos, [{ id: videoId, channelId: channel.id, channelTitle: channel.title, genres: ['space', 'science'], title: 'Science & space', publishedAt: earlier, updatedAt: earlier, url: `https://www.youtube.com/watch?v=${videoId}` }]);
});
test('rejects malformed XML, DTDs, entities, wrong namespace and wrong channel', () => {
  for (const body of [xml().replace('</entry>', ''), '<!DOCTYPE feed [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + xml(), xml().replace('Science &amp; space', '&unrecognized;'), xml().replace('http://www.w3.org/2005/Atom', 'https://evil.example/'), xml().replace(channel.id.slice(2), 'somethingElse'), xml().replace(channel.url, 'https://evil.example/')]) assert.throws(() => parseFeed(body, channel));
});
test('rejects invalid IDs, foreign watch URLs, HTML title markup, mismatched channels and invalid dates', () => {
  for (const change of [{ id: '../../admin' }, { url: 'https://evil.example/' }, { url: `https://www.youtube.com.evil.example/watch?v=${videoId}` }, { url: `http://www.youtube.com/watch?v=${videoId}` }, { url: `https://www.youtube.com/watch?v=XXXXXXXXXXX` }, { title: '<b>not text</b>' }, { channelId: CHANNELS[1].id }, { published: 'nonsense' }]) assert.throws(() => parseFeed(xml(entry(change)), channel));
});
test('keeps encoded markup as bounded plain text; deduplicates video IDs', () => {
  const videos = parseFeed(xml(entry({ title: '&lt;script&gt;alert(1)&lt;/script&gt;' }) + entry()), channel);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].title, '<script>alert(1)</script>');
  assert.equal(parseFeed(xml(entry({title: 'x'.repeat(800)})), channel)[0].title.length, 300);
});
test('rejects oversized inputs and unapproved channel configurations', () => {
  assert.throws(() => parseFeed(' '.repeat(MAX_BYTES + 1), channel));
  assert.throws(() => parseFeed(xml(), { ...channel, feedUrl: 'http://127.0.0.1/' }));
});
test('selects freshest per-channel last-good fallback and validates every retained video', () => {
  const old = previous();
  const fresh = previous(); fresh.channels[0].lastSuccessAt = now; fresh.updatedAt = now; fresh.videos[0].title = 'New title';
  const chosen = selectPrevious([old, fresh]);
  assert.equal(chosen.videos[0].title, 'New title');
  assert.equal(chosen.channels[0].lastSuccessAt, now);
  fresh.videos[0].url = 'https://evil.example/';
  assert.equal(selectPrevious([fresh]).videos.length, 0);
  assert.equal(selectPrevious([{ ...old, version: 999 }]).videos.length, 0);
});
test('refresh retains last good channel on failure, reports error, replaces successful snapshots', async () => {
  const result = await refreshFeed({ previous: previous(), now, fetchImpl: async url => {
    if (url === channel.feedUrl) throw new Error('server error with secret-looking text');
    const c = CHANNELS.find(x => x.feedUrl === url); return new Response(xml('', c));
  }, attempts: 1 });
  assert.equal(result.videos[0].title, 'Old title');
  assert.equal(result.channels[0].status, 'stale');
  assert.equal(result.channels[0].lastSuccessAt, earlier);
  assert.equal(result.channels[0].error, 'network_error');
  assert.equal(result.channels[1].status, 'ok');
  assert.equal(result.channels[1].lastSuccessAt, now);
  assert.equal(result.updatedAt, now);
  assert.equal(JSON.stringify(result).includes('secret-looking'), false);
});
test('total outage preserves update date; no-data failure is unavailable', async () => {
  const fetchImpl = async () => new Response('outage', { status: 503 });
  const old = await refreshFeed({ previous: previous(), now, fetchImpl, attempts: 1 });
  assert.equal(old.updatedAt, earlier); assert.equal(old.checkedAt, now);
  const empty = await refreshFeed({ now, fetchImpl, attempts: 1 });
  assert.equal(empty.updatedAt, null); assert.equal(empty.videos.length, 0);
  assert.equal(empty.channels[0].status, 'unavailable');
});
test('refresh is bounded to 30 diverse videos ordered newest first', async () => {
  const result = await refreshFeed({ now, fetchImpl: async url => {
    const c = CHANNELS.find(x => x.feedUrl === url);
    return new Response(xml(Array.from({ length: 15 }, (_, i) => entry({ id: `${CHANNELS.indexOf(c)}${String(i).padStart(10,'0')}`, channelId: c.id, published: `2026-09-${String(i+1).padStart(2,'0')}T00:00:00Z` })).join(''), c));
  }, attempts: 1 });
  assert.equal(result.videos.length, 30);
  assert.ok(result.videos.every((v, i, list) => !i || list[i - 1].publishedAt >= v.publishedAt));
  assert.equal(new Set(result.videos.map(v => v.id)).size, 30);
});
test('HTTP reads reject redirects and non-allowlisted URLs before I/O', async () => {
  let calls = 0;
  const fetchImpl = async (_, options) => { calls++; assert.equal(options.redirect, 'error'); return new Response('ok'); };
  await assert.rejects(fetchText('http://127.0.0.1/', { fetchImpl }));
  assert.equal(calls, 0);
  assert.equal(await fetchText(channel.feedUrl, { fetchImpl }), 'ok');
  assert.equal(await fetchText(DEPLOYED_FEED_URL, { fetchImpl }), 'ok');
});
test('HTTP reads enforce a streaming size limit, bounded retries, and timeout', async () => {
  await assert.rejects(fetchText(channel.feedUrl, { fetchImpl: async () => new Response('x'.repeat(MAX_BYTES + 1)), attempts: 1 }));
  let attempts = 0;
  await assert.rejects(fetchText(channel.feedUrl, { attempts: 2, retryDelayMs: 0, fetchImpl: async () => { attempts++; return new Response('unavailable', {status:503}); } }));
  assert.equal(attempts, 2);
  await assert.rejects(fetchText(channel.feedUrl, { attempts: 1, timeoutMs: 5, fetchImpl: (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason))) }));
});
test('invalid calendar dates reject the snapshot rather than silently normalizing', () => {
  for (const published of ['2026-02-30T12:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T00:00:00+24:00']) assert.throws(() => parseFeed(xml(entry({published})), channel));
});
test('corrupt newer deployed metadata cannot erase valid older bundled fallback', () => {
  const old = previous(); const corrupt = previous();
  corrupt.channels[0].lastSuccessAt = now; corrupt.videos[0].url = 'https://evil.example/';
  const chosen = selectPrevious([old, corrupt]);
  assert.equal(chosen.videos.length, 1);
  assert.equal(chosen.videos[0].title, 'Old title');
  assert.equal(chosen.channels[0].lastSuccessAt, earlier);
});
test('the fixed source pool uses eight verified channels with canonical genre tags', () => {
  const expected = {
    UCLA_DiR1FfKNvjuUpBHmylQ: ['space', 'science'],
    UCfMIdADo6FQayQCOkLYGhrQ: ['space', 'science'],
    UCMJiPpN_09F0aWpQrgbc_qg: ['gaming'],
    UCkH3CcMfqww9RsZvPRPkAJA: ['gaming'],
    'UC-veA4H0QF3Ev4uZe9vpQrQ': ['nature'],
    'UCE40kwov-UdhGikwAowjAAQ': ['food'],
    UCu1u0lXr88VIHpdwPn3JCNg: ['art'],
    'UCZ3h7IyAMbrVgvmxTdj-rpA': ['music']
  };
  assert.deepEqual(Object.fromEntries(CHANNELS.map(c => [c.id, c.genres])), expected);
  for (const c of CHANNELS) {
    assert.equal(c.url, `https://www.youtube.com/channel/${c.id}`);
    assert.equal(c.feedUrl, `https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`);
  }
});
test('refresh preserves six genre groups even when the quieter sources are older', async () => {
  const result = await refreshFeed({ now, fetchImpl: async url => {
    const c = CHANNELS.find(x => x.feedUrl === url), index = CHANNELS.indexOf(c);
    return new Response(xml(Array.from({ length: 15 }, (_, i) => entry({
      id: `${index}${String(i).padStart(10, '0')}`, channelId: c.id,
      published: `2026-${String(index < 2 ? 9 : 5).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}T00:00:00Z`
    })).join(''), c));
  }, attempts: 1 });
  assert.equal(result.videos.length, 30);
  const counts = Object.fromEntries(['space', 'gaming', 'nature', 'food', 'art', 'music'].map(genre => [genre, result.videos.filter(v => v.genres?.[0] === genre).length]));
  assert.deepEqual(counts, { space: 5, gaming: 5, nature: 5, food: 5, art: 5, music: 5 });
  assert.ok(result.videos.every((v, i, list) => !i || list[i - 1].publishedAt >= v.publishedAt));
  for (const genre of ['nature', 'food', 'art', 'music']) {
    assert.deepEqual(result.videos.filter(v => v.genres[0] === genre).map(v => v.publishedAt.slice(8, 10)), ['15', '14', '13', '12', '11']);
  }
});
test('legacy last-good snapshots regain canonical tags and cannot override the source catalog', () => {
  const old = previous();
  old.channels[0].genres = ['food', 'unknown'];
  old.videos[0].genres = ['gaming'];
  const restored = selectPrevious([old]);
  assert.deepEqual(restored.channels[0].genres, ['space', 'science']);
  assert.deepEqual(restored.videos[0].genres, ['space', 'science']);
  assert.equal(restored.videos[0].title, 'Old title');
  assert.equal(restored.channels[0].lastSuccessAt, earlier);
});
test('unused genre slots are filled without exceeding 30 and a total outage preserves the diverse snapshot', async () => {
  const snapshot = await refreshFeed({ now: earlier, fetchImpl: async url => {
    const c = CHANNELS.find(x => x.feedUrl === url), index = CHANNELS.indexOf(c);
    const count = index === 0 ? 40 : [1, 3].includes(index) ? 0 : 1;
    return new Response(xml(Array.from({ length: count }, (_, i) => entry({
      id: `${index}${String(i).padStart(10, '0')}`, channelId: c.id
    })).join(''), c));
  }, attempts: 1 });
  assert.equal(snapshot.videos.length, 30);
  assert.equal(snapshot.videos.filter(v => v.genres[0] === 'space').length, 25);
  for (const genre of ['gaming', 'nature', 'food', 'art', 'music']) assert.equal(snapshot.videos.filter(v => v.genres[0] === genre).length, 1);
  const failed = await refreshFeed({ previous: snapshot, now, attempts: 1, fetchImpl: async () => new Response('outage', { status: 503 }) });
  assert.deepEqual(failed.videos, snapshot.videos);
  assert.equal(failed.updatedAt, earlier);
  assert.equal(failed.checkedAt, now);
  assert.ok(failed.channels.every(c => c.lastSuccessAt === earlier));
  assert.equal(failed.channels[2].status, 'stale');
  assert.equal(failed.channels[2].error, 'http_error');
});
