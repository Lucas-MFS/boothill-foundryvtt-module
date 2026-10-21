import {WEAPON_MODELS} from './weapon-rules.mjs';
export const LOCATIONS={head:'Cabeça',leftShoulder:'Ombro esq.',rightShoulder:'Ombro dir.',leftArm:'Braço esq.',rightArm:'Braço dir.',chest:'Peito',abdomen:'Abdômen',leftLeg:'Perna esq.',rightLeg:'Perna dir.'};
export const SHOTS={aimed:{label:'Tiro Mirado',beats:6},steady:{label:'Tiro Firme',beats:3},draw:{label:'Tiro de Saque',beats:2},fan:{label:'Tiro Seguido',beats:1}};
export const MOVEMENTS={still:'Parado',walk:'Andando a pé',dodge:'Esquivando',run:'Correndo',horseWalk:'Montaria: andando',trot:'Montaria: trotando',gallop:'Montaria: galopando'};
export function movementDistances(health) {
  const {leftLeg,rightLeg}=health.locations;
  const legWounds=leftLeg.light+rightLeg.light+leftLeg.serious+rightLeg.serious;
  const legSerious=leftLeg.serious+rightLeg.serious;
  const both=leftLeg.serious>0&&rightLeg.serious>0;
  const other=Object.entries(health.locations).filter(([k])=>!['leftLeg','rightLeg'].includes(k)).reduce((n,[,v])=>n+v.serious,0);
  return [{label:'Rastejar',combat:2,firefight:.3},{label:'Andar',combat:both?0:6/2**legWounds,firefight:both?0:1/2**legWounds},{label:'Esquivar',combat:legSerious?0:12/2**(legWounds+other),firefight:legSerious?0:3/2**(legWounds+other)},{label:'Correr',combat:legSerious?0:24/2**(legWounds+other),firefight:legSerious?0:4/2**(legWounds+other)},{label:'Montado: andar',combat:8,firefight:1},{label:'Montado: trotar',combat:16,firefight:3},{label:'Montado: galopar',combat:32,firefight:5}];
}
export function rapidity({coordination,weapon,woundPenalty=0,movement='still',dual=false}) {
  const motion=['walk','horseWalk','trot'].includes(movement)?-1:['run','gallop'].includes(movement)?-3:0;
  return {base:coordination,weapon:weapon.speed,wounds:woundPenalty,motion,dual:dual?-2:0,total:coordination+weapon.speed+woundPenalty+motion+(dual?-2:0)};
}
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
export function shotTarget({coordination,skill,mode,weapon,secondary=false,dual=false,ambidextrous=false,woundPenalty=0,movementPenalty=0,range='short'}) {
  const category=WEAPON_MODELS[weapon.model].category;
  if(mode==='fan'&&category!=='revolver') return null;
  const base=mode==='aimed'?coordination:mode==='steady'?Math.ceil(coordination/2):mode==='draw'?Math.floor(coordination/4):Math.max(1,skill);
  const training=mode==='fan'?0:skill;
  const offhand=secondary&&!ambidextrous?-2:0;
  const twoWeapons=dual?-6:0;
  const distance=range==='close'?(['revolver','pistol'].includes(category)?4:-2):range==='long'?-2:range==='extreme'?-5:0;
  const spread=weapon.model==='shotgun'?2:weapon.model==='sawedOff'?4:0;
  return {base,training,offhand,twoWeapons,distance,spread,woundPenalty,movementPenalty,total:base+training+offhand+twoWeapons+distance+spread+woundPenalty+movementPenalty};
}
