import {test} from 'node:test';
import assert from 'node:assert/strict';
import {regionalHealthAdjustment} from '../scripts/health-adjustment.mjs';
const health={points:4,locations:{leftArm:{light:1,serious:1}}};
test('edição regional soma pontos informados e mantém a quantidade de feridas',()=>{
 assert.deepEqual(regionalHealthAdjustment(health,'leftArm','light',2,2),{'system.health.locations.leftArm.light':2,'system.health.points':6});
 assert.equal(regionalHealthAdjustment(health,'leftArm','serious',2,5)['system.health.points'],9);
 assert.equal(regionalHealthAdjustment(health,'leftArm','light',2,0)['system.health.points'],4);
});
test('cura regional subtrai pontos e rejeita valores incompatíveis',()=>{
 assert.equal(regionalHealthAdjustment(health,'leftArm','serious',0,4)['system.health.points'],0);
 assert.throws(()=>regionalHealthAdjustment(health,'leftArm','serious',2,2));
 assert.throws(()=>regionalHealthAdjustment(health,'leftArm','light',2,3));
 assert.throws(()=>regionalHealthAdjustment(health,'leftArm','light',0,5));
 assert.throws(()=>regionalHealthAdjustment(health,'leftArm','light',-1,0));
});
