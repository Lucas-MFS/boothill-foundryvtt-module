import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movementLimit,metersPerUnit,markMovementPath,createMovementRuler,WITHIN,BEYOND} from '../scripts/movement-ruler.mjs';
const health=()=>({points:0,temporary:0,mortal:false,locations:Object.fromEntries(['head','chest','abdomen','leftShoulder','rightShoulder','leftArm','rightArm','leftLeg','rightLeg'].map(id=>[id,{light:0,serious:0}]))});
const actor=()=>({type:'character',system:{attributes:{strength:15},health:health(),combat:{movement:'run'},mount:{mounted:false}}});
test('limite usa declaração, duração, ferimentos e a montaria real',()=>{
  const rider=actor();assert.equal(movementLimit(rider),24);assert.equal(movementLimit(rider,null,'firefight'),4);
  rider.system.health.locations.leftLeg.light=1;assert.equal(movementLimit(rider),12);
  rider.system.combat.movement='still';assert.equal(movementLimit(rider),null);
  rider.system.combat.movement='gallop';assert.equal(movementLimit(rider),null);
  rider.system.mount.mounted=true;const horse={...actor(),type:'horse'};
  assert.equal(movementLimit(rider,horse),32);
  horse.system.health.locations.leftArm.light=1;assert.equal(movementLimit(rider,horse),16);
  horse.system.health.locations.leftArm.serious=1;assert.equal(movementLimit(rider,horse),0);
  rider.system.health.mortal=true;assert.equal(movementLimit(rider,horse),0);
});
test('unidades explícitas e divisão visual exata do trecho que excede o limite',()=>{
  assert.equal(metersPerUnit('m'),1);assert.equal(metersPerUnit('ft'),.3048);assert.equal(metersPerUnit('quadrados'),null);
  const path=[{x:0,y:0,elevation:0,cost:0,measurement:{distance:0}},{x:100,y:0,elevation:0,cost:10,measurement:{distance:10}}];
  markMovementPath(path,6,1,p=>({x:p.x,y:p.y}));
  assert.equal(path.length,3);assert.equal(path[1].x,60);assert.equal(path[1].bhDistance,6);
  assert.equal(path[1].cost+path[2].cost,10);assert.equal(path[2].x,100);
});
test('régua colore segmentos e grade sem alterar estilos normais nem bloquear movimento',()=>{
  class Base {_getSegmentStyle(){return {width:4,color:123};}_getGridHighlightStyle(){return {alpha:.3,color:123};}}
  const Ruler=createMovementRuler(Base),ruler=new Ruler();ruler.bhLimit=6;
  assert.deepEqual(ruler._getSegmentStyle({bhDistance:6}),{width:4,color:WITHIN});
  assert.equal(ruler._getSegmentStyle({bhDistance:6.01}).color,BEYOND);
  assert.equal(ruler._getGridHighlightStyle({bhDistance:9},{}).color,BEYOND);
  ruler.bhLimit=null;assert.equal(ruler._getSegmentStyle({bhDistance:9}).color,123);
});
