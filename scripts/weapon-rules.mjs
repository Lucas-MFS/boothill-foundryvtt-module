import {t,localized} from './localization.mjs';
// Table 14, Portuguese reference PDF, physical pages 40–41.
const model=(label,category,capacity,roundsPerLoad,turnsPerLoad,short,long,extreme,speed=0,wound=0)=>({label,category,capacity,roundsPerLoad,turnsPerLoad,short,long,extreme,speed,wound,hands:['rifle','shotgun'].includes(category)?2:1});
export const WEAPON_MODELS=localized({
  singleAction:model('Revólver de ação simples','revolver',6,3,1,10,20,55,1),
  doubleAction:model('Revólver de ação dupla','revolver',6,3,1,10,20,55),
  capBall:model('Revólver de cápsula embutida','revolver',6,1,3,10,20,55,1),
  fastDraw:model('Revólver de saque rápido','revolver',6,3,1,5,15,45,2),
  longBarrel:model('Revólver de barril longo','revolver',6,3,1,10,30,80,-1),
  derringer:model('Derringer','pistol',3,2,1,2,4,8),
  smoothPistol:model('Pistola de cano liso','pistol',1,1,3,5,20,40,-1),
  leverRifle:model('Rifle de manivela','rifle',15,2,1,30,90,365,-1),
  leverCarbine:model('Carabina de manivela','rifle',12,2,1,20,80,185,-1),
  breechRifle:model('Rifle de carga de culatra','rifle',1,1,1,30,90,460,-2),
  breechCarbine:model('Carabina de culatra','rifle',1,1,1,25,75,185,-1),
  muzzleRifle:model('Rifle de carga dianteira','rifle',1,1,3,25,80,220,-2,1),
  muzzleCarbine:model('Carabina de carga dianteira','rifle',1,1,3,20,70,180,-1),
  cylinderRifle:model('Rifle de cilindro','rifle',6,1,3,25,80,220,-1),
  cylinderCarbine:model('Carabina de cilindro','rifle',6,1,3,20,69,183,-1),
  buffalo:model('Rifle búfalo','rifle',1,1,1,30,185,550,-2,1),
  shotgun:model('Espingarda','shotgun',2,2,1,10,40,100,-1),
  sawedOff:model('Escopeta','shotgun',2,2,1,7,15,30)
});
export const CATEGORIES=localized({revolver:'Revólver',pistol:'Pistola',rifle:'Rifle / carabina',shotgun:'Espingarda / escopeta'});
export function reloadTurns(capacity,roundsPerLoad,turnsPerLoad) { return Math.ceil(capacity/roundsPerLoad)*turnsPerLoad; }
export function weaponSummary(data) {
  const model=WEAPON_MODELS[data.model];
  const missing=Math.max(0,data.capacity-data.ammo);
  return {category:CATEGORIES[model.category],skill:['rifle','shotgun'].includes(model.category)?'Rifle':t("Pistola"),
    fullTurns:reloadTurns(data.capacity,data.roundsPerLoad,data.turnsPerLoad),
    remainingTurns:missing?Math.max(0,reloadTurns(missing,data.roundsPerLoad,data.turnsPerLoad)-data.reloadProgress):0};
}
export function advanceReload(data) {
  if(data.ammo>=data.capacity) return {ammo:data.capacity,reloadProgress:0};
  const progress=data.reloadProgress+1;
  return progress>=data.turnsPerLoad?{ammo:Math.min(data.capacity,data.ammo+data.roundsPerLoad),reloadProgress:0}:{ammo:data.ammo,reloadProgress:progress};
}
