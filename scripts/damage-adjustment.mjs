import {t} from './localization.mjs';
export function damageAdjustment(value={}) {
 const cover=String(value.cover??'0'),modifier=Number(value.modifier??0);
 if(!['0','-1','-2','-3','blocked'].includes(cover)||!Number.isInteger(modifier)||Math.abs(modifier)>100) throw new Error(t("Ajuste de gravidade inválido."));
 return {cover,modifier,blocked:cover==='blocked',total:cover==='blocked'?0:Number(cover)+modifier};
}
export async function promptDamageAdjustment(message,token) {
 const data=message.getFlag('boothill','check'),injury=data?.injury;
 if(!injury) return null;
 const escape=foundry.utils.escapeHTML;
 const defense=token.actor?.type==='wildAnimal'?token.actor.system.animal.defense:0;
 const result=await foundry.applications.api.DialogV2.prompt({window:{title:t("Aplicar dano")},content:`<p><strong>${escape(token.name)}</strong> ${t("· Gravidade atual:")} ${injury.total}</p><p>d6 ${injury.die} ${t("· Local")} ${injury.location??0} ${t("· Arma/golpe")} ${injury.weapon??0}${defense?` ${t("· Defesa do animal")} ${defense}`:''}</p><div class="form-group"><label>${t("Cobertura da região atingida")}</label><select name="cover"><option value="0">${t("Sem redução")}</option><option value="-1">${t("Cobertura leve (−1)")}</option><option value="-2">${t("Cobertura leve (−2)")}</option><option value="-3">${t("Cobertura leve (−3)")}</option><option value="blocked">${t("Proteção rígida — bloqueia o tiro")}</option></select></div><div class="form-group"><label>${t("Modificador")}</label><input name="modifier" type="number" step="1" min="-100" max="100" value="0"></div>`,ok:{label:t("Aplicar dano"),callback:(e,b,d)=>damageAdjustment({cover:d.element.querySelector('[name=cover]').value,modifier:d.element.querySelector('[name=modifier]').value})},rejectClose:false});
 return result&&typeof result==='object'?result:null;
}
