import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handsRequired,canHold,healthSummary,shotTarget,LOCATIONS} from '../scripts/combat-rules.mjs';
test('duas pistolas cabem; rifle exclui outra arma',()=>{
 const pistol={model:'singleAction',equipped:true,hands:1},rifle={model:'leverRifle',equipped:true,hands:1};
 assert.equal(handsRequired(rifle),2);
 assert.equal(canHold([{id:'a',system:pistol}],pistol,'b'),true);
 assert.equal(canHold([{id:'a',system:pistol}],rifle,'b'),false);
 assert.equal(canHold([{id:'a',system:rifle}],pistol,'b'),false);
 assert.equal(canHold([{id:'a',system:pistol},{id:'b',system:pistol}],pistol,'c'),false);
 assert.equal(canHold([{id:'a',system:rifle}],{...pistol,equipped:false},'b'),true);
});
test('chance segue arredondamentos e penalidades de duas armas',()=>{
 const args={coordination:13,skill:2,weapon:{model:'singleAction'},range:'short'};
 assert.equal(shotTarget({...args,mode:'aimed'}).total,15);
 assert.equal(shotTarget({...args,mode:'steady'}).total,9);
 assert.equal(shotTarget({...args,mode:'draw'}).total,5);
 assert.equal(shotTarget({...args,mode:'fan'}).total,2);
 assert.equal(shotTarget({...args,mode:'aimed',dual:true}).total,9);
 assert.equal(shotTarget({...args,mode:'aimed',dual:true,secondary:true}).total,7);
 assert.equal(shotTarget({...args,mode:'aimed',dual:true,secondary:true,ambidextrous:true}).total,9);
 assert.equal(shotTarget({...args,weapon:{model:'leverRifle'},mode:'fan'}),null);
 assert.equal(shotTarget({...args,mode:'aimed',range:'long',woundPenalty:-5}).total,8);
});
test('temporários somam ao desmaio sem virar contagem de feridas',()=>{
 const health={points:7,temporary:3,locations:Object.fromEntries(Object.keys(LOCATIONS).map(k=>[k,{light:0,serious:0}]))};
 health.locations.head.light=1;health.locations.leftArm.serious=1;
 const s=healthSummary(health,10);assert.equal(s.total,10);assert.equal(s.unconscious,true);assert.equal(s.penalty,-5);
 assert.equal(healthSummary(health,11).unconscious,false);
});
