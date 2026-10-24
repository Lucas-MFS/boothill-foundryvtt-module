import {BRAWL_OBJECTS,meleeResult,allowedHands,pendingMeleeModifier} from './melee-rules.mjs';
import {consumeMeleeModifier,meleeCard,requestMelee} from './melee.mjs';
import {supportsHealth} from './damage.mjs';
import {healthSummary,handsRequired} from './combat-rules.mjs';
import {needsLuck,succeeds} from './rules.mjs';
export async function attackMelee(event,button) {
 if(!this.isEditable||this._meleeRolling) return;
 this._meleeRolling=true;
 try {
  await this.submit();
  const actor=this.actor,mode=button.dataset.mode;
  if(!['brawl','grapple','knife','maintain','release'].includes(mode)) return;
  if(mode!=='release'&&healthSummary(actor.system.health,actor.system.attributes.strength).unconscious) return ui.notifications.warn('O personagem está incapacitado.');
  const outgoing=actor.getFlag('boothill','meleeState')?.outgoing;
  const targets=[...game.user.targets];
  const token=['maintain','release'].includes(mode)?(outgoing?await fromUuid(outgoing.targetTokenUuid):null):targets.length===1?targets[0].document:null;
  if(!token||!supportsHealth(token.actor)||token.actor.uuid===actor.uuid) return ui.notifications.warn('Marque exatamente um outro token com ficha de personagem ou NPC.');
  if(['maintain','release'].includes(mode)) {
   const result={total:'—',die:'—',label:mode==='release'?'Chave liberada':'Chave mantida',damage:mode==='release'?0:outgoing.damage,opponentEffect:mode==='release'?0:outgoing.effect,selfDamage:0,selfEffect:0,hold:mode==='release'?null:outgoing.kind,modifiers:[]};
   const data={actorUuid:actor.uuid,targetTokenUuid:token.uuid,targetName:token.name,result,title:'Imobilização',maintain:mode==='maintain',release:mode==='release'};
   const message=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:meleeCard(data),flags:{boothill:{melee:data}}});await requestMelee(message);return;
  }
  const hands=allowedHands(actor);
  if(mode!=='grapple'&&!hands.length) return ui.notifications.warn('As chaves atuais impedem usar os braços para este ataque.');
  const availableHands=this.heldWeapons().reduce((n,item)=>n+handsRequired(item.system),0);
  const occupied=new Set(this.heldWeapons().flatMap((item,index)=>handsRequired(item.system)===2?['right','left']:[index===0?'right':'left']));
  const free=hands.filter(side=>!occupied.has(side));
  let options={object:'none',hand:(mode==='brawl'?free:hands).includes('right')?'right':'left',judge:0,defend:true,openingExempt:false};
  if(event.shiftKey) {
   const content=`${mode==='brawl'?`<label>Objeto<select name="object">${Object.entries(BRAWL_OBJECTS).map(([id,t])=>`<option value="${id}">${t.label} (${t.attack>=0?'+':''}${t.attack})</option>`).join('')}</select></label>`:''}${mode!=='grapple'?'<label>Mão<select name="hand"><option value="right">Direita</option><option value="left">Esquerda</option></select></label>':''}<label>Modificador<input type="number" name="judge" step="1" value="0"></label>${mode!=='knife'?'<label><input type="checkbox" name="defend" checked> Alvo pode se defender</label>':''}<label><input type="checkbox" name="openingExempt"> Abertura dispensada pelo Juiz (costas ou outra exceção)</label>`;
   const chosen=await foundry.applications.api.DialogV2.prompt({window:{title:mode==='knife'?'Faca / espada':mode==='grapple'?'Imobilização':'Briga'},content,ok:{label:'Atacar',callback:(e,b,d)=>({object:d.element.querySelector('[name="object"]')?.value??'none',hand:d.element.querySelector('[name="hand"]')?.value??options.hand,judge:Number(d.element.querySelector('[name="judge"]').value),defend:d.element.querySelector('[name="defend"]')?.checked??false,openingExempt:d.element.querySelector('[name="openingExempt"]').checked})},rejectClose:false});
   if(!chosen) return;options=chosen;
  }
  if(mode==='brawl'&&options.object==='none'&&!free.includes(options.hand)) return ui.notifications.warn('Libere essa mão ou escolha o objeto usado como arma com Shift+clique.');
  if(!Number.isInteger(options.judge)||mode!=='grapple'&&!hands.includes(options.hand)) return ui.notifications.warn('Mão presa ou ajuste inválido.');
  const defender=token.actor;
  const targetHolds=defender.getFlag('boothill','meleeState')?.holds??[];
  const openingNeeded=defender.system.combat.bladeReady&&!targetHolds.some(h=>h.source===actor.uuid||h.kind==='rightArm'||h.kind==='bear')&&!options.openingExempt;
  const skill=actor.system.skills[mode==='knife'?'faca-espada':'briga']??0;
  const wounds=healthSummary(actor.system.health,actor.system.attributes.strength).penalty;
  if(openingNeeded) {
   const attr=await foundry.applications.api.DialogV2.prompt({window:{title:'Encontrar abertura'},content:'<label>Atributo<select name="attribute"><option value="coordination">Coordenação</option><option value="observation">Observação</option></select></label><p>Metade do atributo, arredondada para cima, mais a perícia e ajustes.</p>',ok:{label:'Testar abertura',callback:(e,b,d)=>d.element.querySelector('[name="attribute"]').value},rejectClose:false});
   if(!attr) return;
   const effect=pendingMeleeModifier(actor),target=Math.ceil(actor.system.attributes[attr]/2)+skill+wounds+effect;
   const roll=await new Roll('1d20').evaluate();const luckRoll=needsLuck(roll.total,target)?await new Roll('1d20').evaluate():null;
   await consumeMeleeModifier(actor);
   const success=succeeds(roll.total,target,luckRoll?.total,actor.system.attributes.luck);
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:luckRoll?[roll,luckRoll]:[roll],flavor:`Abertura: ${success?'Sucesso':'Falha'} · ${target} / ${roll.total}${luckRoll?` · Sorte ${actor.system.attributes.luck} / ${luckRoll.total}`:''}`});
   if(!success) return;
  }
  const effect=pendingMeleeModifier(actor),roll=await new Roll('1d20').evaluate();await consumeMeleeModifier(actor);
  const result=meleeResult({mode,die:roll.total,skill,defense:options.defend?(defender.system.skills.briga??0):0,stronger:actor.system.combat.stronger,wounds,effect,judge:options.judge,object:options.object,hand:options.hand,ambidextrous:actor.system.identity.ambidextrous,freeHands:Math.min(hands.length,2-availableHands)});
  if(mode==='knife') {
   if(result.severity!==null) {
    const data={title:`Faca / espada · ${result.label}`,target:result.total,die:roll.total,luck:actor.system.attributes.luck,bladeHit:true,defectCleared:true,shot:{mode:'aimed',range:'short',skill,wound:result.severity},targetTokenUuid:token.uuid,modifiers:result.modifiers,note:'Ferimento de lâmina: localização e gravidade; sem bônus de Força e sem consumir munição.'};
    // The shared injury workflow handles location, severity, targeting and mortal wounds.
    const {rollCard}=await import('./chat.mjs');
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:rollCard(data),flags:{boothill:{check:data}}});
   } else await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],flavor:`Faca / espada · ${result.label} · Total ${result.total}: sem ferimento.`});
   return;
  }
  const data={actorUuid:actor.uuid,targetTokenUuid:token.uuid,targetName:token.name,result,title:mode==='brawl'?'Briga':'Imobilização'};
  const message=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:meleeCard(data),flags:{boothill:{melee:data}}});await requestMelee(message);
 } catch(error) {console.error(error);ui.notifications.error('Não foi possível resolver o ataque corpo a corpo.');}
 finally {this._meleeRolling=false;}
}
