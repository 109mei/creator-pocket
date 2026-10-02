import test from 'node:test';
import assert from 'node:assert/strict';

const rec = await import('../src/recommendations.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

test('recommendations expose the agreed local-only API', () => {
  for (const name of ['createRecommendationState', 'loadRecommendationState', 'saveRecommendationState', 'resetRecommendationState', 'setInterests', 'setVideoLiked', 'isVideoLiked', 'rankRecommendations', 'videoGenres', 'canonicalVideoKey']) {
    assert.equal(typeof rec[name], 'function', name);
  }
  assert.equal(rec.RECOMMENDATIONS_KEY, 'creator-pocket-recommendations-v1');
});

const video = (n, genres = [], channelId) => ({url:`https://www.youtube.com/watch?v=${String(n).padStart(11,'a')}`,genres,...(channelId ? {channelId} : {})});
const defaults = () => ({version:1,genres:[],liked:[],onboarded:false});
const picked = genres => rec.setInterests(rec.createRecommendationState(),genres);
const storage = () => {
  const values = new Map();
  return {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
};

test('canonical identity merges YouTube variants and X username variants', () => {
  assert.equal(rec.canonicalVideoKey('https://youtu.be/abcdefghijk?si=secret'),'youtube:abcdefghijk');
  assert.equal(rec.canonicalVideoKey({url:'https://youtube.com/shorts/abcdefghijk'}),'youtube:abcdefghijk');
  assert.equal(rec.canonicalVideoKey('https://twitter.com/oldname/status/12345'),'x:12345');
  assert.equal(rec.canonicalVideoKey('https://x.com/newname/status/12345'),'x:12345');
  assert.equal(rec.canonicalVideoKey('javascript:alert(1)'),null);
});

test('default preferences distinguish no setup from consciously skipped setup', () => {
  assert.deepEqual(rec.createRecommendationState(),defaults());
  assert.deepEqual(rec.setInterests(rec.createRecommendationState(),[]),{...defaults(),onboarded:true});
});

test('selected genres are validated and deduplicated without mutating prior state', () => {
  const original = rec.createRecommendationState();
  const changed = rec.setInterests(original,['gaming','science','gaming','private-health','<script>']);
  assert.deepEqual(changed.genres,['gaming','science']);
  assert.equal(changed.onboarded,true);
  assert.deepEqual(original,defaults());
  assert.equal(new Set(rec.GENRES.map(g=>g.id)).size,rec.GENRES.length);
  assert.ok(rec.GENRES.every(g=>typeof g.label==='string' && g.label.length));
});

test('corrupt, oversized, incompatible or untrusted preferences fail closed', () => {
  for (const raw of ['{',null,[],1,{version:99,genres:['gaming']},' '.repeat(100001)]) {
    assert.deepEqual(rec.createRecommendationState(raw),defaults());
  }
  assert.deepEqual(rec.createRecommendationState(JSON.stringify({version:1,genres:['music','fake'],liked:['https://evil.example'],onboarded:'yes',health:'secret',seen:['private']})),{...defaults(),genres:['music']});
});

test('explicit content genres take precedence over channel classification', () => {
  const v = {...video(1,['gaming','gaming','unknown']),channelId:'UCLA_DiR1FfKNvjuUpBHmylQ'};
  assert.deepEqual(rec.videoGenres(v),['gaming']);
  assert.deepEqual(rec.videoGenres({...v,genres:[],channelGenres:['music']}),['music']);
  assert.deepEqual(rec.videoGenres({...v,genres:[],channelGenres:[],channelTags:['technology']}),['technology']);
});

test('known channel IDs classify honestly while names, titles and Shorts links cannot invent genres', () => {
  assert.deepEqual(rec.videoGenres({...video(1),channelId:'UCLA_DiR1FfKNvjuUpBHmylQ'}),['space','science']);
  assert.deepEqual(rec.videoGenres({...video(2),title:'Music gaming NASA nature',channelTitle:'NASA'}),[]);
  assert.deepEqual(rec.videoGenres({url:'https://youtube.com/shorts/abcdefghijk'}),[]);
});

test('likes are canonical, idempotent, reversible and immutable', () => {
  const original = picked(['music']);
  const v = {...video(1,['gaming']),title:'not persisted'};
  const liked = rec.setVideoLiked(original,v,true);
  assert.deepEqual(liked.liked,[{url:v.url,genres:['gaming']}]);
  assert.equal(rec.isVideoLiked(liked,v),true);
  assert.equal(rec.isVideoLiked(liked,'https://youtu.be/'+String(1).padStart(11,'a')),true);
  assert.deepEqual(rec.setVideoLiked(liked,v,true),liked);
  assert.deepEqual(rec.setVideoLiked(liked,v,false),original);
  assert.deepEqual(original.liked,[]);
  assert.deepEqual(rec.setVideoLiked(original,{url:'https://invalid.example'},true),original);
});

test('restored likes discard extra data and keep at most the latest 100 distinct canonical identities', () => {
  const raw = {version:1,genres:['science'],onboarded:true,liked:Array.from({length:130},(_,n)=>({...video(n,['science','private']),secret:'discard'}))};
  raw.liked.push({...video(129,['music']),url:'https://youtu.be/'+String(129).padStart(11,'a')});
  const restored = rec.createRecommendationState(JSON.stringify(raw));
  assert.equal(restored.liked.length,100);
  assert.equal(new Set(restored.liked.map(rec.canonicalVideoKey)).size,100);
  assert.deepEqual(restored.liked.at(-1),{url:video(129).url,genres:['music']});
  assert.ok(restored.liked.every(v=>Object.keys(v).sort().join(',')==='genres,url'));
});

test('local storage roundtrip is bounded and reset removes only recommendation data', () => {
  const s = storage();
  s.setItem('unrelated','keep');
  const preferences = rec.setVideoLiked(picked(['gaming']),video(1,['gaming']),true);
  assert.equal(rec.saveRecommendationState(s,preferences),true);
  assert.deepEqual(rec.loadRecommendationState(s),preferences);
  assert.ok(s.getItem(rec.RECOMMENDATIONS_KEY).length < 100000);
  assert.deepEqual(rec.resetRecommendationState(s),defaults());
  assert.equal(s.getItem(rec.RECOMMENDATIONS_KEY),null);
  assert.equal(s.getItem('unrelated'),'keep');
});

test('blocked or unavailable storage never stops local use', () => {
  const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('quota');},removeItem(){throw Error('blocked');}};
  assert.deepEqual(rec.loadRecommendationState(blocked),defaults());
  assert.equal(rec.saveRecommendationState(blocked,picked(['gaming'])),false);
  assert.deepEqual(rec.resetRecommendationState(blocked),defaults());
  assert.deepEqual(rec.loadRecommendationState(undefined),defaults());
  assert.equal(rec.saveRecommendationState(undefined,defaults()),false);
});

test('empty queue remains empty and invalid entries are ignored', () => {
  assert.deepEqual(rec.rankRecommendations([],defaults()),[]);
  assert.deepEqual(rec.rankRecommendations([null,{}, {url:'https://evil.example'}],defaults()),[]);
});

test('initial selected genres rank matching videos first with deterministic stable ties', () => {
  const entries = [video(1,['music']),video(2,['gaming']),video(3,['gaming']),video(4,['nature'])];
  const before = structuredClone(entries);
  const ranked = rec.rankRecommendations(entries,picked(['gaming']));
  assert.equal(ranked[0],entries[1]);
  assert.equal(ranked[1],entries[2]);
  assert.deepEqual(rec.rankRecommendations(entries,picked(['gaming'])),ranked);
  assert.deepEqual(entries,before);
});

test('unmatched interests retain a usable finite inventory rather than inventing results', () => {
  const entries = [video(1,['space']),video(2,['space'])];
  assert.deepEqual(rec.rankRecommendations(entries,picked(['gaming'])),entries);
  assert.deepEqual(rec.rankRecommendations(entries,defaults()),entries);
});

test('a known different genre is explored once every fifth slot when inventory supports it', () => {
  const matches = Array.from({length:10},(_,n)=>video(n,['gaming']));
  const alternatives = [video(20,['music']),video(21,['nature'])];
  const ranked = rec.rankRecommendations([...matches,...alternatives],picked(['gaming']));
  assert.equal(ranked[4],alternatives[0]);
  assert.equal(ranked[9],alternatives[1]);
  assert.ok(ranked.slice(0,4).every(v=>v.genres.includes('gaming')));
  assert.equal(new Set(ranked.map(v=>v.url)).size,12);
});

test('unclassified URLs are not falsely treated as different-genre exploration', () => {
  const entries = [...Array.from({length:7},(_,n)=>video(n,['gaming'])),video(20)];
  const ranked = rec.rankRecommendations(entries,picked(['gaming']));
  assert.equal(ranked[4].genres[0],'gaming');
  assert.equal(ranked.at(-1),entries.at(-1));
});

test('likes rerank related content, including when the liked item has left the current queue', () => {
  const entries = [video(1,['music']),video(2,['gaming']),video(3,['nature'])];
  const preferences = rec.setVideoLiked(rec.createRecommendationState(),video(90,['gaming']),true);
  assert.equal(rec.rankRecommendations(entries,preferences)[0],entries[1]);
  assert.deepEqual(rec.rankRecommendations(entries,rec.setVideoLiked(preferences,video(90),false)),entries);
});

test('like evidence is bounded so many likes cannot overpower explicit selected interests', () => {
  let preferences = picked(['gaming']);
  for(let n=0;n<100;n++) preferences = rec.setVideoLiked(preferences,video(100+n,['music']),true);
  const entries = [video(1,['music']),video(2,['gaming'])];
  assert.equal(rec.rankRecommendations(entries,preferences)[0],entries[1]);
});

test('session-only seen penalty favors a fresh item without persisting watch history', () => {
  const entries = [video(1,['gaming']),video(2,['gaming'])];
  const preferences = picked(['gaming']);
  assert.equal(rec.rankRecommendations(entries,preferences,{seenKeys:[rec.canonicalVideoKey(entries[0])]})[0],entries[1]);
  assert.deepEqual(Object.keys(preferences).sort(),['genres','liked','onboarded','version']);
});

test('ranking reduces consecutive repetition of a source among similarly relevant videos', () => {
  const entries = [video(1,['gaming'],'channel-a'),video(2,['gaming'],'channel-a'),video(3,['gaming'],'channel-b')];
  const ranked = rec.rankRecommendations(entries,picked(['gaming']));
  assert.deepEqual(ranked,[entries[0],entries[2],entries[1]]);
});

test('reranking preserves active item and the available previous queue prefix', () => {
  const entries = [video(1,['music']),video(2,['nature']),video(3,['gaming']),video(4,['gaming'])];
  const previousQueue = [entries[1].url,entries[0].url,entries[3].url,entries[2].url];
  const result = rec.rankRecommendations(entries,picked(['gaming']),{activeKey:entries[0].url,activeIndex:1,previousQueue});
  assert.equal(result[0],entries[1]);
  assert.equal(result[1],entries[0]);
  assert.equal(result[2],entries[2]);
  assert.equal(new Set(result).size,4);
});

test('active canonical key is supported and missing active entries degrade safely', () => {
  const entries = [video(1,['music']),video(2,['gaming']),video(3,['gaming'])];
  assert.equal(rec.rankRecommendations(entries,picked(['gaming']),{activeKey:rec.canonicalVideoKey(entries[0]),activeIndex:0})[0],entries[0]);
  assert.equal(rec.rankRecommendations(entries,picked(['gaming']),{activeKey:'youtube:not-present',activeIndex:100})[0],entries[1]);
});

test('ranking deduplicates canonical identities and respects the existing sixty-item capacity', () => {
  const first = video(1,['music']);
  const duplicate = {...video(1,['gaming']),url:'https://youtu.be/'+String(1).padStart(11,'a')};
  assert.deepEqual(rec.rankRecommendations([first,duplicate],picked(['gaming'])),[first]);
  assert.equal(rec.rankRecommendations(Array.from({length:80},(_,n)=>video(n)),defaults()).length,60);
});

test('an explicit active index is respected when fresh input ordering has changed', () => {
  const entries = [video(1,['gaming']),video(2,['music']),video(3,['nature'])];
  const ranked = rec.rankRecommendations(entries,picked(['gaming']),{activeKey:entries[2].url,activeIndex:0});
  assert.equal(ranked[0],entries[2]);
});

test('null ranking options are harmless and channel genre tags support singular metadata', () => {
  const entry = {...video(1),genre:'food'};
  assert.deepEqual(rec.videoGenres(entry),['food']);
  assert.deepEqual(rec.rankRecommendations([entry],defaults(),null),[entry]);
});
