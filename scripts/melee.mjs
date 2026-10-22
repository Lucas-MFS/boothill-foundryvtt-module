import {damageAuthority,queueWorldUpdate,supportsHealth} from './damage.mjs';
import {HOLDS} from './melee-rules.mjs';
function meleeAuthority() {
 const capable=game.users.filter(u=>u.active&&u.isGM&&u.getFlag('boothill','meleeProtocol')===1);
 return capable.find(u=>u.id===game.users.activeGM?.id)??capable.sort((a,b)=>a.id.localeCompare(b.id))[0]??damageAuthority();
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function meleeCard(data) {
 const r=data.result;
 return `<article class="bh-roll-card"><header><span>BOOT HILL</span><h3>${esc(data.title)}</h3></header><div class="bh-rapidity-score">${r.total}</div><small>d20 ${r.die} · Linha ${r.row??'automática'}</small><p class="bh-roll-outcome">${esc(r.label)}</p><small class="bh-roll-modifiers">${(r.modifiers??[]).filter(([,v])=>v).map(([k,v])=>`${esc(k)} ${v>0?'+':''}${v}`).join(' · ')}</small><p>${esc(data.targetName)}: ${r.damage} ponto(s) temporário(s) · Próxima rolagem ${r.opponentEffect>0?'+':''}${r.opponentEffect}</p>${r.selfDamage||r.selfEffect?`<small>Atacante: ${r.selfDamage} ponto(s) temporário(s) · Próxima rolagem ${r.selfEffect}</small>`:''}${data.applied?'<small>Dano e efeitos aplicados.</small>':'<button type="button" data-bh-melee-apply>Aplicar golpe e efeitos</button>'}<small class="bh-roll-note">Corpo a corpo: menos de 2 m; distância conferida pelo Juiz.</small></article>`;
}
export async function requestMelee(message) {
 const gm=meleeAuthority();
 if(!gm) return ui.notifications.warn('Conecte um Juiz para aplicar o golpe e seus efeitos.');
 await ChatMessage.create({content:'Aplicação de golpe solicitada.',whisper:[game.user.id,gm.id],flags:{boothill:{meleeRequest:{messageId:message.id,processorId:gm.id}}}});
}
export async function consumeMeleeModifier(actor) {
 const {pendingMeleeModifier}=await import('./melee-rules.mjs');
 const value=pendingMeleeModifier(actor);
 if(actor.getFlag('boothill','meleeState')?.effects?.length) await actor.update({'flags.boothill.meleeState.effects':[]});
 return value;
}
export function registerMelee() {
 const process=async request=>{
  const req=request.getFlag('boothill','meleeRequest');if(!req||request.getFlag('boothill','meleeDone')) return;
  const assigned=game.users.get(req.processorId);
  if(assigned?.active?assigned.id!==game.user.id:meleeAuthority()?.id!==game.user.id) return;
  const message=game.messages.get(req.messageId),data=message?.getFlag('boothill','melee');
  if(!data) return;
  if(data.applied) {await request.setFlag('boothill','meleeDone',true);return;}
  const source=await fromUuid(data.actorUuid),token=await fromUuid(data.targetTokenUuid),target=token?.actor;
  if(!supportsHealth(source)||token?.documentName!=='Token'||!supportsHealth(target)||source.uuid===target.uuid) return;
  if(!request.author.isGM&&!source.testUserPermission(request.author,'OWNER')) return;
  const r=data.result,state=source.getFlag('boothill','meleeState')??{};
  if(data.maintain&&!target.getFlag('boothill','meleeState')?.holds?.some(h=>h.source===source.uuid&&h.kind===r.hold)) return ui.notifications.warn('A chave já foi desfeita.');
  const stamp={combatId:game.combat?.id??null,round:game.combat?.round??null};
  const changeState=(actor,damage,modifier,holds,outgoing)=>{
   const current=actor.getFlag('boothill','meleeState')??{};
   return {'system.health.temporary':actor.system.health.temporary+damage,'flags.boothill.meleeState':{...current,effects:[...(current.effects??[]),...(modifier?[{...stamp,modifier,id:message.id}]:[])],...(holds?{holds}:{}),...(outgoing!==undefined?{outgoing}:{} )},[`flags.boothill.meleeLedger.${message.id}`]:true};
  };
  if(!source.getFlag('boothill',`meleeLedger.${message.id}`)) {
   const ownHolds=(state.holds??[]).filter(h=>!r.escape||h.source!==target.uuid);
   await source.update(changeState(source,r.selfDamage??0,r.selfEffect??0,ownHolds,data.release||!r.hold?null:{targetTokenUuid:token.uuid,kind:r.hold,damage:r.damage,effect:r.opponentEffect}));
  }
  if(!target.getFlag('boothill',`meleeLedger.${message.id}`)) {
   const holds=(target.getFlag('boothill','meleeState')?.holds??[]).filter(h=>h.source!==source.uuid);
   if(r.hold&&!data.release) holds.push({kind:r.hold,source:source.uuid});
   const outgoing=r.escape&&(state.holds??[]).some(h=>h.source===target.uuid)?null:undefined;
   await target.update(changeState(target,r.damage??0,r.opponentEffect??0,holds,outgoing));
  }
  // Starting another attack releases the previous hold, including on another target.
  if(!data.maintain&&state.outgoing&&state.outgoing.targetTokenUuid!==token.uuid) {
   const old=(await fromUuid(state.outgoing.targetTokenUuid))?.actor;
   if(old) await old.update({'flags.boothill.meleeState.holds':(old.getFlag('boothill','meleeState')?.holds??[]).filter(h=>h.source!==source.uuid)});
  }
  const next={...data,applied:true};await message.update({'flags.boothill.melee':next,content:meleeCard(next)});
  await request.update({'flags.boothill.meleeDone':true,content:'Golpe e efeitos aplicados.'});
 };
 const schedule=request=>queueWorldUpdate(()=>process(request));
 Hooks.on('createChatMessage',schedule);
 Hooks.once('ready',async()=>{if(game.user.isGM) await game.user.setFlag('boothill','meleeProtocol',1);if(meleeAuthority()?.id===game.user.id) for(const m of game.messages) if(m.getFlag('boothill','meleeRequest')&&!m.getFlag('boothill','meleeDone')) schedule(m);});
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  const data=message.getFlag('boothill','melee');if(!data||!message.isContentVisible) return;
  const content=html.querySelector('.message-content');content.innerHTML=meleeCard(data);
  const b=content.querySelector('[data-bh-melee-apply]');
  if(b) {b.disabled=!(message.isAuthor||game.user.isGM);b.addEventListener('click',()=>{if(message.isAuthor||game.user.isGM) return requestMelee(message);});}
 });
 const clear=async(combat,ended=false)=>{
  if(meleeAuthority()?.id!==game.user.id) return;
  const actors=new Map([...game.actors,...combat.combatants.map(c=>c.actor).filter(Boolean)].map(a=>[a.uuid,a]));
  for(const actor of actors.values()) {
   const effects=actor.getFlag('boothill','meleeState')?.effects??[];
   const remaining=effects.filter(e=>e.combatId!==combat.id||(!ended&&e.round===combat.round));
   if(remaining.length!==effects.length) await actor.update({'flags.boothill.meleeState.effects':remaining});
  }
 };
 Hooks.on('updateCombat',(combat,changes)=>{if('round' in changes||'active' in changes) return queueWorldUpdate(()=>clear(combat,!combat.active));});
 Hooks.on('deleteCombat',combat=>queueWorldUpdate(()=>clear(combat,true)));
}
