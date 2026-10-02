const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const FORMATS=Object.freeze({short:{name:'ショート',label:'動きで伝える',time:2,factor:1.6,icon:'▶'},note:{name:'ひとこと',label:'言葉で伝える',time:1,factor:.8,icon:'✎'}});
export const EDITS=Object.freeze({natural:{name:'そのまま',label:'余白も味に',time:0,craft:4,icon:'☀'},captions:{name:'字幕で工夫',label:'伝わりやすく',time:1,craft:12,icon:'Aa'},cinematic:{name:'じっくり編集',label:'一本の作品に',time:2,craft:20,icon:'✦'}});
export const GEAR=Object.freeze({camera:{name:'小さなカメラ',description:'作品の完成度 +5 / Lv',price:160,max:2,icon:'camera'},lamp:{name:'やさしいライト',description:'制作の元気消費 −5 / Lv',price:140,max:2,icon:'lamp'},desk:{name:'編集デスク',description:'一日の制作時間 3 → 4',price:200,max:1,icon:'desk'}});
const IDEAS=[
{id:'coffee',topic:'cozy',title:'朝のコーヒー',caption:'湯気が消えるまで、今日はゆっくり。',tag:'暮らし',art:'coffee',color:'#f2b89d'},
{id:'plant',topic:'cozy',title:'窓辺の新しい葉',caption:'小さな変化を見つけた朝。🌱',tag:'暮らし',art:'plant',color:'#b9d5b0'},
{id:'desk',topic:'craft',title:'机の上を整える',caption:'好きなものだけ、手が届く場所に。',tag:'ものづくり',art:'desk',color:'#c4bce9'},
{id:'moon',topic:'wonder',title:'月を見つけた帰り道',caption:'いつもの道に、ちょっと違う空。',tag:'発見',art:'moon',color:'#a9bad6'},
{id:'toast',topic:'cozy',title:'しあわせのトースト',caption:'焼きすぎたところも、今日の味。',tag:'暮らし',art:'toast',color:'#ecd192'},
{id:'game',topic:'play',title:'指先サイズの冒険',caption:'一歩ずつ。それだけで、遠くへ行ける。',tag:'遊び',art:'game',color:'#b7d6d0'},
{id:'draw',topic:'craft',title:'一筆から生まれる顔',caption:'うまくなくても、描いたぶんだけ自分らしい。',tag:'ものづくり',art:'draw',color:'#e7b9c8'},
{id:'cat',topic:'play',title:'猫と空き箱',caption:'高いおもちゃより、この箱らしい。',tag:'遊び',art:'cat',color:'#d0c4ad'},
{id:'rain',topic:'wonder',title:'雨粒の小さな世界',caption:'窓の向こうに、もうひとつの街。',tag:'発見',art:'rain',color:'#abbfd8'}
];
const BRIEFS=[
{title:'ほっとする朝を届けよう',topic:'cozy',format:'short',name:'朝のひと息',text:'今日は、日常の小さな幸せが届きそう。',mood:'☀',ideas:['coffee','draw','moon']},
{title:'手づくりの過程が見たい',topic:'craft',format:'short',name:'作る時間',text:'完成品より、どうやって作ったかが気になる日。',mood:'✂',ideas:['draw','coffee','game']},
{title:'思わず笑うひとことを',topic:'play',format:'note',name:'ちょっと笑って',text:'肩の力が抜ける、短い言葉がぴったり。',mood:'☺',ideas:['cat','desk','toast']},
{title:'いつもの景色を新しく',topic:'wonder',format:'short',name:'小さな発見',text:'見過ごしていた美しさを、映像で見せて。',mood:'✧',ideas:['rain','plant','game']},
{title:'あなたらしい暮らしの話',topic:'cozy',format:'note',name:'となりの生活',text:'気取らない言葉で、身近なものの話を。',mood:'⌂',ideas:['plant','moon','desk']},
{title:'試してみたくなる工夫を',topic:'craft',format:'short',name:'ひらめきメモ',text:'真似できる小さな工夫が、誰かを助けそう。',mood:'✎',ideas:['desk','toast','cat']},
{title:'一週間の終わりに遊ぼう',topic:'play',format:'short',name:'週末の寄り道',text:'難しいことは忘れて、遊び心のある一本を。',mood:'♧',ideas:['game','draw','moon']}
];
export function initialState(){return {version:1,day:1,week:1,phase:'planning',followers:240,coins:120,energy:80,trust:70,gear:{camera:0,lamp:0,desk:0},posts:[],recentTopics:[],lastResult:null,weekStart:{followers:240,coins:120,posts:0},totalPosts:0};}
export function getBrief(s){return BRIEFS[(s.day-1+(s.week-1)*2)%7];}
export function getIdeas(s){return getBrief(s).ideas.map(id=>IDEAS.find(x=>x.id===id));}
export function preview(s,d){
 const idea=getIdeas(s).find(x=>x.id===d?.ideaId),format=Object.hasOwn(FORMATS,d?.format)?FORMATS[d.format]:null,edit=Object.hasOwn(EDITS,d?.edit)?EDITS[d.edit]:null;
 if(!idea||!format||!edit)return {valid:false,error:'アイデア・形式・仕上げを選んでね。',score:0,reasons:[]};
 const brief=getBrief(s),time=format.time+edit.time,budget=3+s.gear.desk;
 const energy=Math.max(5,8+format.time*6+edit.time*7-s.gear.lamp*5);
 const fit=idea.topic===brief.topic?28:0,formatFit=d.format===brief.format?8:0;
 const repetition=s.recentTopics.at(-1)===idea.topic?18:0,fatigue=s.energy<30?15:0;
 const score=clamp(20+fit+formatFit+edit.craft+s.gear.camera*5-repetition-fatigue,10,100);
 const followers=Math.round(score*format.factor*(.8+s.trust/200)),coins=25+Math.round(score*.55),trust=score>=70?3:score>=50?1:-2;
 const reasons=[fit?'今日の気分にぴったり +28':'今日は違うテーマにも挑戦',formatFit?'形式も相性よし +8':'別の伝え方で実験',`仕上げの工夫 +${edit.craft+s.gear.camera*5}`];
 if(repetition)reasons.push('同じテーマの連続 −18');if(fatigue)reasons.push('元気が少なめ −15');
 let error='';if(time>budget)error=`制作時間が${time-budget}足りないよ。仕上げを変えてみよう。`;else if(energy>s.energy)error='元気が足りないよ。軽めに作るか、今日は休もう。';else if(s.phase!=='planning')error='今日の制作は完了したよ。';
 return {valid:!error,error,score,fit,formatFit,time,budget,energy,followers,coins,trust,reasons,idea,format,edit};
}
export function publish(s,d){const p=preview(s,d);if(!p.valid)throw new Error(p.error);const n=structuredClone(s);const post={id:`${s.week}-${s.day}`,week:s.week,day:s.day,title:p.idea.title,caption:p.idea.caption,topic:p.idea.topic,art:p.idea.art,tag:p.idea.tag,color:p.idea.color,format:d.format,edit:d.edit,score:p.score,followers:p.followers,coins:p.coins,energy:p.energy,trust:p.trust,reasons:p.reasons,reach:p.followers*12,likes:Math.round(p.followers*1.8),comments:Math.max(2,Math.round(p.score/8)),fictional:true};n.posts=[post,...n.posts].slice(0,40);n.totalPosts++;n.followers=clamp(n.followers+p.followers,0,999999999);n.coins=clamp(n.coins+p.coins,0,999999999);n.energy=clamp(n.energy-p.energy,0,100);n.trust=clamp(n.trust+p.trust,0,100);n.recentTopics=[...n.recentTopics,p.idea.topic].slice(-3);n.phase='result';n.lastResult={type:'post',postId:post.id};return n;}
export function rest(s){if(s.phase!=='planning')throw new Error('今日の行動は完了したよ。');const n=structuredClone(s);const gain=Math.min(35,100-n.energy);n.energy+=gain;n.phase='result';n.lastResult={type:'rest',gain};return n;}
export function continueDay(s){if(s.phase!=='result')throw new Error('まだ今日の行動を選んでいないよ。');const n=structuredClone(s);n.lastResult=null;if(n.day===7)n.phase='summary';else {n.day++;n.phase='planning';}return n;}
export function upgrade(s,id){const item=Object.hasOwn(GEAR,id)?GEAR[id]:null;if(!item)throw new Error('その道具は見つからないよ。');if(s.gear[id]>=item.max)throw new Error('この道具は完成しているよ。');const price=item.price*(s.gear[id]+1);if(s.coins<price)throw new Error('ゲーム内コインが足りないよ。');const n=structuredClone(s);n.coins-=price;n.gear[id]++;return n;}
export function startWeek(s){if(s.phase!=='summary')throw new Error('今週はまだ続いているよ。');return {...structuredClone(s),week:s.week+1,day:1,phase:'planning',energy:Math.max(s.energy,55),weekStart:{followers:s.followers,coins:s.coins,posts:s.totalPosts}};}
export function restoreState(raw){
 try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==1||!['planning','result','summary'].includes(s.phase))return null;
 for(const [key,min,max]of [['day',1,7],['week',1,100000],['followers',0,999999999],['coins',0,999999999],['energy',0,100],['trust',0,100],['totalPosts',0,700000]])if(!Number.isInteger(s[key])||s[key]<min||s[key]>max)return null;
 for(const [id,item]of Object.entries(GEAR))if(!Number.isInteger(s.gear?.[id])||s.gear[id]<0||s.gear[id]>item.max)return null;
 if(!Array.isArray(s.posts)||s.posts.length>40||!Array.isArray(s.recentTopics)||s.recentTopics.length>3||s.recentTopics.some(t=>!['cozy','craft','play','wonder'].includes(t)))return null;
 if(!s.weekStart||!['followers','coins','posts'].every(k=>Number.isInteger(s.weekStart[k])&&s.weekStart[k]>=0&&s.weekStart[k]<=999999999))return null;
 if(s.phase==='summary'&&s.day!==7)return null;
 for(const p of s.posts){if(!p||p.fictional!==true||!IDEAS.some(i=>i.art===p.art)||!Object.hasOwn(FORMATS,p.format)||!Object.hasOwn(EDITS,p.edit)||!Array.isArray(p.reasons)||p.reasons.length>8||p.reasons.some(r=>typeof r!=='string'||r.length>150))return null;for(const k of ['id','title','caption','topic','tag','color'])if(typeof p[k]!=='string'||p[k].length>200)return null;for(const k of ['week','day','score','followers','coins','energy','trust','reach','likes','comments'])if(!Number.isFinite(p[k])||Math.abs(p[k])>999999999)return null;}
 for(const p of s.posts){if(!/^#[0-9a-fA-F]{6}$/.test(p.color))return null;for(const [k,min,max]of [['week',1,100000],['day',1,7],['score',10,100],['followers',0,1000],['coins',0,1000],['energy',0,100],['trust',-2,3],['reach',0,12000],['likes',0,2000],['comments',0,100]])if(!Number.isInteger(p[k])||p[k]<min||p[k]>max)return null;}
 if(s.phase==='result'&&(!s.lastResult||!['post','rest'].includes(s.lastResult.type)))return null;
 if(s.phase==='result'&&s.lastResult.type==='post'&&!s.posts.some(p=>p.id===s.lastResult.postId))return null;
 if(s.phase==='result'&&s.lastResult.type==='rest'&&(!Number.isInteger(s.lastResult.gain)||s.lastResult.gain<0||s.lastResult.gain>35))return null;
 return structuredClone(s);
 }catch{return null;}
}
