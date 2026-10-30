import {t} from './localization.mjs';
import {injuryCard,injuryResult,HIT_REGIONS} from './injury.mjs';
import {healthSummary} from './combat-rules.mjs';
import {requestDamage} from './damage.mjs';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function animalAttackResult(die,modifier) {return {total:die+modifier,hit:die+modifier>=8};}
export function animalAttackCard(data) {
 const hit=data.attackTotal>=8;
 return `<article class="bh-roll-card bh-roll-${hit?'success':'failure'}"><header><span>BOOT HILL</span><h3><i class="fas fa-paw" aria-hidden="true"></i> ${escape(data.title)}</h3></header><div class="bh-roll-score"><strong>${data.attackTotal}</strong><span>/</span><strong>8</strong></div><div class="bh-roll-captions"><span>${t("Resultado do ataque")}</span><span>${t("Mínimo para ferir")}</span></div><p class="bh-roll-outcome">${hit?t("Acertou"):t("Errou")}</p><small class="bh-roll-modifiers">d20 ${data.attackDie} ${t("· Ataque")} ${data.attackModifier>=0?'+':''}${data.attackModifier}</small>${hit?injuryCard(data):''}</article>`;
}
export async function attackAnimal(event) {
 if(!this.isEditable||this._animalAttacking) return;
 this._animalAttacking=true;
 try {
  await this.submit();const actor=this.actor;
  const health=healthSummary(actor.system.health,actor.system.attributes.strength);
  if(actor.system.attributes.strength<=0||health.unconscious) return ui.notifications.warn(t("O animal está incapacitado."));
  let judge=0;
  if(event.shiftKey) judge=await foundry.applications.api.DialogV2.prompt({window:{title:t("Ataque do animal")},content:`<label>${t("Modificador")}<input name="modifier" type="number" value="0"></label>`,ok:{label:t("Atacar"),callback:(e,b,d)=>Number(d.element.querySelector('[name=modifier]').value)},rejectClose:false});
  if(!Number.isInteger(judge)) return;
  const targets=[...game.user.targets];if(targets.length>1) return ui.notifications.warn(t("Marque apenas um alvo."));
  const token=targets[0]?.document;if(token&&token.actor?.uuid===actor.uuid) return ui.notifications.warn(t("Escolha outro alvo."));
  const roll=await new Roll('1d20').evaluate(),modifier=actor.system.animal.attack+health.penalty+judge,result=animalAttackResult(roll.total,modifier),rolls=[roll];
  const data={animalAttack:true,title:`${t("Ataque ·")} ${actor.name}`,attackDie:roll.total,attackModifier:modifier,attackTotal:result.total,bladeHit:true,defectCleared:true,target:8,die:roll.total,luck:0,shot:{wound:actor.system.animal.severity,skill:0,mode:'fan',range:'close'},targetTokenUuid:token?.uuid??null,animalTarget:['horse','wildAnimal'].includes(token?.actor?.type)};
  if(result.hit) {
   const location=await new Roll('1d20').evaluate(),severity=await new Roll('1d6').evaluate();rolls.push(location,severity);
   const id=HIT_REGIONS.find(([,min,max])=>location.total>=min&&location.total<=max)[0];
   data.locationDie=location.total;data.locationValue=location.total;data.injury=injuryResult(severity.total,id,actor.system.animal.severity);
  }
  const message=await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls,content:animalAttackCard(data),flags:{boothill:{check:data}}});
  if(result.hit&&token) await requestDamage(message,token.uuid);
 } finally {this._animalAttacking=false;}
}
