export function damageAdjustment(value={}) {
 const cover=String(value.cover??'0'),modifier=Number(value.modifier??0);
 if(!['0','-1','-2','-3','blocked'].includes(cover)||!Number.isInteger(modifier)||Math.abs(modifier)>100) throw new Error('Ajuste de gravidade inválido.');
 return {cover,modifier,blocked:cover==='blocked',total:cover==='blocked'?0:Number(cover)+modifier};
}
export async function promptDamageAdjustment(message,token) {
 const data=message.getFlag('boothill','check'),injury=data?.injury;
 if(!injury) return null;
 const escape=foundry.utils.escapeHTML;
 const defense=token.actor?.type==='wildAnimal'?token.actor.system.animal.defense:0;
 const result=await foundry.applications.api.DialogV2.prompt({window:{title:'Aplicar dano'},content:`<p><strong>${escape(token.name)}</strong> · Gravidade atual: ${injury.total}</p><p>d6 ${injury.die} · Local ${injury.location??0} · Arma/golpe ${injury.weapon??0}${defense?` · Defesa do animal ${defense}`:''}</p><div class="form-group"><label>Cobertura da região atingida</label><select name="cover"><option value="0">Sem redução</option><option value="-1">Cobertura leve (−1)</option><option value="-2">Cobertura leve (−2)</option><option value="-3">Cobertura leve (−3)</option><option value="blocked">Proteção rígida — bloqueia o tiro</option></select></div><div class="form-group"><label>Modificador</label><input name="modifier" type="number" step="1" min="-100" max="100" value="0"></div>`,ok:{label:'Aplicar dano',callback:(e,b,d)=>damageAdjustment({cover:d.element.querySelector('[name=cover]').value,modifier:d.element.querySelector('[name=modifier]').value})},rejectClose:false});
 return result&&typeof result==='object'?result:null;
}
