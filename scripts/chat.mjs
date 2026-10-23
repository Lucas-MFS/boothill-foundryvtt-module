import {defectResult,defectCard} from './defects.mjs';
import {isShotgun,pelletCount,spreadInfo,pelletsCard,spreadCard} from './shotgun.mjs';
import {registerDamage,requestDamage} from './damage.mjs';
import {mountedRecipient} from './mounts.mjs';
import {injuryChoiceShot,injuryCard,locationChoices,injuryResult} from './injury.mjs';
import {needsLuck,succeeds} from './rules.mjs';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function modifierText(entries=[]) {
  const rows=entries.filter(([,value])=>Number.isFinite(value)&&value!==0);
  return rows.length?`<small class="bh-roll-modifiers">${rows.map(([label,value])=>`${escape(label)} ${value>0?'+':''}${value}`).join(' · ')}</small>`:'';
}
export function rollCard(data) {
  const {title,target,die,luck,luckDie,modifiers=[],note=''}=data;
  const defectPending=!!data.shot&&!data.bladeHit&&!data.secondary&&!data.pelletChild&&die===20&&!data.defectCleared&&!data.defect;
  const blocked=data.defect&&!data.defect.fired;
  const pending=!blocked&&!data.bladeHit&&needsLuck(die,target)&&!Number.isInteger(luckDie);
  const success=!blocked&&(data.bladeHit||succeeds(die,target,luckDie,luck));
  const state=pending||defectPending?'pending':success?'success':'failure';
  return `<article class="bh-roll-card bh-roll-${state}"><header><span>BOOT HILL</span><h3>${escape(title)}</h3></header><div class="bh-roll-score" aria-label="Chance ${target}; rolagem ${die}"><strong>${target}</strong><span>/</span><strong>${die}</strong></div><div class="bh-roll-captions"><span>${data.bladeHit?'Total ajustado':'Chance de acerto'}</span><span>Rolagem · d20</span></div><p class="bh-roll-outcome">${defectPending?'Aguardando verificação de defeito':pending?'Aguardando Sorte':success?'Sucesso':'Falha'}</p>${modifierText(modifiers)}${defectCard(data)}${pending?`<button type="button" data-bh-luck><i class="fas fa-clover" aria-hidden="true"></i> Rolar Sorte <span>${luck}</span></button>`:''}${Number.isInteger(luckDie)?`<div class="bh-luck-result">Sorte <strong>${luck} / ${luckDie}</strong> · ${luckDie<=luck?'Sucesso':'Falha'}</div>`:''}${!defectPending&&!pending&&success?(isShotgun(data)&&!data.pelletChild?pelletsCard(data):injuryCard(data)):''}${!defectPending&&!blocked?spreadCard(data):''}${note?`<small class="bh-roll-note">${escape(note)}</small>`:''}</article>`;
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
    for(const action of content.querySelectorAll?.('[data-bh-defect],[data-bh-explosion]')??[]) {
      action.disabled=!(message.isAuthor||game.user.isGM)||resolving.has(message.id);
      action.addEventListener('click',async()=>{
        if(!(message.isAuthor||game.user.isGM)||resolving.has(message.id)) return;
        resolving.add(message.id);
        try {
          const current=message.getFlag('boothill','check');
          if(!current.shot||current.bladeHit||current.secondary||current.pelletChild||current.die!==20) return;
          if(action.hasAttribute('data-bh-defect')) {
            if(current.defect||current.defectCleared) return;
            let item=current.shot.weaponUuid?await fromUuid(current.shot.weaponUuid):null;
            if(!item&&!current.shot.weaponUuid) {
              const actor=game.actors.get(message.speaker.actor);
              const weapons=actor?.items.filter(i=>i.type==='weapon')??[];
              if(!weapons.length) return ui.notifications.warn('Arma original indisponível.');
              const choice=await foundry.applications.api.DialogV2.prompt({window:{title:'Disparo antigo · identificar arma'},content:`<label>Arma <select name="weapon">${weapons.map(w=>`<option value="${escape(w.id)}">${escape(w.name)}</option>`).join('')}</select></label><label>Balas antes deste tiro <input type="number" name="ammo" min="1" step="1" value="2"></label>`,ok:{label:'Verificar defeito',callback:(e,b,d)=>({id:d.element.querySelector('[name=weapon]').value,ammo:Number(d.element.querySelector('[name=ammo]').value)})},rejectClose:false});
              if(!choice||!Number.isInteger(choice.ammo)||choice.ammo<1) return;
              item=actor.items.get(choice.id);
              if(!item) return;
              current.shot={...current.shot,weaponUuid:item.uuid,actorUuid:actor.uuid,ammoBefore:choice.ammo,model:item.system.model};
            }
            if(!item||!item.isOwner) return ui.notifications.warn('É necessário ter acesso à arma original para resolver seu defeito.');
            const roll=await new Roll('1d20').evaluate();
            const defect=defectResult(current.shot.model,roll.total,current.shot.ammoBefore??2);
            const next={...current,defect,defectCleared:defect.fired,note:current.note?.startsWith('20 natural:')?'':current.note};
            await message.update({content:rollCard(next),'flags.boothill.check':next,rolls:[...message.rolls,roll]});
            if(defect.blocked) await item.update({'system.malfunction':defect.blocked,'system.jamProgress':0});
            if(defect.kind==='explosion') await item.update({'system.ammo':0,'system.reloadProgress':0});
          } else {
            if(current.defect?.kind!=='explosion'||current.explosionMessage) return;
            const actor=await fromUuid(current.shot.actorUuid);
            if(!actor?.isOwner) return;
            const hand=await foundry.applications.api.DialogV2.prompt({window:{title:'Mão atingida pela explosão'},content:'<label>Mão <select name="hand"><option value="rightArm">Direita</option><option value="leftArm">Esquerda</option></select></label>',ok:{label:'Rolar gravidade',callback:(e,b,d)=>d.element.querySelector('[name=hand]').value},rejectClose:false});
            if(!['leftArm','rightArm'].includes(hand)) return;
            const roll=await new Roll('1d6').evaluate();
            const next={title:'Explosão · Ferimento na mão',target:1,die:1,luck:actor.system.attributes.luck,bladeHit:true,defectCleared:true,shot:{wound:current.defect.bonus},injury:injuryResult(roll.total,hand,current.defect.bonus),note:'Mão representada pela região do braço. Aplique ao token do atirador.'};
            const created=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),whisper:message.whisper,blind:message.blind,style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:[roll],content:rollCard(next),flags:{boothill:{check:next}}});
            const updated={...current,explosionMessage:created.id};
            await message.update({content:rollCard(updated),'flags.boothill.check':updated});
          }
        } catch(error) {console.error(error);ui.notifications.error('Não foi possível resolver o defeito.');}
        finally {resolving.delete(message.id);}
      });
    }
    for(const action of content.querySelectorAll?.('[data-bh-pellets]')??[]) {
      if(action.disabled) continue;
      action.disabled=!(message.isAuthor||game.user.isGM)||resolving.has(message.id);
      action.addEventListener('click',async()=>{
        if(!(message.isAuthor||game.user.isGM)||resolving.has(message.id)) return;
        resolving.add(message.id);
        try {
          const current=message.getFlag('boothill','check'),kind=action.dataset.bhPellets;
          if(!isShotgun(current)||current.defect&&!current.defect.fired) return;
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
        if(current.defect&&!current.defect.fired) return;
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
            if(kind==='location'&&!current.locationDie) {roll=await new Roll('1d20').evaluate();next.locationDie=roll.total;const targets=[...game.user.targets];next.targetTokenUuid=current.secondary?null:(current.pelletChild||current.bladeHit)?(current.targetTokenUuid??null):targets.length===1?targets[0].document.uuid:null;if(next.targetTokenUuid) {
              const target=await fromUuid(next.targetTokenUuid);next.animalTarget=target?.actor?.type==='horse';
              const mount=target?.actor?.system.mount;
              next.riderMounted=!!mount?.mounted;
              next.mountedHint=mount?.uuid?(mount.mounted?'Alvo montado: perna ou abdômen com localização ímpar transfere o tiro ao cavalo.':'O alvo tem cavalo vinculado, mas está marcado como Desmontado. Confira a ficha do token alvo.'):!next.animalTarget?'O token alvo não está marcado como montado. Em tokens desvinculados, confira o vínculo na ficha do próprio token.':'';
            }if(targets.length>1) ui.notifications.warn('Mais de um alvo marcado: use Aplicar dano em um token selecionado.');}
            else if(current.locationDie&&locationChoices(current.locationDie,injuryChoiceShot(current)).some(r=>r.id===kind&&r.available)) {
              const value=locationChoices(current.locationDie,injuryChoiceShot(current)).find(r=>r.id===kind).value;
              const token=current.targetTokenUuid?await fromUuid(current.targetTokenUuid):null;
              const recipient=token&&!current.mountResolution&&!current.bladeHit?await mountedRecipient(token,kind,value):null;
              if(recipient) {
                roll=await new Roll('1d20').evaluate();
                next={...next,locationDie:roll.total,locationValue:roll.total,animalTarget:recipient.actor.type==='horse',riderMounted:false,targetTokenUuid:recipient.uuid,mountResolution:{fromTokenUuid:token.uuid,toTokenUuid:recipient.uuid,fromName:token.name,toName:recipient.name,originalLocation:value,newLocation:roll.total}};
              } else {roll=await new Roll('1d6').evaluate();next.locationValue=value;next.injury=injuryResult(roll.total,kind,current.shot.wound);}
            }
            else return;
          }
          await message.update({content:rollCard(next),'flags.boothill.check':next,...(roll?{rolls:[...message.rolls,roll]}:{})});
          if(next.injury&&next.targetTokenUuid&&!next.secondary) await requestDamage(message,next.targetTokenUuid);
        } catch(error) {console.error(error);ui.notifications.error(error.message||'Não foi possível registrar o ferimento.');}
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
