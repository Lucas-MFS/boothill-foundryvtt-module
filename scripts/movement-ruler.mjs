import {t} from './localization.mjs';
import {movementDistances,healthSummary} from './combat-rules.mjs';
const IDS=['crawl','walk','dodge','run','horseWalk','trot','gallop'];
export const WITHIN=0x299b58,BEYOND=0xd74444;
export function metersPerUnit(units) {
  const unit=String(units??'').trim().toLowerCase();
  if(['m','metro','metros','meter','meters','metre','metres'].includes(unit)) return 1;
  if(['ft','feet','foot','pé','pés'].includes(unit)) return .3048;
  if(['yd','yard','yards','jarda','jardas'].includes(unit)) return .9144;
  return null;
}
export function movementLimit(actor,mount=null,period='combat') {
  if(!['character','npc'].includes(actor?.type)) return null;
  const system=actor.system,index=IDS.indexOf(system.combat.movement);
  if(index<0) return null;
  if(healthSummary(system.health,system.attributes.strength).unconscious) return 0;
  if(index>=4&&(!system.mount?.mounted||mount?.type!=='horse')) return null;
  return movementDistances(system.health,mount?.system.health,mount?.system.attributes.strength)[index][period];
}
function resolveMount(token) {
  const link=token.actor?.system.mount;
  if(!link?.mounted||!link.uuid) return null;
  const linked=fromUuidSync(link.uuid),horse=linked?.documentName==='Token'?linked.actor:linked;
  const specific=link.tokenUuid?fromUuidSync(link.tokenUuid):null;
  if(specific?.parent?.id===token.parent?.id&&specific.actor?.id===horse?.id) return specific.actor;
  if(linked?.documentName==='Token'&&linked.parent?.id===token.parent?.id) return horse;
  const matches=[...(token.parent?.tokens??[])].filter(t=>t.actor?.id===horse?.id);
  return matches.length===1?matches[0].actor:horse;
}
// Insert a drawing-only waypoint where the measured path crosses its allowance.
// This changes neither the token's planned movement nor its destination.
export function markMovementPath(path,limit,factor,centerPoint) {
  for(const point of path) point.bhDistance=point.measurement.distance*factor;
  for(let i=1;i<path.length;i++) {
    const previous=path[i-1],point=path[i];
    if(previous.bhDistance>=limit||point.bhDistance<=limit) continue;
    const ratio=(limit-previous.bhDistance)/(point.bhDistance-previous.bhDistance);
    const boundary={...point,bhBoundary:true,bhDistance:limit,intermediate:false,explicit:false};
    for(const key of ['x','y','elevation']) boundary[key]=previous[key]+(point[key]-previous[key])*ratio;
    boundary.center=centerPoint(boundary);
    boundary.cost=(point.cost??0)*ratio;point.cost=(point.cost??0)-boundary.cost;
    path.splice(i,0,boundary);i++;
  }
}
export function createMovementRuler(Base) {
  return class BootHillMovementRuler extends Base {
    _preparePath(path) {
      super._preparePath(path);
      const factor=metersPerUnit(canvas.grid.units);
      this.bhLimit=movementLimit(this.token.actor,resolveMount(this.token.document),game.settings.get('boothill','movementPeriod'));
      if(this.bhLimit===null||factor===null) {this.bhLimit=null;return;}
      markMovementPath(path,this.bhLimit,factor,p=>this.token.document.getCenterPoint(p));
    }
    bhColor(point) {
      if(this.bhLimit===null||!Number.isFinite(point.bhDistance)) return null;
      return point.unreachable||point.bhDistance>this.bhLimit+1e-7?BEYOND:WITHIN;
    }
    _getSegmentStyle(point) {
      const style=super._getSegmentStyle(point),color=this.bhColor(point);
      return color===null?style:{...style,color};
    }
    _getGridHighlightStyle(point,offset) {
      const style=super._getGridHighlightStyle(point,offset),color=this.bhColor(point);
      return color===null?style:{...style,color};
    }
    _getWaypointStyle(point) {return point.bhBoundary?{radius:0}:super._getWaypointStyle(point);}
    _getWaypointLabelContext(point,state) {return point.bhBoundary?undefined:super._getWaypointLabelContext(point,state);}
  };
}
export function registerMovementRuler() {
  Hooks.on('init',()=>{
    game.settings.register('boothill','movementPeriod',{name:t("Régua: duração da rodada"),hint:t("Define qual coluna de deslocamento limita a indicação verde. O vermelho apenas avisa; não bloqueia o movimento."),scope:'world',config:true,type:String,choices:{combat:t("Combate · 6 segundos"),firefight:t("Tiroteio · 1 segundo")},default:'combat'});
    CONFIG.Token.rulerClass=createMovementRuler(CONFIG.Token.rulerClass);
  });
}
