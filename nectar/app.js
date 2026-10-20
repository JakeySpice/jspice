(function(){
'use strict';
const $=id=>document.getElementById(id),data=window.NECTAR_PRACTICE;
if(!data||!Array.isArray(data.sections)||!data.sections.length){$('title').textContent='Practice data is unavailable';$('status').textContent='Keep practice-data.js beside this page and open index.html again.';return;}
const sections=data.sections,audio=$('audio'),storageKey='nectar-practice-settings-v2',simple=document.body.dataset.simpleChanting==='true';
const defaults={brief:60,focus:'',focusMinutes:5,restMinutes:10,gapMode:'timer',namoMode:'passes',namoSeconds:30,namoLoops:3,namoLength:'short',lamaLength:'short',lamaMode:'passes',lamaSeconds:120,lamaLoops:1,speed:1,theme:'dark'};
let settings={...defaults};
try{
  const saved=localStorage.getItem(storageKey);
  if(saved)settings={...defaults,...JSON.parse(saved)};
  else {
    const previous=JSON.parse(localStorage.getItem('nectar-practice-settings-v1')||'{}');
    if(Number(previous.brief)===10)delete previous.brief;
    settings={...defaults,...previous,namoLength:'short',lamaLength:'short'};
  }
}catch(e){}
let index=0,phase='idle',pausedFrom=null,pass=1,totalPasses=1,gapRemaining=0,gapDeadline=0,gapType='',sessionToken=0,lastError='',extended=false;
const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
function sanitize(){settings.brief=number(settings.brief,0,3600,60);settings.focusMinutes=number(settings.focusMinutes,0,180,5);settings.restMinutes=number(settings.restMinutes,0,180,10);settings.speed=number(settings.speed,.8,1.2,1);for(const kind of ['namo','lama']){if(!['short','longer'].includes(settings[kind+'Length']))settings[kind+'Length']='short';settings[kind+'Loops']=Math.round(number(settings[kind+'Loops'],1,108,1));settings[kind+'Seconds']=number(settings[kind+'Seconds'],1,36000,kind==='namo'?30:120);if(!['passes','timed'].includes(settings[kind+'Mode']))settings[kind+'Mode']='passes';}if(!['timer','manual'].includes(settings.gapMode))settings.gapMode='timer';}
sanitize();function persist(){try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch(e){}}
function fmt(sec){sec=Math.max(0,Math.ceil(sec||0));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
function section(){return sections[index];}
function loops(s){const k=s.repetitionKind;if(!k)return 1;if(simple)return k==='namo'?3:1;if(settings[k+'Mode']==='timed'){const secondsPerPass=(s.end-s.start)/settings.speed;return Math.max(1,Math.ceil(settings[k+'Seconds']/secondsPerPass));}return settings[k+'Loops'];}
function gapFor(s){if(s.stage==='thoughts'){const focus=settings.focus!==''&&(settings.focus===s.id||String(s.reflectionIndex)===String(settings.focus));return {seconds:focus?settings.focusMinutes*60:settings.brief,type:focus?'Longer reflection':'Reflection'};}if(s.stage==='rest')return {seconds:settings.restMinutes*60,type:'Rest in awareness'};return null;}
function renderSettings(){
  for(const key of Object.keys(defaults)){if($(key))$(key).value=settings[key];}
  document.body.classList.toggle('light',settings.theme==='light');
  for(const k of ['namo','lama']){
    if($(k+'Loops'))$(k+'Loops').disabled=settings[k+'Mode']==='timed';
    if($(k+'Seconds'))$(k+'Seconds').disabled=settings[k+'Mode']!=='timed';
    if($(k+'Short'))$(k+'Short').setAttribute('aria-pressed',String(settings[k+'Length']==='short'));
    if($(k+'Longer'))$(k+'Longer').setAttribute('aria-pressed',String(settings[k+'Length']==='longer'));
  }
}
function chooseLength(kind,length){
  settings[kind+'Length']=length;
  if(section().repetitionKind===kind){extended=length==='longer';}
  persist();renderSettings();render();
}
function renderSection(){const s=section();$('title').textContent=s.title;$('position').textContent='Section '+(index+1)+' of '+sections.length;$('sourceRange').textContent='Source '+fmt(s.start)+'–'+fmt(s.end);if($('reviewNote'))$('reviewNote').textContent=s.reviewNote||'';$('verses').replaceChildren();for(const unit of s.liturgy||[]){const div=document.createElement('div');div.className='verse'+(unit.kind==='instruction'?' instruction':'');if(unit.phonetic){const p=document.createElement('p');p.className='phonetic';p.textContent=unit.phonetic;div.append(p);}if(unit.english){const p=document.createElement('p');p.className='english';p.textContent=unit.english;div.append(p);}$('verses').append(div);}if(!(s.liturgy||[]).length){const p=document.createElement('p');p.className='muted';p.textContent='Listen to this section of the recording.';$('verses').append(p);}for(const b of $('sections').children){const active=b.dataset.index===String(index);b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');}}
function render(){const s=section(),isGap=phase==='gap'||(phase==='paused'&&pausedFrom==='gap');$('phase').textContent={idle:'Ready',audio:'Chanting',gap:gapType,paused:'Paused',complete:'Complete'}[phase];$('timerPanel').hidden=!isGap;$('timerLabel').textContent=gapType;$('timer').textContent=fmt(gapRemaining);$('timerHint').textContent=settings.gapMode==='manual'?(gapRemaining>0?'A suggested duration. Continue whenever you are ready.':'Continue whenever you are ready.'):'Continue now to finish this pause early.';$('continue').textContent='Continue';$('play').textContent=phase==='paused'?'Resume':phase==='audio'||phase==='gap'?'Pause':phase==='complete'?'Begin again':index===0?'Begin practice':'Play from here';$('previous').disabled=index===0;$('next').disabled=index===sections.length-1;const count=phase==='idle'||phase==='complete'?loops(s):totalPasses;
if(simple){
  const active=phase==='audio'||(phase==='paused'&&pausedFrom==='audio');
  const longer=phase==='idle'?settings[s.repetitionKind+'Length']==='longer':extended;
  $('loopInfo').textContent=s.repetitionKind==='namo'?(active?'Cycle '+pass+(longer?'':' of '+Math.max(count,pass)):longer?'Chant at your own pace':'Three complete refuge cycles'):'';
  $('chantControls').hidden=!s.repetitionKind||phase==='complete';
  $('extendChant').textContent=longer?'Finish chanting':'Chant longer';
  $('extendChant').setAttribute('aria-pressed',String(longer));
  $('chantHint').textContent=longer?'Select Finish chanting when you are ready.':active?(s.repetitionKind==='namo'&&pass<count?'Continues after three cycles.':'Continues at the end of this passage.'):s.repetitionKind==='namo'?'Three cycles, then continue.':'One passage, then continue.';
}else{
  const duration=count*(s.end-s.start)/settings.speed;
  $('loopInfo').textContent=s.repetitionKind?'Whole passage '+(phase==='idle'?'':pass+' of ')+count+' '+(count===1?'pass':'passes')+' — about '+fmt(duration):'';
}
const elapsed=Math.max(0,Math.min(s.end-s.start,(audio.currentTime||s.start)-s.start));$('elapsed').textContent=fmt(elapsed)+' / '+fmt(s.end-s.start);$('progressFill').style.width=(100*elapsed/(s.end-s.start))+'%';$('status').textContent=lastError||(phase==='complete'?'Practice complete.':phase==='idle'?'Begin when you are ready.':isGap?'Silence follows the recorded section.':'');}
async function playAudio(){const token=++sessionToken;phase='audio';pausedFrom=null;audio.playbackRate=settings.speed;render();try{await audio.play();if(token!==sessionToken&&phase!=='audio')audio.pause();}catch(e){if(token!==sessionToken||phase!=='audio')return;phase='paused';pausedFrom='audio';lastError='Audio could not start. Use Resume to try again. Check your connection and try again.';render();}}
function startSection(){audio.pause();lastError='';pass=1;totalPasses=loops(section());extended=simple&&settings[section().repetitionKind+'Length']==='longer';audio.currentTime=section().start;renderSection();playAudio();}
function advance(){sessionToken++;audio.pause();if(index>=sections.length-1){phase='complete';pausedFrom=null;gapRemaining=0;render();return;}index++;startSection();}
function finishSection(){sessionToken++;audio.pause();const gap=gapFor(section());if(gap&&(gap.seconds>0||settings.gapMode==='manual')){phase='gap';gapRemaining=gap.seconds;gapType=gap.type;gapDeadline=Date.now()+gapRemaining*1000;render();}else advance();}
function audioBoundary(){if(phase!=='audio')return;if(pass<totalPasses||(simple&&extended&&section().repetitionKind)){pass++;audio.currentTime=section().start;playAudio();}else finishSection();}
function tick(now=Date.now()){if(phase==='audio'&&audio.currentTime>=section().end-.025)audioBoundary();if(phase==='gap'){gapRemaining=Math.max(0,(gapDeadline-now)/1000);if(gapRemaining===0&&settings.gapMode==='timer'){advance();return;}}render();}
function pause(){if(phase!=='audio'&&phase!=='gap')return;pausedFrom=phase;if(phase==='gap')gapRemaining=Math.max(0,(gapDeadline-Date.now())/1000);phase='paused';sessionToken++;audio.pause();render();}
function resume(){lastError='';if(phase==='paused'){if(pausedFrom==='gap'){phase='gap';gapDeadline=Date.now()+gapRemaining*1000;render();}else playAudio();}else if(phase==='idle')startSection();else if(phase==='complete'){index=0;startSection();}}
function go(i){sessionToken++;audio.pause();index=Math.max(0,Math.min(sections.length-1,i));phase='idle';pausedFrom=null;pass=1;gapRemaining=0;lastError='';audio.currentTime=section().start;renderSection();render();}
function reset(){go(0);}
for(const kind of ['namo','lama']){
  if($(kind+'Short'))$(kind+'Short').onclick=()=>chooseLength(kind,'short');
  if($(kind+'Longer'))$(kind+'Longer').onclick=()=>chooseLength(kind,'longer');
}
if($('extendChant'))$('extendChant').onclick=()=>{
  const kind=section().repetitionKind;if(!kind)return;
  if(phase==='idle')chooseLength(kind,settings[kind+'Length']==='longer'?'short':'longer');
  else {extended=!extended;render();}
};
sections.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.title;b.dataset.index=String(i);b.onclick=()=>go(i);$('sections').append(b);if(s.stage==='thoughts'){const o=document.createElement('option');o.value=s.id;o.textContent=s.title;$('focus').append(o);}});
for(const key of Object.keys(defaults)){if(!$(key))continue;$(key).addEventListener('change',()=>{settings[key]=$(key).value;sanitize();persist();renderSettings();render();});}
$('theme').onclick=()=>{settings.theme=settings.theme==='light'?'dark':'light';renderSettings();persist();};$('play').onclick=()=>phase==='audio'||phase==='gap'?pause():resume();$('previous').onclick=()=>go(index-1);$('next').onclick=()=>go(index+1);$('reset').onclick=reset;$('continue').onclick=()=>{if(phase==='gap'||(phase==='paused'&&pausedFrom==='gap'))advance();};audio.addEventListener('ended',audioBoundary);audio.addEventListener('timeupdate',()=>{if(phase==='audio'&&audio.currentTime>=section().end-.025)audioBoundary();render();});audio.addEventListener('error',()=>{if(phase==='audio')pause();lastError='The recording could not load. Please reload the page and try again.';render();});
audio.src=data.source||'../lama_yadie.mp3';$('attribution').textContent=data.copyright_statement||data.copyright||data.attribution||'Nectar of the Path by Yongey Mingyur Rinpoche, translated by Cortland Dahl. Refer to the supplied source text for its complete copyright and licensing statement.';
if(data.edition&&$('editionNote'))$('editionNote').textContent='Local practice companion · Text edition '+data.edition+'; current edition not confirmed.';
if($('boundaryNote'))$('boundaryNote').textContent=data.boundaryNote||'';renderSettings();renderSection();render();setInterval(()=>tick(),100);
window.NectarPractice={start:resume,pause,reset,go,next:advance,finishGap:()=>{if(phase==='gap'||(phase==='paused'&&pausedFrom==='gap'))advance();},tick,loopsFor:loops,gapFor,configure(values){Object.assign(settings,values);sanitize();persist();renderSettings();render();},snapshot:()=>({index,sectionId:section().id,phase,pausedFrom,pass,totalPasses,gapRemaining,gapType,extended,settings:{...settings}})};
})();
