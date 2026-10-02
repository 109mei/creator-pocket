// All thresholds are fictional game balancing parameters, not platform policies.
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const own=(o,k)=>Object.hasOwn(o,k);
const clone=s=>structuredClone(s);
export const FORMATS=Object.freeze({short:{name:'ショート',label:'動きで伝える',time:2,icon:'▶'},note:{name:'ひとこと',label:'言葉で伝える',time:1,icon:'✎'}});
export const EDITS=Object.freeze({natural:{name:'手早く',label:'自然な体験談に',time:0,cost:0,icon:'☀'},captions:{name:'字幕を整える',label:'手順を伝える',time:1,cost:4,icon:'Aa'},cinematic:{name:'丁寧に撮る',label:'変化を見せる',time:2,cost:8,icon:'✦'}});
export const HOOKS=Object.freeze({result:{name:'結果から',label:'完成形を先に',icon:'◎'},question:{name:'問いかける',label:'共感から始める',icon:'？'},hype:{name:'強くあおる',label:'期待とのずれに注意',icon:'!'}});
export const BODIES=Object.freeze({steps:{name:'手順を見せる',label:'明日試せる',icon:'①'},change:{name:'変化を見せる',label:'発見がある',icon:'↗'},story:{name:'体験を語る',label:'気持ちが伝わる',icon:'☀'}});
export const TOPICS=Object.freeze({cozy:'暮らし',craft:'ものづくり',play:'遊び',wonder:'発見'});
export const GEAR=Object.freeze({camera:{name:'小さなカメラ',description:'映像の伝わりやすさを少し改善',price:160,max:2,icon:'camera'},lamp:{name:'やさしいライト',description:'制作の元気消費 −5 / Lv',price:140,max:2,icon:'lamp'},desk:{name:'編集デスク',description:'一日の制作時間 4 → 5',price:200,max:1,icon:'desk'}});
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

function restoreLegacy(raw){
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

const GOALS=['steps','change','story'],TOPIC_IDS=Object.keys(TOPICS);
const MAX_METRIC=999999999,MAX_LEDGER=999999999999;
const integer=(x,min=0,max=999999999)=>Number.isInteger(x)&&x>=min&&x<=max;
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function jitter(s,id){return .9+(hash(`${s.seed}:${id}`)%2001)/10000;}
export function initialState(options={}){
 const seed=integer(options.seed,0,4294967295)?options.seed:1;
 return {version:2,seed,audience:own(TOPICS,options.audience)?options.audience:TOPIC_IDS[seed%4],day:1,week:1,phase:'planning',followers:0,coins:120,energy:80,trust:70,gear:{camera:0,lamp:0,desk:0},posts:[],recentTopics:[],lastResult:null,lastSettled:null,weekStart:{followers:0,coins:120,posts:0},totalPosts:0,monetization:{status:'locked',appliedDay:null,activatedDay:null},ledger:{income:0,revenueUnits:0,sponsorIncome:0,production:0,equipment:0},event:null,lastEventPost:-3,resolvedEvents:[],sponsor:null,awards:[],plannedIdea:null};
}
export function getBrief(s){
 const offset=TOPIC_IDS.indexOf(s.audience),topic=TOPIC_IDS[(Math.floor((s.day-1)/3)+offset)%4],goal=GOALS[(s.day-1+offset)%3];
 return {topic,goal,title:`${TOPICS[topic]} × ${BODIES[goal].label}`,name:TOPICS[topic],text:`最近の声：${BODIES[goal].label}内容が見たい`,mood:BODIES[goal].icon,format:goal==='story'?'note':'short'};
}
function ideaVariant(base,goal){return {...base,id:`${base.id}-${goal}`,goal,value:BODIES[goal].label,title:`${base.title} · ${goal==='steps'?'やり方':goal==='change'?'くらべる':'体験談'}`};}
export function getIdeas(s){
 const brief=getBrief(s),matching=IDEAS.filter(x=>x.topic===brief.topic),base=matching[Math.floor((s.day-1)/4)%matching.length];
 const other=IDEAS.filter(x=>x.topic!==brief.topic);const list=[ideaVariant(base,brief.goal),ideaVariant(other[(s.day+s.seed)%other.length],GOALS[(GOALS.indexOf(brief.goal)+1)%3]),ideaVariant(other[(s.day+s.seed+3)%other.length],GOALS[(GOALS.indexOf(brief.goal)+2)%3])];
 if(s.sponsor){const item=IDEAS.find(x=>x.id===s.sponsor.baseId);list[2]=ideaVariant(item,s.sponsor.goal);}
 if(s.plannedIdea){const split=s.plannedIdea.lastIndexOf('-'),base=IDEAS.find(x=>x.id===s.plannedIdea.slice(0,split)),goal=s.plannedIdea.slice(split+1);if(base&&GOALS.includes(goal)&&!list.some(x=>x.id===s.plannedIdea))list[1]=ideaVariant(base,goal);}
 return list;
}
export function defaultDraft(s){return {ideaId:null,format:'short',hook:null,body:null,edit:null,step:'idea',sponsored:false};}
export function preview(s,d){
 const idea=getIdeas(s).find(x=>x.id===d?.ideaId),format=own(FORMATS,d?.format)?FORMATS[d.format]:null,edit=own(EDITS,d?.edit)?EDITS[d.edit]:null;
 if(!idea||!format||!edit||!own(HOOKS,d?.hook)||!own(BODIES,d?.body))return {valid:false,error:'企画・入口・中身・仕上げを選んでね。',concern:'選択をそろえて確認しよう。'};
 const time=format.time+edit.time,budget=4+s.gear.desk,energy=Math.max(5,8+format.time*6+edit.time*6-s.gear.lamp*5),cost=edit.cost;
 let error='';if(d.format==='note'&&d.edit==='cinematic')error='ひとことでは「丁寧に撮る」を選べません。';else if(time>budget)error='制作時間が足りません。手早い仕上げに変えよう。';else if(energy>s.energy)error='元気不足。手早く作るか、休もう。';else if(cost>s.coins)error='コイン不足。「手早く」なら0コイン。';else if(s.phase!=='planning')error='今日の制作は完了したよ。';
 const evaluation=evaluatePlan(s,d),concern=evaluation.promiseGap?'入口で約束したことを、中身で見せられるか確認しよう。':evaluation.repeat?'同じ企画と切り口が続いています。別の疑問も試せます。':evaluation.fatigue?'今の元気では、細部が荒くなりやすい。':d.sponsored&&s.sponsor?.mismatch?'常連の期待と違う案件。満足が下がる可能性があります。':'誰に何を届けるかは整理できました。広がりは公開後に分かります。';
 return {valid:!error,error,idea,format,edit,time,budget,energy,cost,concern,target:idea.topic===s.audience?'常連向け':'新しい層へ'};
}
export function evaluatePlan(s,d){
 const idea=getIdeas(s).find(x=>x.id===d?.ideaId);if(!idea)return null;
 const brief=getBrief(s),repeat=s.posts.slice(0,5).filter(p=>p.ideaId===d.ideaId&&p.hook===d.hook&&p.body===d.body).length;
 const bodyMatch=d.body===idea.goal,editMatch=d.edit===({steps:'captions',change:'cinematic',story:'natural'})[idea.goal];
 const fit=30+(idea.topic===brief.topic?25:0)+(idea.topic===s.audience?15:0)+(idea.goal===brief.goal?12:0);
 const fatigue=s.energy<35?14:0,promiseGap=d.hook==='hype'?28:!bodyMatch?16:0;
 const substance=clamp(30+(bodyMatch?34:-14)+(editMatch?18:0)+(d.format==='short'?s.gear.camera*3:0)-fatigue,0,100);
 const satisfaction=Math.round(clamp(fit*.4+substance*.6-promiseGap-repeat*9-(d.sponsored&&s.sponsor?.mismatch?10:0),0,100));
 const entrance=d.hook==='hype'?85:d.hook===(idea.goal==='story'?'question':'result')?75:42;
 const novelty=clamp(1-repeat*.32,.08,1);
 const reasons=[];let nextAction='最近の声に合う企画と、中身の伝え方を組み合わせよう。';
 if(promiseGap){reasons.push(d.hook==='hype'?'強い入口に対して、中身の約束が大きすぎた。':'企画の約束と中身の見せ方にずれがある。');nextAction='入口の約束を小さくし、企画に合う中身を見せよう。';}
 if(repeat){reasons.push('同じ企画と切り口が続き、新しい人への広がりが減った。');nextAction='同じテーマでも、別の疑問や切り口を試そう。';}
 if(fatigue){reasons.push('疲れで細部が伝わりにくかった。');nextAction='休んでから、伝えることを一つに絞ろう。';}
 if(!editMatch&&reasons.length<2){reasons.push('仕上げが、この企画の伝えたい価値と合いにくい。');nextAction=`${BODIES[idea.goal].name}なら「${EDITS[({steps:'captions',change:'cinematic',story:'natural'})[idea.goal]].name}」を試そう。`;}
 if(idea.topic!==brief.topic&&reasons.length<2)reasons.push('今の関心とは違う層への小さな実験。');
 if(!reasons.length)reasons.push('企画の約束を中身で届けられた。','最近の関心に合い、満足した人から少しずつ広がった。');
 return {fit,entrance,substance,satisfaction,novelty,promiseGap,repeat,fatigue,bodyMatch,reasons:reasons.slice(0,2),nextAction};
}
const COMMENT_BANK={gap:['入口で期待した内容を、もう少し見たかった。','最初の言い方と中身が少し違って感じた。','見せたいことを一つに絞ると伝わりそう。','大きな言葉より具体例があると分かりやすい。','最初の疑問の答えを最後に聞きたかった。','次は説明と入口がつながるといいな。'],repeat:['このテーマ好き。次は違うやり方も見たい。','前と別の切り口の続きも気になる。','新しい疑問を深掘りした回も見たいな。','同じテーマの別の一面も知りたい。','別のやり方を試す回も楽しみ。','少し違う例でも見てみたいな。'],steps:['順番が見えたから、自分でもできそう。','手順が分かりやすくて助かった。','途中の工夫まで見られてよかった。','どこから始めるか分かった。','やる順番が整理されていて見やすい。','自分の手でも試せそうな説明だった。'],change:['違いが目で見えて面白かった。','比べて見せると小さな変化も分かるね。','最後の変化でもう一度見たくなった。','前後の差に気づけた。','並べて見ると印象が違うね。','変わっていくところが伝わってきた。'],story:['気負わない感じに共感した。','その気持ち、ちょっと分かる。','自然な言葉で話してくれてうれしい。','似た経験があってうなずいた。','小さな出来事も話すと面白いね。','日常の感じが伝わってきた。'],low:['このテーマの良さを、もう少し知りたい。','何を見てほしいのか、最初にあるとうれしい。','次の回ではポイントを絞って見たい。','どんな発見だったのかもう少し知りたい。','内容のつながりを整理すると分かりそう。','短くてもひとつ具体例があるとうれしい。']};
function commentsFor(s,p){const key=p.evaluation.promiseGap?'gap':p.evaluation.repeat?'repeat':p.satisfaction>=65?p.body:'low',previous=s.posts.filter(x=>x.id!==p.id).slice(0,3).flatMap(x=>(x.commentList||[]).slice(0,1).map(c=>c.text)),bank=COMMENT_BANK[key],offset=hash(p.id)%3;return [...bank.slice(offset),...bank.slice(0,offset)].filter(text=>!previous.includes(text)).slice(0,Math.min(3,p.comments)).map((text,i)=>({name:['みどり','ソラ','こはる','ユウ','ナギ','まる'][(hash(p.id)+i)%6],text}));}
export function publish(s,d){
 const p=preview(s,d);if(!p.valid)throw new Error(p.error);const n=clone(s),id=`${s.seed}-${s.totalPosts+1}`,evaluation=evaluatePlan(s,d),impressions=Math.floor((6+Math.sqrt(s.followers)*2)*jitter(s,id)),rate=clamp((evaluation.entrance/100)*(evaluation.fit/100)*.55,0,.7),views=Math.floor(impressions*rate);
 const post={...p.idea,id,ideaId:p.idea.id,week:s.week,day:s.day,format:d.format,edit:d.edit,hook:d.hook,body:d.body,sponsored:!!d.sponsored,fictional:true,legacy:false,status:'pending',score:evaluation.satisfaction,satisfaction:evaluation.satisfaction,evaluation,energy:p.energy,cost:p.cost,trust:0,followers:0,newFollowers:0,lostFollowers:0,coins:0,impressions,reach:impressions,initialViews:views,views,likes:0,comments:0,commentList:[],reasons:[],nextAction:'次のゲーム内日に、広がりと登録者の変化が分かります。',monetized:s.monetization.status==='active'};
 n.posts=[post,...n.posts].slice(0,40);n.totalPosts++;n.energy-=p.energy;n.coins-=p.cost;n.ledger.production+=p.cost;n.phase='result';n.lastResult={type:'post',postId:id};n.plannedIdea=null;award(n,'first-post',id);return n;
}
function settle(n,p){
 if(p.status!=='pending')return;const e=p.evaluation;
 const spread=e.satisfaction>=64&&e.bodyMatch?Math.floor((150+n.followers*2.6)*((e.satisfaction-54)/35)*e.novelty*jitter(n,p.id)*((e.entrance+30)/100)):0;
 p.views=Math.min(MAX_METRIC,p.initialViews+Math.max(0,spread));p.impressions=Math.min(MAX_METRIC,Math.max(p.impressions,Math.ceil(p.views*1.8)));p.reach=p.impressions;
 p.newFollowers=e.satisfaction>=55?Math.floor(p.views*.048*((e.satisfaction-54)/30)):0;
 const repeatedBad=n.posts.filter(x=>x.id!==p.id&&x.status==='settled').slice(0,2).filter(x=>!x.legacy&&x.satisfaction<40).length;
 p.lostFollowers=(e.promiseGap>=28||repeatedBad>=2&&e.satisfaction<40)?Math.min(n.followers,Math.max(0,Math.ceil(n.followers*(e.promiseGap>=28?.018:.006)))):0;
 p.newFollowers=Math.min(p.newFollowers,MAX_METRIC-n.followers+p.lostFollowers);p.followers=p.newFollowers-p.lostFollowers;p.likes=Math.floor(p.views*clamp(e.satisfaction/100-.35,0,.6)*.22);p.comments=Math.floor(p.views*(e.satisfaction>=65?.012:e.promiseGap?.035:.005));p.commentList=commentsFor(n,p);
 p.trust=e.promiseGap>=28?-6:e.satisfaction>=68?2:e.satisfaction<40&&repeatedBad>=2?-2:0;
 n.followers=clamp(n.followers+p.followers,0,999999999);n.trust=clamp(n.trust+p.trust,0,100);
 if(p.monetized){const before=n.ledger.income,headroom=MAX_METRIC-n.coins;n.ledger.revenueUnits=Math.min(MAX_LEDGER,n.ledger.revenueUnits+p.views*4,(before+headroom)*100+99);n.ledger.income=Math.floor(n.ledger.revenueUnits/100);p.coins=n.ledger.income-before;n.coins+=p.coins;}
 p.reasons=e.reasons;p.nextAction=e.nextAction;p.status='settled';n.lastSettled=p.id;
 if(p.comments)award(n,'first-comment',p.id);if(p.newFollowers)award(n,'first-regular',p.id);
 if(n.sponsor&&p.day<=n.sponsor.deadline&&p.sponsored&&p.topic===n.sponsor.topic&&p.body===n.sponsor.goal&&p.evaluation.bodyMatch&&p.evaluation.substance>=60&&p.evaluation.promiseGap<28){const reward=Math.min(n.sponsor.reward,MAX_METRIC-n.coins,MAX_LEDGER-n.ledger.sponsorIncome);n.coins+=reward;n.ledger.sponsorIncome+=reward;p.sponsorCoins=reward;n.resolvedEvents.push(`paid:${n.sponsor.id}`);n.sponsor=null;}
 maybeEvent(n,p);
}
function award(s,id,postId=null){if(!s.awards.some(x=>x.id===id))s.awards.push({id,day:s.day,postId});}
function maybeEvent(s,p){
 if(s.event||s.sponsor||s.totalPosts-s.lastEventPost<3)return;
 let type=null;if(p.evaluation.promiseGap>=28)type='clarify';else if(s.followers>=300&&s.trust>=75&&p.satisfaction>=65)type='sponsor';else if(p.comments&&p.satisfaction>=65)type='request';if(!type)return;
 const id=`event:${p.id}`,baseId=p.art,mismatch=s.totalPosts%2===0,topic=mismatch?TOPIC_IDS[(TOPIC_IDS.indexOf(p.topic)+1)%4]:p.topic,base=IDEAS.find(x=>x.topic===topic);
 s.event={id,type,postId:p.id,ideaId:p.ideaId,topic:type==='sponsor'?topic:p.topic,goal:p.body,baseId:type==='sponsor'?base.id:baseId,brand:'架空ブランド・Komorebi',reward:80,productionCost:0,duration:4,mismatch:type==='sponsor'&&topic!==s.audience};s.lastEventPost=s.totalPosts;
}
export function rest(s){if(s.phase!=='planning')throw new Error('今日の行動は完了したよ。');const n=clone(s),gain=Math.min(35,100-n.energy);n.energy+=gain;n.phase='result';n.lastResult={type:'rest',gain};return n;}
export function continueDay(s){
 if(s.phase!=='result')throw new Error('まだ今日の行動を選んでいないよ。');const n=clone(s);for(const p of n.posts)settle(n,p);n.day++;n.week=Math.floor((n.day-1)/7)+1;n.phase='planning';n.lastResult=null;
 if(n.monetization.status==='pending'&&n.day>n.monetization.appliedDay){n.monetization.status='active';n.monetization.activatedDay=n.day;award(n,'monetized');}
 if(n.sponsor&&n.day>n.sponsor.deadline){n.resolvedEvents.push(`expired:${n.sponsor.id}`);n.sponsor=null;}
 if(n.followers>=1000)award(n,'silver',n.lastSettled);n.resolvedEvents=n.resolvedEvents.slice(-80);return n;
}
export function startWeek(s){if(s.phase!=='summary')throw new Error('日々はそのまま続けられます。');const n=clone(s);n.phase='planning';n.day++;n.week=Math.floor((n.day-1)/7)+1;return n;}
export function upgrade(s,id){const item=own(GEAR,id)?GEAR[id]:null;if(!item)throw new Error('その道具は見つからないよ。');if(s.gear[id]>=item.max)throw new Error('この道具は完成しているよ。');const price=item.price*(s.gear[id]+1);if(s.coins<price)throw new Error('ゲーム内コインが足りないよ。');const n=clone(s);n.coins-=price;n.gear[id]++;n.ledger.equipment+=price;return n;}
export function monetizationProgress(s){const settled=s.posts.filter(p=>p.status==='settled'&&!p.legacy),views=settled.slice(0,7).reduce((sum,p)=>sum+p.views,0),quality=settled.slice(0,5).filter(p=>p.satisfaction>=65).length;return {followers:s.followers,views,quality,trust:s.trust,eligible:s.followers>=100&&views>=1500&&quality>=3&&s.trust>=60};}
export function applyMonetization(s){if(s.monetization.status!=='locked')throw new Error('申請は一度だけです。');if(!monetizationProgress(s).eligible)throw new Error('条件をそろえてから申請しよう。');const n=clone(s);n.monetization={status:'pending',appliedDay:s.day,activatedDay:null};return n;}
export function resolveEvent(s,id,choice){
 const ev=s.event;if(!ev||ev.id!==id||s.resolvedEvents.includes(id))throw new Error('この出来事は解決済みです。');const allowed=ev.type==='sponsor'?['accept','decline']:ev.type==='clarify'?['clarify','plan']:['plan','skip'];if(!allowed.includes(choice))throw new Error('対応を選んでね。');
 const n=clone(s);if(choice==='clarify'){if(n.energy<10)throw new Error('補足には元気10が必要です。');n.energy-=10;n.trust=Math.min(100,n.trust+3);}if(choice==='plan')n.plannedIdea=ev.ideaId;if(choice==='accept')n.sponsor={...ev,deadline:s.day+ev.duration};n.resolvedEvents.push(id);n.resolvedEvents=n.resolvedEvents.slice(-80);n.event=null;return n;
}
function migrateLegacy(raw){const old=restoreLegacy(raw);if(!old)return null;const day=(old.week-1)*7+old.day,seed=hash(JSON.stringify(old.weekStart));const n={...initialState({seed}),...old,version:2,seed,day,week:Math.floor((day-1)/7)+1};if(old.phase==='summary'){n.day++;n.week=Math.floor((n.day-1)/7)+1;n.phase='planning';n.lastResult=null;}
 n.posts=old.posts.map(p=>({...p,legacy:true,status:'settled',views:p.reach,initialViews:p.reach,impressions:p.reach,commentList:[],satisfaction:p.score,cost:0,newFollowers:p.followers,lostFollowers:0,nextAction:'以前の記録です。新しい収益の対象にはなりません。'}));n.lastSettled=n.posts[0]?.id||null;return n;}
function validIdeaId(id){if(typeof id!=='string'||id.length>80)return false;return IDEAS.some(base=>GOALS.some(goal=>id===`${base.id}-${goal}`));}
function boundedText(value,max=100){return typeof value==='string'&&value.length>0&&value.length<=max;}
function validEvent(ev,s,sponsor=false){if(!ev||typeof ev!=='object'||!['request','clarify','sponsor'].includes(ev.type)||sponsor&&ev.type!=='sponsor')return false;const base=IDEAS.find(x=>x.id===ev.baseId);return boundedText(ev.id)&&boundedText(ev.postId)&&validIdeaId(ev.ideaId)&&!!base&&base.topic===ev.topic&&GOALS.includes(ev.goal)&&boundedText(ev.brand,80)&&integer(ev.reward,0,1000)&&integer(ev.productionCost,0,1000)&&integer(ev.duration,1,4)&&typeof ev.mismatch==='boolean'&&(ev.type!=='sponsor'||ev.mismatch===(ev.topic!==s.audience))&&(!sponsor||integer(ev.deadline,1,s.day+4));}
export function restoreState(raw){
 try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(s?.version===1)return migrateLegacy(s);if(!s||s.version!==2||!['planning','result'].includes(s.phase))return null;
 for(const [k,min,max]of [['seed',0,4294967295],['day',1,1000000],['week',1,142858],['followers',0,999999999],['coins',0,999999999],['energy',0,100],['trust',0,100],['totalPosts',0,1000000]])if(!integer(s[k],min,max))return null;
 if(s.week!==Math.floor((s.day-1)/7)+1||!own(TOPICS,s.audience))return null;
 if(s.plannedIdea!==null&&!validIdeaId(s.plannedIdea))return null;
 if(s.lastSettled!==null&&!boundedText(s.lastSettled))return null;
 for(const [id,item]of Object.entries(GEAR))if(!integer(s.gear?.[id],0,item.max))return null;
 if(!Array.isArray(s.posts)||s.posts.length>40||new Set(s.posts.map(p=>p.id)).size!==s.posts.length)return null;
 if(!s.ledger||!['income','revenueUnits','sponsorIncome','production','equipment'].every(k=>integer(s.ledger[k],0,999999999999)))return null;
 if(s.ledger.income!==Math.floor(s.ledger.revenueUnits/100))return null;
 if(!['locked','pending','active'].includes(s.monetization?.status))return null;
 const m=s.monetization;if(m.status==='locked'&&(m.appliedDay!==null||m.activatedDay!==null)||m.status==='pending'&&(!integer(m.appliedDay,1,s.day)||m.activatedDay!==null)||m.status==='active'&&(!integer(m.appliedDay,0,s.day)||!integer(m.activatedDay,m.appliedDay+1,s.day)))return null;
 if(!Array.isArray(s.resolvedEvents)||s.resolvedEvents.length>80||s.resolvedEvents.some(x=>typeof x!=='string'||x.length>100))return null;
 if(!Array.isArray(s.awards)||s.awards.length>5||new Set(s.awards.map(x=>x.id)).size!==s.awards.length||s.awards.some(x=>!['first-post','first-comment','first-regular','monetized','silver'].includes(x.id)||!integer(x.day,1,s.day)))return null;
 if(!integer(s.lastEventPost,-3,s.totalPosts)||!Array.isArray(s.recentTopics)||s.recentTopics.length>3)return null;
 if(s.event!==null&&(!validEvent(s.event,s)||s.resolvedEvents.includes(s.event.id)))return null;
 if(s.sponsor!==null&&!validEvent(s.sponsor,s,true))return null;
 if(s.event&&s.sponsor)return null;
 for(const p of s.posts){if(!p||p.fictional!==true||!['pending','settled'].includes(p.status)||!IDEAS.some(i=>i.art===p.art)||!own(FORMATS,p.format)||!own(EDITS,p.edit)||!/^#[0-9a-fA-F]{6}$/.test(p.color))return null;
  for(const k of ['id','title','caption','topic','tag','color','nextAction'])if(typeof p[k]!=='string'||p[k].length>250)return null;
  for(const k of ['views','initialViews','impressions','reach','likes','comments','coins','cost','energy','newFollowers','lostFollowers'])if(!integer(p[k]))return null;
  if(!integer(p.day,1,s.day)||!integer(p.week,1,s.week)||!integer(p.energy,0,100))return null;
  if(!integer(p.score,0,100)||!integer(p.satisfaction,0,100)||!integer(p.followers,-999999999)||!integer(p.trust,-100,100))return null;
  if(!Array.isArray(p.reasons)||p.reasons.length>8||p.reasons.some(x=>typeof x!=='string'||x.length>250)||!Array.isArray(p.commentList)||p.commentList.length>3||p.commentList.some(c=>typeof c.name!=='string'||c.name.length>40||typeof c.text!=='string'||c.text.length>250))return null;
  if(typeof p.legacy!=='boolean')return null;
  if(!p.legacy){if(!validIdeaId(p.ideaId)||typeof p.sponsored!=='boolean'||p.followers!==p.newFollowers-p.lostFollowers||!own(HOOKS,p.hook)||!own(BODIES,p.body)||p.likes>p.views||p.comments>p.views||p.initialViews>p.views||typeof p.monetized!=='boolean')return null;const e=p.evaluation;if(!e||!['fit','entrance','substance','satisfaction','promiseGap','repeat','fatigue'].every(k=>integer(e[k],0,100))||!Number.isFinite(e.novelty)||e.novelty<.08||e.novelty>1||!Array.isArray(e.reasons)||e.reasons.length>2||e.reasons.some(x=>typeof x!=='string'||x.length>250)||typeof e.nextAction!=='string'||e.nextAction.length>250)return null;}
 }
 const pending=s.posts.filter(p=>p.status==='pending');if(pending.length>1||pending.length&&(s.phase!=='result'||s.lastResult?.type!=='post'||s.lastResult.postId!==pending[0].id))return null;
 if(pending.some(p=>p.followers!==0||p.coins!==0||p.newFollowers!==0||p.lostFollowers!==0))return null;
 if(s.phase==='result'&&(!s.lastResult||!['post','rest'].includes(s.lastResult.type)))return null;
 if(s.phase==='result'&&s.lastResult.type==='post'&&!s.posts.some(p=>p.id===s.lastResult.postId))return null;
 if(s.phase==='result'&&s.lastResult.type==='rest'&&!integer(s.lastResult.gain,0,35))return null;
 return clone(s);
 }catch{return null;}
}
