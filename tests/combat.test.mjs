import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handsRequired,canHold,healthSummary,shotTarget,LOCATIONS,movementDistances,rapidity} from '../scripts/combat-rules.mjs';
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

test('deslocamento acumula ferimentos e preserva rastejar e montaria',()=>{
 const h={locations:Object.fromEntries(Object.keys(LOCATIONS).map(k=>[k,{light:0,serious:0}]))};
 h.locations.leftLeg.serious=1;h.locations.rightLeg.light=2;
 let rows=movementDistances(h);
 assert.equal(rows[1].combat,.75);assert.equal(rows[2].combat,0);assert.equal(rows[3].combat,0);
 assert.equal(rows[0].combat,2);assert.equal(rows[4].combat,8);
 h.locations.rightLeg.serious=1;assert.equal(movementDistances(h)[1].combat,0);
 h.locations.leftLeg.serious=0;h.locations.rightLeg={light:0,serious:0};h.locations.chest.serious=1;
 rows=movementDistances(h);assert.equal(rows[1].combat,6);assert.equal(rows[3].combat,12);
});
test('rapidez considera arma, duas armas, movimento e ferimentos',()=>{
 const r=rapidity({coordination:18,weapon:{speed:1},dual:true,movement:'run',woundPenalty:-5});
 assert.equal(r.total,9);assert.equal(r.motion,-3);assert.equal(r.dual,-2);
 assert.equal(rapidity({coordination:18,weapon:{speed:-2}}).total,16);
 assert.equal(shotTarget({coordination:18,skill:2,mode:'aimed',weapon:{model:'singleAction'},movementPenalty:-2}).total,18);
});
test('deslocamento montado usa ferimentos da montaria sem misturar os do cavaleiro',()=>{
 const fresh=()=>({mortal:false,points:0,temporary:0,locations:Object.fromEntries(Object.keys(LOCATIONS).map(id=>[id,{light:0,serious:0}]))});
 const rider=fresh(),horse=fresh();rider.locations.leftLeg.serious=1;
 assert.deepEqual(movementDistances(rider,horse,20).slice(4).map(r=>r.combat),[8,16,32]);
 horse.locations.leftLeg.light=1;
 let rows=movementDistances(rider,horse,20);assert.deepEqual(rows.slice(4).map(r=>r.combat),[4,8,16]);assert.deepEqual(rows.slice(4).map(r=>r.firefight),[.5,1.5,2.5]);
 horse.locations.leftLeg.serious=1;assert.deepEqual(movementDistances(rider,horse,20).slice(4).map(r=>r.combat),[2,0,0]);
 horse.locations.rightLeg.serious=1;assert.deepEqual(movementDistances(rider,horse,20).slice(4).map(r=>r.combat),[0,0,0]);
 const other=fresh();other.locations.chest.serious=1;assert.deepEqual(movementDistances(rider,other,20).slice(4).map(r=>r.combat),[8,8,16]);
 other.points=20;assert.deepEqual(movementDistances(rider,other,20).slice(4).map(r=>r.combat),[0,0,0]);
});
