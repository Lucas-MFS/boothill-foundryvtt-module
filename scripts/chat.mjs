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
  return `<article class="bh-roll-card bh-roll-${state}"><header><span>BOOT HILL</span><h3>${escape(title)}</h3></header><div class="bh-roll-score" aria-label="Chance ${target}; rolagem ${die}"><strong>${target}</strong><span>/</span><strong>${die}</strong></div><div class="bh-roll-captions"><span>Chance de acerto</span><span>Rolagem · d20</span></div><p class="bh-roll-outcome">${pending?'Aguardando Sorte':success?'Sucesso':'Falha'}</p>${modifierText(modifiers)}${pending?`<button type="button" data-bh-luck><i class="fas fa-clover" aria-hidden="true"></i> Rolar Sorte <span>${luck}</span></button>`:''}${Number.isInteger(luckDie)?`<div class="bh-luck-result">Sorte <strong>${luck} / ${luckDie}</strong> · ${luckDie<=luck?'Sucesso':'Falha'}</div>`:''}${note?`<small class="bh-roll-note">${escape(note)}</small>`:''}</article>`;
}
export async function postCheck(actor,{title,target,roll,modifiers=[],note=''}) {
  const check={title,target,die:roll.total,luck:actor.system.attributes.luck,modifiers,note};
  return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:rollCard(check),flags:{boothill:{check}}});
}
const resolving=new Set();
export function registerChatCards() {
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    const data=message.getFlag('boothill','check');
    if(!data||!message.isContentVisible) return;
    html.classList.add('bh-chat-message');
    const content=html.querySelector('.message-content');
    if(!content) return;
    content.innerHTML=rollCard(data);
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
