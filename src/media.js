export const SEED_MEDIA=[{url:'https://www.youtube.com/watch?v=I7v_xuCDwnM',title:'火星の岩に残る、不思議なサイン',credit:'NASA / JPL-Caltech',source:'https://science.nasa.gov/resource/signs-of-ancient-life-on-mars-heres-what-we-see-in-this-intriguing-rock-shorts/'},{url:'https://www.youtube.com/watch?v=AdZ4M8SkYBk',title:'宇宙望遠鏡の、大きな日よけ',credit:'NASA / Webb',source:'https://science.nasa.gov/mission/webb/webbs-sunshield/'},{url:'https://x.com/SpaceX/status/1732824684683784516',title:'夜明けのスターシップ',credit:'SpaceX · X公式埋め込み例',source:'https://publish.x.com/'}];
export function parseMediaUrl(raw){
 if(typeof raw!=='string'||raw.length>2048||/[<>\u0000-\u001f]/.test(raw))return null;
 try{const u=new URL(raw.trim());if(u.protocol!=='https:'||u.username||u.password||u.port)return null;const h=u.hostname.toLowerCase();let id;
 if(['youtube.com','www.youtube.com','m.youtube.com'].includes(h)){if(u.pathname==='/watch')id=u.searchParams.get('v');else id=u.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];}
 else if(h==='youtu.be')id=u.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
 if(id&&/^[A-Za-z0-9_-]{11}$/.test(id))return {platform:'youtube',id,url:`https://www.youtube.com/watch?v=${id}`};
 if(['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com'].includes(h)){const match=u.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,20})(?:\/video\/\d+)?\/?$/);if(match)return {platform:'x',id:match[2],url:`https://x.com/${match[1]}/status/${match[2]}`};}
 return null;
 }catch{return null;}
}
export function restoreQueue(raw){try{const arr=typeof raw==='string'?JSON.parse(raw):raw;if(!Array.isArray(arr))return [];const seen=new Set();return arr.map(parseMediaUrl).filter(m=>{if(!m)return false;const key=`${m.platform}:${m.id}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,30).map(m=>m.url);}catch{return [];}}
export function youtubeEmbedUrl(id,origin){if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Error('Invalid video ID');const u=new URL(`https://www.youtube-nocookie.com/embed/${id}`);u.search=new URLSearchParams({playsinline:'1',autoplay:'0',enablejsapi:'1',origin}).toString();return u.href;}
