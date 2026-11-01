import {t} from './localization.mjs';
export function targetMovementPenalty(actor,combat=globalThis.game?.combat) {
  const state=actor?.system?.combat;
  if(!state) return 0;
  if(state.movementCombat&&(!combat||state.movementCombat!==combat.id||state.movementRound!==combat.round)) return 0;
  return ['dodge','gallop'].includes(state.movement)?-4:['run','trot'].includes(state.movement)?-2:0;
}
export function shootingModifiers({size=0,obscured=false,darkness=false,ambush=false,modifier=0,movement=0}={}) {
  size=Number(size);modifier=Number(modifier);movement=Number(movement);
  if(![-4,-2,0,2,4].includes(size)||![-4,-2,0].includes(movement)||!Number.isInteger(modifier)) return null;
  const entries=[[t('Tamanho do alvo'),size],[t('Alvo obscuro'),obscured?-2:0],[t('Escuridão'),darkness?-4:0],[t('Espreita'),ambush?2:0],[t('Modificador'),modifier],[t('Movimento do alvo'),movement]];
  return {entries,total:entries.reduce((sum,[,value])=>sum+value,0)};
}
export async function promptShootingModifiers(event,title,{actor=null}={}) {
  const movement=targetMovementPenalty(actor);
  if(!event.shiftKey) return shootingModifiers({movement});
  const sizes=[[4,'Muito grande (+4)'],[2,'Grande (+2)'],[0,'Normal (0)'],[-2,'Pequeno (−2)'],[-4,'Muito pequeno (−4)']];
  const escape=foundry.utils.escapeHTML;
  const content=`<div class="form-group"><label>${t('Tamanho do alvo')}</label><select name="size">${sizes.map(([value,label])=>`<option value="${value}" ${value===0?'selected':''}>${escape(t(label))}</option>`).join('')}</select></div>
    <div class="form-group"><label>${t('Alvo obscuro (−2)')}</label><input name="obscured" type="checkbox"></div>
    <div class="form-group"><label>${t('Escuridão (−4)')}</label><input name="darkness" type="checkbox"></div>
    <div class="form-group"><label>${t('Espreita com apoio sólido (+2, somente primeiro tiro)')}</label><input name="ambush" type="checkbox"></div>
    ${actor?`<p>${t('Movimento do alvo (automático)')}: ${movement}</p>`:`<div class="form-group"><label>${t('Movimento do alvo')}</label><select name="movement"><option value="0">${t('Sem penalidade')}</option><option value="-2">${t('Correndo / trotando (−2)')}</option><option value="-4">${t('Esquivando / galopando (−4)')}</option></select></div>`}
    <div class="form-group"><label>${t('Modificador')}</label><input name="modifier" type="number" step="1" value="0"></div>`;
  const choice=await foundry.applications.api.DialogV2.prompt({window:{title},content,ok:{label:t('Confirmar'),callback:(event,button,dialog)=>{
    const field=name=>dialog.element.querySelector(`[name="${name}"]`);
    return {size:field('size').value,obscured:field('obscured').checked,darkness:field('darkness').checked,ambush:field('ambush').checked,modifier:field('modifier').value,movement:actor?0:field('movement').value};
  }},rejectClose:false});
  if(!choice) return null;
  // Re-read the declared movement after the dialog; do not stack it with a manual value.
  return shootingModifiers({...choice,movement:actor?targetMovementPenalty(actor):choice.movement});
}
