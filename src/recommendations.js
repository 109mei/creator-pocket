import { parseMediaUrl } from './media.js';

// This is a small on-device rule-based ranking system. It makes no network calls.
export const RECOMMENDATIONS_KEY = 'creator-pocket-recommendations-v1';
export const GENRES = Object.freeze([
  ['space', '宇宙'], ['science', '科学'], ['nature', '動物・自然'],
  ['technology', 'テクノロジー'], ['gaming', 'ゲーム・実況'], ['music', '音楽'],
  ['food', '料理・食べもの'], ['travel', '旅・おでかけ'], ['art', 'アート・ものづくり'],
  ['sports', 'スポーツ']
].map(([id, label]) => Object.freeze({ id, label })));
const ALLOWED_GENRES = new Set(GENRES.map(genre => genre.id));
const MAX_LIKES = 100, MAX_QUEUE = 60, MAX_STATE_LENGTH = 100000;
const SPACE_CHANNELS = new Set([
  'UCLA_DiR1FfKNvjuUpBHmylQ', 'UCfMIdADo6FQayQCOkLYGhrQ',
  'UCIBaDdAbGlFDeS33shmlD0A', 'UCryGec9PdUCLjpJW2mgCuLw'
]);
const blankState = () => ({ version: 1, genres: [], liked: [], onboarded: false });
const mediaOf = entry => parseMediaUrl(typeof entry === 'string' ? entry : entry?.url);
const validGenres = genres => [...new Set((Array.isArray(genres) ? genres : []).slice(0, 100).filter(genre => ALLOWED_GENRES.has(genre)))];

export function canonicalVideoKey(entry) {
  const media = mediaOf(entry);
  return media ? `${media.platform}:${media.id}` : null;
}

/** Tags describe public content, never the viewer. Missing metadata stays unknown. */
export function videoGenres(entry) {
  if (!entry || typeof entry !== 'object') return [];
  for (const source of [entry.genres, [entry.genre], entry.channelGenres, entry.channelTags]) {
    const genres = validGenres(source);
    if (genres.length) return genres;
  }
  return SPACE_CHANNELS.has(entry.channelId) ? ['space', 'science'] : [];
}

/** Normalize untrusted localStorage data, retaining only bounded necessary fields. */
export function createRecommendationState(raw) {
  try {
    if (typeof raw === 'string') {
      if (raw.length > MAX_STATE_LENGTH) return blankState();
      raw = JSON.parse(raw);
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) return blankState();
    const likes = new Map();
    const candidates = Array.isArray(raw.liked) ? raw.liked.slice(-1000) : [];
    for (const entry of candidates) {
      const media = mediaOf(entry);
      if (!media) continue;
      const key = `${media.platform}:${media.id}`;
      likes.delete(key);
      likes.set(key, { url: media.url, genres: validGenres(entry?.genres) });
    }
    return { version: 1, genres: validGenres(raw.genres), liked: [...likes.values()].slice(-MAX_LIKES), onboarded: raw.onboarded === true };
  } catch {
    return blankState();
  }
}

export function loadRecommendationState(storage) {
  try { return createRecommendationState(storage.getItem(RECOMMENDATIONS_KEY)); }
  catch { return blankState(); }
}

export function saveRecommendationState(storage, state) {
  try {
    storage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(createRecommendationState(state)));
    return true;
  } catch { return false; }
}

export function resetRecommendationState(storage) {
  try { storage?.removeItem(RECOMMENDATIONS_KEY); } catch { /* Memory-only reset still works. */ }
  return blankState();
}

export function setInterests(state, genres) {
  return { ...createRecommendationState(state), genres: validGenres(genres), onboarded: true };
}

export function isVideoLiked(state, entry) {
  const key = canonicalVideoKey(entry);
  return Boolean(key && createRecommendationState(state).liked.some(like => canonicalVideoKey(like) === key));
}

export function setVideoLiked(state, entry, liked = true) {
  const next = createRecommendationState(state), media = mediaOf(entry);
  if (!media) return next;
  const key = canonicalVideoKey(entry), prior = next.liked.findIndex(like => canonicalVideoKey(like) === key);
  if (liked) {
    // Repeated taps requesting a like neither toggle it off nor multiply evidence.
    if (prior < 0) next.liked = [...next.liked, { url: media.url, genres: videoGenres(entry) }].slice(-MAX_LIKES);
  } else if (prior >= 0) {
    next.liked = next.liked.filter(like => canonicalVideoKey(like) !== key);
  }
  return next;
}

function optionKey(value) {
  if (typeof value === 'string' && /^(?:youtube:[A-Za-z0-9_-]{11}|x:\d{1,20})$/.test(value)) return value;
  return canonicalVideoKey(value);
}

/**
 * Return original entry objects, deduplicated by provider identity, without mutating input.
 * Every fifth available slot explores a known genre outside selected/liked genres.
 * The ratio is best-effort: a finite queue cannot manufacture missing genres.
 * activeKey accepts a canonical key or URL; previousQueue accepts URLs or entries.
 * A supplied active key locks the available previous prefix through the current video.
 * Optional seenKeys is session-only input; no watch history is stored by this module.
 */
export function rankRecommendations(entries, state, options = {}) {
  options = options && typeof options === 'object' ? options : {};
  const preferences = createRecommendationState(state), unique = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const key = canonicalVideoKey(entry);
    if (!key || unique.has(key)) continue;
    unique.set(key, { entry, key, genres: videoGenres(entry), position: unique.size });
    if (unique.size === MAX_QUEUE) break;
  }
  const candidates = [...unique.values()], selected = new Set(preferences.genres);
  const likedKeys = new Set(), evidence = new Map();
  for (const like of preferences.liked) {
    likedKeys.add(canonicalVideoKey(like));
    for (const genre of like.genres) evidence.set(genre, Math.min(5, (evidence.get(genre) || 0) + 1));
  }
  const preferred = new Set([...selected, ...evidence.keys()]);
  const seen = new Set((Array.isArray(options.seenKeys) ? options.seenKeys : []).slice(-200).map(optionKey).filter(Boolean));
  for (const candidate of candidates) {
    const matches = candidate.genres.filter(genre => selected.has(genre)).length;
    const affinity = Math.min(40, candidate.genres.reduce((total, genre) => total + (evidence.get(genre) || 0) * 8, 0));
    candidate.score = (matches ? 100 + Math.min(20, (matches - 1) * 10) : 0) + affinity + (likedKeys.has(candidate.key) ? 3 : 0) - (seen.has(candidate.key) ? 200 : 0);
    candidate.exploration = preferred.size > 0 && candidate.genres.length > 0 && !candidate.genres.some(genre => preferred.has(genre));
  }
  const ranked = [], activeKey = optionKey(options.activeKey), active = unique.get(activeKey);
  if (active) {
    const previous = Array.isArray(options.previousQueue) ? options.previousQueue : candidates.map(candidate => candidate.entry);
    const actualIndex = previous.findIndex(entry => optionKey(entry) === activeKey);
    const wantedIndex = Number.isInteger(options.activeIndex) && options.activeIndex >= 0 ? Math.min(options.activeIndex, MAX_QUEUE - 1) : actualIndex;
    const prefixEnd = wantedIndex;
    const locked = new Set();
    for (const entry of previous.slice(0, Math.max(0, prefixEnd))) {
      const candidate = unique.get(optionKey(entry));
      if (!candidate || candidate.key === activeKey || locked.has(candidate.key)) continue;
      ranked.push(candidate);
      locked.add(candidate.key);
    }
    ranked.push(active);
  }
  const lockedKeys = new Set(ranked.map(candidate => candidate.key));
  const remaining = candidates.filter(candidate => !lockedKeys.has(candidate.key));
  while (remaining.length) {
    const previous = ranked.at(-1), explorationSlot = (ranked.length + 1) % 5 === 0;
    const alternatives = explorationSlot ? remaining.filter(candidate => candidate.exploration) : [];
    const pool = alternatives.length ? alternatives : remaining;
    let best = pool[0], bestScore = -Infinity;
    for (const candidate of pool) {
      const sameSource = previous?.entry?.channelId && previous.entry.channelId === candidate.entry?.channelId;
      const sameGenre = previous?.genres?.length && candidate.genres.some(genre => previous.genres.includes(genre));
      const score = candidate.score - (sameSource ? 20 : 0) - (sameGenre ? 4 : 0);
      if (score > bestScore || (score === bestScore && candidate.position < best.position)) {
        best = candidate;
        bestScore = score;
      }
    }
    ranked.push(best);
    remaining.splice(remaining.indexOf(best), 1);
  }
  return ranked.map(candidate => candidate.entry);
}
