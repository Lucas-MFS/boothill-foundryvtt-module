import {t} from './localization.mjs';
import {advanceReload} from './weapon-rules.mjs';
export function reloadPlan(weapon,quantity) {
 if(weapon.ammo>=weapon.capacity) return {...advanceReload(weapon),used:0};
 if(!Number.isInteger(quantity)||quantity<=0) return null;
 const next=advanceReload(weapon),used=Math.min(quantity,next.ammo-weapon.ammo);
 return {...next,ammo:weapon.ammo+used,used};
}
const reloading=new Set();
export async function reloadWithReserve(item,previous) {
 const actor=item.actor;
 if(!actor) {
  const next=advanceReload({...item.system.toObject(),...previous});
  await item.update({'system.ammo':next.ammo,'system.reloadProgress':next.reloadProgress});return next;
 }
 if(reloading.has(actor.uuid)) return null;
 reloading.add(actor.uuid);
 try {
  const data={...item.system.toObject(),...previous};
  const reserve=actor.items.get(item.system.ammunitionId);
  if(data.ammo<data.capacity&&reserve?.type!=='ammunition') {ui.notifications.warn(t("Selecione a munição desta arma no painel de armamento."));return null;}
  const next=reloadPlan(data,reserve?.system.quantity??0);
  if(!next) {ui.notifications.warn(t("A munição selecionada acabou."));return null;}
  await actor.updateEmbeddedDocuments('Item',[
   {_id:item.id,'system.ammo':next.ammo,'system.reloadProgress':next.reloadProgress},
   ...(next.used?[{_id:reserve.id,'system.quantity':reserve.system.quantity-next.used}]:[])
  ]);
  return next;
 } finally {reloading.delete(actor.uuid);}
}
export function inventoryItems(actor) {
 return actor.items.filter(i=>['weapon','ammunition'].includes(i.type)).map(i=>({id:i.id,name:i.name,img:i.img,documentItem:true,weapon:i.type==='weapon',quantity:i.type==='weapon'?1:i.system.quantity,weight:i.system.weight??0}));
}
