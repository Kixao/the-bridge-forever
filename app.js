'use strict';
const RACES={Human:['Hunter','Mage','Paladin','Priest','Rogue','Warlock','Warrior'],Dwarf:['Hunter','Paladin','Priest','Rogue','Shaman','Warrior'],Gnome:['Mage','Priest','Rogue','Warlock','Warrior'],'Night Elf':['Druid','Hunter','Priest','Rogue','Warrior'],Skyborne:['Druid','Hunter','Mage','Rogue','Warrior']};
const PROFESSIONS=['Alchemy','Blacksmithing','Enchanting','Engineering','Herbalism','Leatherworking','Mining','Skinning','Tailoring'];
const ROLES={Druid:['Tank','Healer','Melee DPS','Ranged DPS'],Hunter:['Ranged DPS'],Mage:['Ranged DPS'],Paladin:['Tank','Healer','Melee DPS'],Priest:['Healer','Ranged DPS'],Rogue:['Melee DPS'],Shaman:['Healer','Melee DPS','Ranged DPS'],Warlock:['Ranged DPS'],Warrior:['Tank','Melee DPS']};
const COLORS={Druid:'#ff9a54',Hunter:'#abd473',Mage:'#69ccf0',Paladin:'#f58cba',Priest:'#eee',Rogue:'#fff569',Shaman:'#63a7ff',Warlock:'#b39ddb',Warrior:'#c79c6e'};
function requestId(){return Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');}
const $=id=>document.getElementById(id), form=$('character');
let roster=[],demo=false,session=sessionStorage.getItem('bridge-session')||'',transport=null,transportOrigin='',readyResolve,pending=new Map(),channel=requestId();
const ready=new Promise(resolve=>{readyResolve=resolve;});
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function options(select,values,placeholder){select.replaceChildren();if(placeholder!==undefined)select.add(new Option(placeholder,''));values.forEach(v=>select.add(new Option(v,v)));}
function updateClasses(){options(form.elements.className,RACES[form.elements.race.value]||[]);updateRoles();}
function updateRoles(){options(form.elements.role,ROLES[form.elements.className.value]||[]);}
options(form.elements.race,Object.keys(RACES));updateClasses();for(const p of ['profession1','profession2'])options(form.elements[p],PROFESSIONS,'Undecided');options($('class-filter'),Object.keys(ROLES).sort(),'All classes');
form.elements.race.addEventListener('change',updateClasses);form.elements.className.addEventListener('change',updateRoles);
function text(tag,value,parent,cls){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;parent.append(el);return el;}
function render(){
 const counts=[['Adventurers',roster.length],['Tanks',roster.filter(r=>r.role==='Tank').length],['Healers',roster.filter(r=>r.role==='Healer').length],['Damage dealers',roster.filter(r=>r.role.endsWith('DPS')).length]];
 $('stats').replaceChildren();for(const [label,n] of counts){const el=text('div','',$('stats'),'stat');text('strong',n,el);text('span',label,el);}
 const query=$('search').value.toLowerCase(), cls=$('class-filter').value;const filtered=roster.filter(r=>(!cls||r.className===cls)&&Object.values(r).join(' ').toLowerCase().includes(query));
 $('rows').replaceChildren();for(const r of filtered){const row=text('tr','',$('rows'));const who=text('td','',row);text('strong',r.name,who);text('small',r.displayName,who);text('small',r.certainty,who);if(r.note)text('small',r.note,who);const character=text('td','',row);text('strong',r.className,character).style.color=COLORS[r.className];text('small',r.race==='Skyborne'?'Skyborne · High Order':r.race,character);text('td',r.role,row);const prof=text('td','',row);const choices=[r.profession1,r.profession2].filter(Boolean);if(!choices.length)text('small','Undecided',prof);for(const p of choices)text('span',p,prof,'tag');}
 $('empty').hidden=filtered.length>0;$('empty').textContent=roster.length?'No plans match your search.':'No adventurers yet. Be the first across the bridge.';
 $('professions').replaceChildren();for(const p of PROFESSIONS){const n=roster.filter(r=>r.profession1===p||r.profession2===p).length;const row=text('div','',$('professions'),'profession-row');text('span',p,row);const bar=text('div','',row,'bar');text('i','',bar).style.width=(roster.length?n/roster.length*100:0)+'%';text('span',n,row);}
}
function showWorkspace(){ $('workspace').hidden=false;$('welcome').hidden=true; }
function fill(r){if(!r)return;const [firstName,...surname]=String(r.name||'').trim().split(/\s+/);form.elements.firstName.value=firstName||'';form.elements.lastName.value=surname.join(' ');form.elements.race.value=r.race;updateClasses();form.elements.className.value=r.className;updateRoles();for(const k of ['role','profession1','profession2','certainty','note'])form.elements[k].value=r[k]||'';$('remove').hidden=demo;}
window.addEventListener('message',event=>{
 const msg=event.data;if(!msg||msg.channel!==channel||!/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(event.origin))return;
 if(msg.kind==='bridge-ready'&&!transport){transport=event.source;transportOrigin=event.origin;readyResolve();return;}
 if(event.source!==transport||event.origin!==transportOrigin)return;
 const task=pending.get(msg.id);if(task){pending.delete(msg.id);clearTimeout(task.timer);msg.ok?task.resolve(msg.result):task.reject(new Error(msg.error||'Request failed.'));}
});
async function api(action,data={}){
 await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Cannot connect to the planner. Check the Apps Script deployment and allowed site origin.')),20000))]);
 return new Promise((resolve,reject)=>{const id=requestId();const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Request timed out. Refresh the roster before retrying a save.'));},30000);pending.set(id,{resolve,reject,timer});transport.postMessage({kind:'bridge-request',channel,id,action,data,session},transportOrigin);});
}
async function load(){const result=await api('roster');roster=result.roster;demo=false;showWorkspace();$('login').hidden=true;$('logout').hidden=false;$('identity').textContent='Signed in as '+result.displayName;fill(result.mine);$('remove').hidden=!result.mine;render();status('Connected to The Bridge. Your plans can change anytime.');}
async function login(){if(!window.BRIDGE_CONFIG.backendUrl){status('Discord login needs setup. See SETUP.md in the project download.',true);return;}try{$('login').disabled=true;status('Opening Discord…');const result=await api('beginAuth');sessionStorage.setItem('bridge-state',result.state);location.assign(result.url);}catch(e){status(e.message,true);$('login').disabled=false;}}
$('login').onclick=login;
$('logout').onclick=async()=>{try{await api('logout');}catch{}sessionStorage.removeItem('bridge-session');session='';location.replace(location.pathname);};
$('refresh').onclick=async()=>{if(demo){render();status('Sample roster only. Nothing is saved.');return;}try{$('refresh').disabled=true;await load();}catch(e){status(e.message,true);}finally{$('refresh').disabled=false;}};
$('search').oninput=render;$('class-filter').onchange=render;
form.onsubmit=async event=>{event.preventDefault();if(demo){status('This is a sample roster. Log in with Discord after setup to save real plans.');return;}const data=Object.fromEntries(new FormData(form));data.firstName=data.firstName.trim();data.lastName=data.lastName.trim();if(!/^[\p{L}][\p{L}'-]{1,23}$/u.test(data.firstName)||!/^[\p{L}][\p{L}'-]{1,23}$/u.test(data.lastName)){status('Enter a first and last name, each 2–24 letters, apostrophes or hyphens.',true);return;}data.name=data.firstName+' '+data.lastName;if(data.profession1&&data.profession1===data.profession2){status('Choose two different professions, or leave one undecided.',true);return;}try{$('save').disabled=true;await api('save',data);await load();status('Your launch plans are saved. See you across the bridge!');}catch(e){status(e.message,true);}finally{$('save').disabled=false;}};
$('remove').onclick=async()=>{if(!confirm('Remove your launch plans from the guild roster?'))return;try{$('remove').disabled=true;await api('remove');form.reset();updateClasses();await load();status('Your plans have been removed.');}catch(e){status(e.message,true);}finally{$('remove').disabled=false;}};
$('demo').onclick=()=>{demo=true;showWorkspace();$('identity').textContent='Preview only · Sign in to submit your own plans';$('remove').hidden=true;roster=[{name:'Aldric Stormbridge',displayName:'Example member',race:'Human',className:'Warrior',role:'Tank',profession1:'Mining',profession2:'Blacksmithing',certainty:'Decided',note:''},{name:'Thistle Moonbrook',displayName:'Example member',race:'Night Elf',className:'Druid',role:'Healer',profession1:'Herbalism',profession2:'Alchemy',certainty:'Leaning toward this',note:'Happy to level together.'},{name:'Copperwick Sparkgear',displayName:'Example member',race:'Gnome',className:'Mage',role:'Ranged DPS',profession1:'Tailoring',profession2:'Enchanting',certainty:'Decided',note:''},{name:'Stormbraid Ironhearth',displayName:'Example member',race:'Dwarf',className:'Shaman',role:'Melee DPS',profession1:'Mining',profession2:'Engineering',certainty:'Still exploring',note:''}];render();status('Sample roster · These are fictional examples. Changes are not saved.');};
(async()=>{
 const params=new URLSearchParams(location.search),code=params.get('code'),state=params.get('state'),authError=params.get('error');
 if(code||state||authError)history.replaceState(null,'',location.pathname);
 if(!window.BRIDGE_CONFIG.backendUrl){status('Preview ready. Explore a sample roster, or connect Discord and Google Sheets using the included setup guide.');return;}
 const url=new URL(window.BRIDGE_CONFIG.backendUrl);url.searchParams.set('channel',channel);$('backend').src=url.href;
 try{if(authError){sessionStorage.removeItem('bridge-state');throw new Error('Discord login was cancelled. You can try again.');}
 if(code){const expected=sessionStorage.getItem('bridge-state');sessionStorage.removeItem('bridge-state');if(!expected||state!==expected)throw new Error('Login verification expired or did not match. Please log in again.');status('Verifying your Discord membership…');const result=await api('exchange',{code,state});session=result.session;sessionStorage.setItem('bridge-session',session);}
 if(session)await load();else status('Welcome to The Bridge. Log in with Discord to see and share launch plans.');
 }catch(e){status(e.message,true);$('login').hidden=false;}
})();
