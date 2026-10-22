import {isShotgun,pelletCount,spreadInfo,pelletsCard,spreadCard} from './shotgun.mjs';
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
  const pending=!data.bladeHit&&needsLuck(die,target)&&!Number.isInteger(luckDie);
  const success=data.bladeHit||succeeds(die,target,luckDie,luck);
  const state=pending?'pending':success?'success':'failure';
  return `<article class="bh-roll-card bh-roll-${state}"><header><span>BOOT HILL</span><h3>${escape(title)}</h3></header><div class="bh-roll-score" aria-label="Chance ${target}; rolagem ${die}"><strong>${target}</strong><span>/</span><strong>${die}</strong></div><div class="bh-roll-captions"><span>${data.bladeHit?'Total ajustado':'Chance de acerto'}</span><span>Rolagem · d20</span></div><p class="bh-roll-outcome">${pending?'Aguardando Sorte':success?'Sucesso':'Falha'}</p>${modifierText(modifiers)}${pending?`<button type="button" data-bh-luck><i class="fas fa-clover" aria-hidden="true"></i> Rolar Sorte <span>${luck}</span></button>`:''}${Number.isInteger(luckDie)?`<div class="bh-luck-result">Sorte <strong>${luck} / ${luckDie}</strong> · ${luckDie<=luck?'Sucesso':'Falha'}</div>`:''}${!pending&&success?(isShotgun(data)&&!data.pelletChild?pelletsCard(data):injuryCard(data)):''}${spreadCard(data)}${note?`<small class="bh-roll-note">${escape(note)}</small>`:''}</article>`;
}
export async function postCheck(actor,{title,target,roll,modifiers=[],note='',shot=null,whisper=null}) {
  const check={title,target,die:roll.total,luck:actor.system.attributes.luck,modifiers,note,shot};
  return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),...(whisper?{whisper}:{}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:rollCard(check),flags:{boothill:{check}}});
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
    for(const action of content.querySelectorAll?.('[data-bh-pellets]')??[]) {
      if(action.disabled) continue;
      action.disabled=!(message.isAuthor||game.user.isGM)||resolving.has(message.id);
      action.addEventListener('click',async()=>{
        if(!(message.isAuthor||game.user.isGM)||resolving.has(message.id)) return;
        resolving.add(message.id);
        try {
          const current=message.getFlag('boothill','check'),kind=action.dataset.bhPellets;
          if(!isShotgun(current)) return;
          if(kind==='secondary') {
            const info=spreadInfo(current);if(!info) return;
            if(current.die===20&&!current.defectCleared) {
              if(!game.user.isGM||!await foundry.applications.api.DialogV2.confirm({window:{title:'Defeito da arma'},content:'<p>A verificação confirmou ausência de defeito no disparo original?</p>'})) return;
              current.defectCleared=true;await message.update({'flags.boothill.check.defectCleared':true});
            }
            const roll=await new Roll('1d20').evaluate();
            const next={title:`${current.title} · Alvo secundário`,target:info.target,die:roll.total,luck:current.luck,shot:{...current.shot,skill:0,mode:'fan'},secondary:true,defectCleared:true,modifiers:[],note:'Alvo secundário: sem ajuste de localização; dano manual pelo Juiz.'};
            await ChatMessage.create({speaker:message.speaker,whisper:message.whisper,blind:message.blind,style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:rollCard(next),flags:{boothill:{check:next}}});
            return;
          }
          if(!(current.bladeHit||succeeds(current.die,current.target,current.luckDie,current.luck))) return;
          let next={...current},roll;
          if(kind==='count'&&current.pelletsDie===undefined) {
            if(current.die===20&&!current.defectCleared) {
              if(!game.user.isGM||!await foundry.applications.api.DialogV2.confirm({window:{title:'Defeito da arma'},content:'<p>A verificação manual confirmou que a arma disparou sem defeito?</p>'})) return;
              next.defectCleared=true;
            }
            roll=await new Roll('1d6').evaluate();next.pelletsDie=roll.total;next.pelletsCount=pelletCount(roll.total,current.shot.range);next.pelletMessages={};
            const targets=[...game.user.targets];next.targetTokenUuid=!current.secondary&&targets.length===1?targets[0].document.uuid:null;
          } else if(kind==='manual'&&current.pelletsCount===null&&game.user.isGM) {
            const value=Number(content.querySelector('[data-bh-pellets-count]').value);if(!Number.isInteger(value)||value<0||value>4) return;
            next.pelletsCount=value;next.pelletsManual=true;
          } else if(kind==='wound') {
            const index=Number(action.dataset.index);
            if(!Number.isInteger(index)||index<0||index>=current.pelletsCount||current.pelletMessages?.[index]) return;
            const child={title:`${current.title} · Ferimento ${index+1}/${current.pelletsCount}`,target:current.target,die:current.die,luck:current.luck,...(current.luckDie!==undefined?{luckDie:current.luckDie}:{}),shot:{...current.shot},pelletChild:true,secondary:!!current.secondary,targetTokenUuid:current.targetTokenUuid??null,defectCleared:current.defectCleared??false,modifiers:[],note:current.secondary?'Alvo secundário: dano manual pelo Juiz.':''};
            const created=await ChatMessage.create({speaker:message.speaker,whisper:message.whisper,blind:message.blind,style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[],content:rollCard(child),flags:{boothill:{check:child}}});
            next.pelletMessages={...current.pelletMessages,[index]:created.id};
          } else return;
          await message.update({content:rollCard(next),'flags.boothill.check':next,...(roll?{rolls:[...message.rolls,roll]}:{})});
        } catch(error) {console.error(error);ui.notifications.error('Não foi possível resolver a dispersão.');}
        finally {resolving.delete(message.id);}
      });
    }
    for(const action of content.querySelectorAll?.('[data-bh-injury]')??[]) {
      if(action.disabled) continue;
      action.disabled=!(message.isAuthor||game.user.isGM)||resolving.has(message.id);
      action.addEventListener('click',async()=>{
        if(!(message.isAuthor||game.user.isGM)||resolving.has(message.id)) return;
        const current=message.getFlag('boothill','check');
        if(!current.shot||current.injury||!(current.bladeHit||succeeds(current.die,current.target,current.luckDie,current.luck))) return;
        const kind=action.dataset.bhInjury;
        resolving.add(message.id);
        try {
          let next={...current},roll;
          if(kind==='defect'&&current.die===20&&!current.defectCleared) {
            if(!game.user.isGM) return ui.notifications.warn('O Juiz deve confirmar o resultado da verificação de defeito.');
            next.defectCleared=true;
          } else {
            if(current.die===20&&!current.defectCleared) return;
            if(kind==='location'&&!current.locationDie) {roll=await new Roll('1d20').evaluate();next.locationDie=roll.total;const targets=[...game.user.targets];next.targetTokenUuid=current.secondary?null:(current.pelletChild||current.bladeHit)?(current.targetTokenUuid??null):targets.length===1?targets[0].document.uuid:null;if(targets.length>1) ui.notifications.warn('Mais de um alvo marcado: use Aplicar dano em um token selecionado.');}
            else if(current.locationDie&&locationChoices(current.locationDie,current.shot).some(r=>r.id===kind&&r.available)) {roll=await new Roll('1d6').evaluate();next.injury=injuryResult(roll.total,kind,current.shot.wound);}
            else return;
          }
          await message.update({content:rollCard(next),'flags.boothill.check':next,...(roll?{rolls:[...message.rolls,roll]}:{})});
          if(next.injury&&next.targetTokenUuid&&!next.secondary) await requestDamage(message,next.targetTokenUuid);
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
