(function(){
'use strict';
const data=window.NECTAR_PRACTICE,engine=window.NectarPractice;
if(!data||!engine)return;
const select=document.getElementById('section-select');
data.sections.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.title;select.append(o);});
select.addEventListener('change',()=>engine.go(data.sections.findIndex(s=>s.id===select.value)));
function sync(){select.value=engine.snapshot().sectionId;}
new MutationObserver(sync).observe(document.getElementById('title'),{childList:true});sync();
const size=document.getElementById('text-size');
function setSize(large){document.body.classList.toggle('larger-text',large);size.setAttribute('aria-pressed',String(large));size.textContent=large?'Standard text':'Larger text';}
try{setSize(localStorage.getItem('nectar-test-large-text')==='true');}catch(e){}
size.addEventListener('click',()=>{const large=!document.body.classList.contains('larger-text');setSize(large);try{localStorage.setItem('nectar-test-large-text',String(large));}catch(e){}});
const player=document.querySelector('.player');
const measure=()=>document.documentElement.style.setProperty('--player-height',Math.ceil(player.getBoundingClientRect().height)+'px');
if(window.ResizeObserver)new ResizeObserver(measure).observe(player);window.addEventListener('resize',measure);measure();
})();
