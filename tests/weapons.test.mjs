import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WEAPON_MODELS,reloadTurns,advanceReload,weaponSummary} from '../scripts/weapon-rules.mjs';
test('recarga completa respeita os mecanismos da tabela',()=>{
  for(const [id,expected] of [['singleAction',2],['capBall',18],['leverRifle',8],['leverCarbine',6],['breechRifle',1],['shotgun',1],['sawedOff',1]]) {
    const m=WEAPON_MODELS[id];assert.equal(reloadTurns(m.capacity,m.roundsPerLoad,m.turnsPerLoad),expected);
  }
});
test('recarga lenta acumula turnos e não ultrapassa capacidade',()=>{
  let s={...WEAPON_MODELS.capBall,ammo:5,reloadProgress:0};
  s={...s,...advanceReload(s)};assert.equal(s.ammo,5);assert.equal(s.reloadProgress,1);
  s={...s,...advanceReload(s)};assert.equal(s.ammo,5);
  s={...s,...advanceReload(s)};assert.equal(s.ammo,6);assert.equal(s.reloadProgress,0);
  assert.deepEqual(advanceReload(s),{ammo:6,reloadProgress:0});
  assert.deepEqual(advanceReload({...WEAPON_MODELS.singleAction,ammo:5,reloadProgress:0}),{ammo:6,reloadProgress:0});
});
test('perícia e tempo restante derivam do item',()=>{
  assert.equal(weaponSummary({...WEAPON_MODELS.capBall,model:'capBall',ammo:5,reloadProgress:2}).remainingTurns,1);
  assert.equal(weaponSummary({...WEAPON_MODELS.shotgun,model:'shotgun',ammo:0,reloadProgress:0}).skill,'Rifle');
});
