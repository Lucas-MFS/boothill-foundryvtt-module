import {registerDamage,requestDamage} from './damage.mjs';
import {injuryCard,locationChoices,injuryResult} from './injury.mjs';
import {needsLuck,succeeds} from './rules.mjs';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function modifierText(entries=[]) {
  const rows=entries.filter(([,value])=>Number.isFinite(value)&&value!==0);
  return rows.length?`<small class="bh-roll-modifiers">${rows.map(([label,value])=>`${escape(label)} ${value>0?'+':''}${value}`).join(' · ')}</small>`:'';
}
export function rollCard(data) {
  const {title,target,die,luck,luckDie,modifiers=[],note=''}=data;
  const pending=needsLuck(die,target)&&!Number.isInteger(luckDie);
  const success=succeeds(die,target,luckDie,luck);
  const state=pending?'pending':success?'success':'failure';
  return `<article class="bh-roll-card bh-roll-${state}"><header><span>BOOT HILL</span><h3>${escape(title)}</h3></header><div class="bh-roll-score" aria-label="Chance ${target}; rolagem ${die}"><strong>${target}</strong><span>/</span><strong>${die}</strong></div><div class="bh-roll-captions"><span>Chance de acerto</span><span>Rolagem · d20</span></div><p class="bh-roll-outcome">${pending?'Aguardando Sorte':success?'Sucesso':'Falha'}</p>${modifierText(modifiers)}${pending?`<button type="button" data-bh-luck><i class="fas fa-clover" aria-hidden="true"></i> Rolar Sorte <span>${luck}</span></button>`:''}${Number.isInteger(luckDie)?`<div class="bh-luck-result">Sorte <strong>${luck} / ${luckDie}</strong> · ${luckDie<=luck?'Sucesso':'Falha'}</div>`:''}${!pending&&success?injuryCard(data):''}${note?`<small class="bh-roll-note">${escape(note)}</small>`:''}</article>`;
}
export async function postCheck(actor,{title,target,roll,modifiers=[],note='',shot=null}) {
  const check={title,target,die:roll.total,luck:actor.system.attributes.luck,modifiers,note,shot};
  return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:rollCard(check),flags:{boothill:{check}}});
}
const resolving=new Set();
export function registerChatCards() {
  registerDamage(rollCard);
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const data=message.getFlag('boothill','check');
    if(!data||!message.isContentVisible) return;
    html.classList.add('bh-chat-message');
    const content=html.querySelector('.message-content');
    if(!content) return;
    content.innerHTML=rollCard(data);
    for(const action of content.querySelectorAll?.('[data-bh-injury]')??[]) {
      if(action.disabled) continue;
      action.disabled=!(message.isAuthor||game.user.isGM)||resolving.has(message.id);
      action.addEventListener('click',async()=>{
        if(!(message.isAuthor||game.user.isGM)||resolving.has(message.id)) return;
        const current=message.getFlag('boothill','check');
        if(!current.shot||current.injury||!succeeds(current.die,current.target,current.luckDie,current.luck)) return;
        const kind=action.dataset.bhInjury;
        resolving.add(message.id);
        try {
          let next={...current},roll;
          if(kind==='defect'&&current.die===20&&!current.defectCleared) {
            if(!game.user.isGM) return ui.notifications.warn('O Juiz deve confirmar o resultado da verificação de defeito.');
            next.defectCleared=true;
          } else {
            if(current.die===20&&!current.defectCleared) return;
            if(kind==='location'&&!current.locationDie) {roll=await new Roll('1d20').evaluate();next.locationDie=roll.total;const targets=[...game.user.targets];next.targetTokenUuid=targets.length===1?targets[0].document.uuid:null;if(targets.length>1) ui.notifications.warn('Mais de um alvo marcado: use Aplicar dano em um token selecionado.');}
            else if(current.locationDie&&locationChoices(current.locationDie,current.shot).some(r=>r.id===kind&&r.available)) {roll=await new Roll('1d6').evaluate();next.injury=injuryResult(roll.total,kind,current.shot.wound);}
            else return;
          }
          await message.update({content:rollCard(next),'flags.boothill.check':next,...(roll?{rolls:[...message.rolls,roll]}:{})});
          if(next.injury&&next.targetTokenUuid) await requestDamage(message,next.targetTokenUuid);
        } catch(error) {console.error(error);ui.notifications.error('Não foi possível registrar o ferimento.');}
        finally {resolving.delete(message.id);}
      });
    }
    const damageButton=content.querySelector('[data-bh-damage]');
    damageButton?.addEventListener('click',async()=>{
      const selected=canvas.tokens.controlled;
      if(selected.length!==1) return ui.notifications.warn('Selecione exatamente um token (não apenas um alvo).');
      damageButton.disabled=true;
      try {await requestDamage(message,selected[0].document.uuid);} finally {damageButton.disabled=false;}
    });
    const button=content.querySelector('[data-bh-luck]');
    if(!button) return;
    button.disabled=!(message.isAuthor||game.user.isGM)||resolving.has(message.id);
    button.addEventListener('click',async()=>{
      if(!(message.isAuthor||game.user.isGM)||resolving.has(message.id)) return;
      const current=message.getFlag('boothill','check');
      if(!needsLuck(current.die,current.target)||Number.isInteger(current.luckDie)) return;
      resolving.add(message.id);button.disabled=true;
      try {
        const roll=await new Roll('1d20').evaluate();
        const next={...current,luckDie:roll.total};
        await message.update({content:rollCard(next),'flags.boothill.check':next,rolls:[...message.rolls,roll]});
      } catch(error) {ui.notifications.error('Não foi possível registrar o teste de Sorte.');console.error(error);button.disabled=false;}
      finally {resolving.delete(message.id);}
    });
  });
}
