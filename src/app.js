import{initialState,getIdeas,preview,publish,rest,continueDay,upgrade,startWeek,restoreState}from'./game.js';
import{SEED_MEDIA,parseMediaUrl,restoreQueue,youtubeEmbedUrl}from'./media.js';
import{renderApp,renderComposer,renderResult,renderSummary,renderPrivacy,icon}from'./render.js';
const SAVE='creator-pocket-v1',QUEUE='creator-pocket-queue-v1';
let storageOK=true,initialSave=null,initialQueue=null;
try{initialSave=localStorage.getItem(SAVE);initialQueue=localStorage.getItem(QUEUE);}catch{storageOK=false;}
let state=restoreState(initialSave)||initialState();
let view={tab:'studio',queue:initialQueue===null?SEED_MEDIA.map(x=>x.url):restoreQueue(initialQueue),mediaIndex:0};
let draft=null,modal='',opener=null,toastTimer=null,mediaTimer=null,activeFrame=null,player=null,mediaGeneration=0;
const app=document.querySelector('#app'),dialog=document.querySelector('#dialog');
function toast(text){const box=document.querySelector('#toast');box.textContent=text;box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),3800);}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));localStorage.setItem(QUEUE,JSON.stringify(view.queue));}catch{if(storageOK)toast('保存できないため、この画面を閉じるまでのプレイになります。');storageOK=false;}}
function closeMedia(){mediaGeneration++;clearTimeout(mediaTimer);if(player){try{player.destroy();}catch{}player=null;}if(activeFrame){activeFrame.remove();activeFrame=null;}}
function render(focus=false){closeMedia();app.innerHTML=renderApp(state,view);if(focus)document.querySelector('#main-content')?.focus();}
function closeDialog(){if(dialog.open)dialog.close();modal='';draft=null;if(opener?.isConnected)opener.focus();else document.querySelector('#main-content')?.focus();}
function showDialog(kind,content){if(view.tab==='media')render(true);if(!dialog.open)opener=document.activeElement;modal=kind;dialog.innerHTML=content;if(!dialog.open)dialog.showModal();const focus=dialog.querySelector('[autofocus],button,input');focus?.focus();}
function draftRender(focusAction,focusId){dialog.innerHTML=renderComposer(state,draft);if(focusAction)dialog.querySelector(`[data-action="${focusAction}"][data-id="${focusId}"]`)?.focus();}
function showResult(){showDialog('result',renderResult(state));}
function showSummary(){showDialog('summary',renderSummary(state));}
function setStatus(message){const node=document.querySelector('#embed-status');if(node)node.textContent=message;}
async function youtubeAPI(){if(window.YT?.Player)return window.YT;return new Promise((resolve,reject)=>{const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prior?.();resolve(window.YT);};const existing=document.querySelector('script[data-youtube-api]');if(!existing){const script=document.createElement('script');script.dataset.youtubeApi='true';script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{script.remove();reject(new Error('script'));};document.head.append(script);}setTimeout(()=>window.YT?.Player?resolve(window.YT):reject(new Error('timeout')),12000);});}
async function loadMedia(){
 const media=parseMediaUrl(view.queue[view.mediaIndex]);if(!media)return;closeMedia();const generation=mediaGeneration;
 const mount=document.querySelector('#embed-mount');mount.innerHTML='<div class="player-loading">公式プレーヤーに接続中…</div>';setStatus('外部サービスに接続中。再生できない場合は下の元リンクをご利用ください。');document.querySelector('#unload-button')?.classList.remove('hidden');
 mediaTimer=setTimeout(()=>{if(generation===mediaGeneration)setStatus('読み込みに時間がかかっています。元のサービスで開くか、閉じてもう一度お試しください。');},15000);
 if(media.platform==='youtube'){
  try{const YT=await youtubeAPI();if(generation!==mediaGeneration)return;mount.innerHTML='<div id="youtube-player"></div>';player=new YT.Player('youtube-player',{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:media.id,playerVars:{autoplay:0,playsinline:1,origin:location.origin},events:{onReady:()=>{if(generation!==mediaGeneration)return;clearTimeout(mediaTimer);setStatus('再生はプレーヤーの ▶ から。実際の視聴はゲームの数字に影響しません。');const f=mount.querySelector('iframe');if(f){f.title='YouTube公式動画プレーヤー';f.referrerPolicy='strict-origin-when-cross-origin';}},onError:event=>{if(generation!==mediaGeneration)return;clearTimeout(mediaTimer);const reason=event.data===100?'削除済み・非公開の可能性があります。':[101,150].includes(event.data)?'この動画は埋め込み再生が許可されていません。':event.data===153?'この環境ではプレーヤーの識別情報を送れません。':'この動画をここでは再生できません。';setStatus(`${reason} 下のYouTubeリンクで確認してください。`);}}});
  }catch{if(generation!==mediaGeneration)return;clearTimeout(mediaTimer);mount.innerHTML='<div class="player-fallback"><span>↗</span><h3>ここでは読み込めませんでした</h3><p>接続やブラウザーの設定により、<br>埋め込みを表示できないことがあります。</p><button class="secondary" data-action="load-media">もう一度試す</button></div>';setStatus('下のYouTubeリンクから元の動画を開けます。');}
 }else{
  mount.innerHTML='';const iframe=document.createElement('iframe');iframe.title='X公式投稿プレーヤー';iframe.src=`./x-embed.html?id=${encodeURIComponent(media.id)}`;iframe.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox');iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allow='encrypted-media; fullscreen; picture-in-picture';iframe.className='x-frame';activeFrame=iframe;mount.append(iframe);setStatus('X公式投稿を読み込み中。表示されない場合は元のXリンクをご利用ください。');
 }
}
window.addEventListener('message',event=>{if(!activeFrame||event.source!==activeFrame.contentWindow||event.data?.source!=='creator-pocket-x')return;if(event.data.type==='ready'){clearTimeout(mediaTimer);setStatus('X公式投稿です。実際の視聴はゲームの数字に影響しません。');}else if(event.data.type==='error'){clearTimeout(mediaTimer);setStatus('X投稿を表示できません。削除・公開範囲・接続制限をご確認のうえ、元のXリンクで開いてください。');}else if(event.data.type==='height'&&Number.isFinite(event.data.height)){activeFrame.style.height=`${Math.min(1200,Math.max(320,event.data.height))}px`;}});
document.addEventListener('click',async event=>{const el=event.target.closest('[data-action]');if(!el)return;event.preventDefault();const action=el.dataset.action;if(el.disabled)return;
 try{
 if(action==='tab'){closeDialog();view.tab=el.dataset.tab;render(true);window.scrollTo({top:0});return;}
 if(action==='compose'){if(state.phase!=='planning')return;draft={ideaId:getIdeas(state)[0].id,format:'short',edit:'captions'};showDialog('compose',renderComposer(state,draft));return;}
 if(action.startsWith('choose-')&&modal==='compose'){const key={'choose-idea':'ideaId','choose-format':'format','choose-edit':'edit'}[action];if(key){draft[key]=el.dataset.id;draftRender(action,el.dataset.id);}return;}
 if(action==='publish'){if(modal!=='compose'||state.phase!=='planning')return;state=publish(state,draft);save();render(true);showResult();return;}
 if(action==='rest'){showDialog('rest-confirm',`<div class="dialog-heading"><h2 id="dialog-title">今日は、ひと休み？</h2><button class="icon-button" data-action="close" aria-label="閉じる">${icon('close')}</button></div><div class="rest-confirm"><span>☁</span><p>元気が最大35回復して、一日が進みます。<br>フォロワーやコインは減りません。</p><button class="primary wide" data-action="confirm-rest">今日は休む</button><button class="text-button wide" data-action="close">やっぱり作ってみる</button></div>`);return;}
 if(action==='confirm-rest'){if(state.phase!=='planning')return;state=rest(state);save();render(true);showResult();return;}
 if(action==='continue'){if(state.phase!=='result')return;state=continueDay(state);save();closeDialog();render(true);document.querySelector('[data-action=compose]')?.focus();window.scrollTo({top:0});if(state.phase==='summary')showSummary();return;}
 if(action==='result'){showResult();return;}if(action==='summary'){showSummary();return;}
 if(action==='next-week'){state=startWeek(state);save();closeDialog();render(true);return;}
 if(action==='upgrade'){state=upgrade(state,el.dataset.gear);save();render(true);toast('部屋が、少し作りやすくなりました。');return;}
 if(action==='close'){closeDialog();return;}if(action==='privacy'){showDialog('privacy',renderPrivacy());return;}
 if(action==='reset'){showDialog('reset-confirm',`<div class="dialog-heading"><h2 id="dialog-title">ゲームをはじめから？</h2><button class="icon-button" data-action="close" aria-label="閉じる">${icon('close')}</button></div><p>このブラウザーのゲーム進行・作品・道具が初期状態に戻ります。動画キューは残ります。</p><button class="primary wide" data-action="confirm-reset">はじめから遊ぶ</button><button class="text-button wide" data-action="close">戻る</button>`);return;}
 if(action==='confirm-reset'){state=initialState();save();closeDialog();view.tab='studio';render(true);return;}
 if(action==='load-media'){await loadMedia();return;}if(action==='unload-media'){render(true);return;}
 if(['prev-media','next-media','select-media','remove-media'].includes(action)){if(action==='remove-media'){const i=Number(el.dataset.index);view.queue.splice(i,1);if(i<view.mediaIndex)view.mediaIndex--;view.mediaIndex=Math.min(view.mediaIndex,Math.max(0,view.queue.length-1));save();}else{view.mediaIndex=action==='prev-media'?Math.max(0,view.mediaIndex-1):action==='next-media'?Math.min(view.queue.length-1,view.mediaIndex+1):Number(el.dataset.index);}render(true);return;}
 }catch(error){toast(error.message||'もう一度試してください。');}
});
document.addEventListener('submit',event=>{if(event.target.id!=='url-form')return;event.preventDefault();const input=event.target.elements.url,media=parseMediaUrl(input.value);if(!media){toast('公開されているYouTube・X投稿の https:// URLを入れてください。');input.focus();return;}if(view.queue.some(url=>{const m=parseMediaUrl(url);return m.id===media.id&&m.platform===media.platform;})){toast('その動画は、もうキューにあります。');return;}if(view.queue.length>=30){toast('キューは30件まで。不要なリンクを外してください。');return;}view.queue.push(media.url);view.mediaIndex=view.queue.length-1;save();render(true);toast('マイキューに追加しました。');});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){try{player?.pauseVideo();}catch{}if(activeFrame){closeMedia();if(view.tab==='media')render(true);}}});
window.addEventListener('pagehide',()=>{closeMedia();save();});
render(true);if(!storageOK)setTimeout(()=>toast('保存は利用できません。この画面を閉じるまで遊べます。'),500);else if(initialSave&&!restoreState(initialSave))setTimeout(()=>toast('保存データを読み込めなかったため、新しく始めました。'),500);
