import {WEAPON_MODELS} from './weapon-rules.mjs';
export const LOCATIONS={head:'Cabeça',leftShoulder:'Ombro esq.',rightShoulder:'Ombro dir.',leftArm:'Braço esq.',rightArm:'Braço dir.',chest:'Peito',abdomen:'Abdômen',leftLeg:'Perna esq.',rightLeg:'Perna dir.'};
export const SHOTS={aimed:{label:'Tiro Mirado',beats:6},steady:{label:'Tiro Firme',beats:3},draw:{label:'Tiro de Saque',beats:2},fan:{label:'Tiro Seguido',beats:1}};
export function handsRequired(data) {const minimum=['rifle','shotgun'].includes(WEAPON_MODELS[data.model]?.category)?2:1;return Math.max(minimum,data.hands??minimum);}
export function canHold(items,candidate,id) {
  if(!candidate.equipped) return true;
  return handsRequired(candidate)+items.filter(i=>i.id!==id&&i.system.equipped).reduce((n,i)=>n+handsRequired(i.system),0)<=2;
}
export function healthSummary(health,strength) {
  const wounds=Object.values(health.locations);
  const light=wounds.reduce((n,w)=>n+w.light,0),serious=wounds.reduce((n,w)=>n+w.serious,0);
  const total=health.points+health.temporary;
  return {light,serious,total,penalty:-light-4*serious,unconscious:strength>0&&total>=strength};
}
export function shotTarget({coordination,skill,mode,weapon,secondary=false,dual=false,ambidextrous=false,woundPenalty=0,range='short'}) {
  const category=WEAPON_MODELS[weapon.model].category;
  if(mode==='fan'&&category!=='revolver') return null;
  const base=mode==='aimed'?coordination:mode==='steady'?Math.ceil(coordination/2):mode==='draw'?Math.floor(coordination/4):Math.max(1,skill);
  const training=mode==='fan'?0:skill;
  const offhand=secondary&&!ambidextrous?-2:0;
  const twoWeapons=dual?-6:0;
  const distance=range==='close'?(['revolver','pistol'].includes(category)?4:-2):range==='long'?-2:range==='extreme'?-5:0;
  const spread=weapon.model==='shotgun'?2:weapon.model==='sawedOff'?4:0;
  return {base,training,offhand,twoWeapons,distance,spread,woundPenalty,total:base+training+offhand+twoWeapons+distance+spread+woundPenalty};
}
