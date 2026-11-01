import {t} from './localization.mjs';
export function targetMovementPenalty(actor,combat=globalThis.game?.combat) {
  const state=actor?.system?.combat;
  if(!state) return 0;
  if(state.movementCombat&&(!combat||state.movementCombat!==combat.id||state.movementRound!==combat.round)) return 0;
  return ['dodge','gallop'].includes(state.movement)?-4:['run','trot'].includes(state.movement)?-2:0;
}
export function shootingModifiers({size=0,visibility=0,ambush=false,modifier=0,movement=0}={}) {
  size=Number(size);modifier=Number(modifier);movement=Number(movement);visibility=Number(visibility);
  if(![-4,-2,0,2,4].includes(size)||![-4,-2,0].includes(movement)||![-4,-2,0].includes(visibility)||!Number.isInteger(modifier)) return null;
  const entries=[[t('Modificador'),modifier],[t('Tamanho do alvo'),size],[visibility===-4?t('Escuridão'):t('Alvo obscuro'),visibility],[t('Espreita'),ambush?2:0],[t('Movimento do alvo'),movement]];
  return {entries,total:entries.reduce((sum,[,value])=>sum+value,0)};
}
export async function promptShootingModifiers(event,title,{actor=null}={}) {
  const movement=targetMovementPenalty(actor);
  if(!event.shiftKey) return shootingModifiers({movement});
  const sizes=[[4,'Muito grande (+4)'],[2,'Grande (+2)'],[0,'Normal (0)'],[-2,'Pequeno (−2)'],[-4,'Muito pequeno (−4)']];
  const escape=foundry.utils.escapeHTML;
  const content=`<div class="form-group"><label>${t('Modificador')}</label><input name="modifier" type="number" step="1" value="0" autofocus></div>
    <div class="form-group"><label>${t('Tamanho do alvo')}</label><select name="size">${sizes.map(([value,label])=>`<option value="${value}" ${value===0?'selected':''}>${escape(t(label))}</option>`).join('')}</select></div>
    <div class="form-group"><label>${t('Visibilidade')}</label><select name="visibility"><option value="0">${t('Normal (0)')}</option><option value="-2">${t('Alvo obscuro (−2)')}</option><option value="-4">${t('Escuridão (−4)')}</option></select></div>
    <div class="form-group"><label>${t('Espreita com apoio sólido (+2, somente primeiro tiro)')}</label><input name="ambush" type="checkbox"></div>
    ${actor?`<p>${t('Movimento do alvo (automático)')}: ${movement}</p>`:`<div class="form-group"><label>${t('Movimento do alvo')}</label><select name="movement"><option value="0">${t('Sem penalidade')}</option><option value="-2">${t('Correndo / trotando (−2)')}</option><option value="-4">${t('Esquivando / galopando (−4)')}</option></select></div>`}
    `;
  const choice=await foundry.applications.api.DialogV2.prompt({window:{title},content,ok:{label:t('Confirmar'),callback:(event,button,dialog)=>{
    const field=name=>dialog.element.querySelector(`[name="${name}"]`);
    return {size:field('size').value,visibility:field('visibility').value,ambush:field('ambush').checked,modifier:field('modifier').value,movement:actor?0:field('movement').value};
  }},rejectClose:false});
  if(!choice) return null;
  // Re-read the declared movement after the dialog; do not stack it with a manual value.
  return shootingModifiers({...choice,movement:actor?targetMovementPenalty(actor):choice.movement});
}
