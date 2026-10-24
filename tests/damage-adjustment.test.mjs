import {test} from 'node:test';
import assert from 'node:assert/strict';
import {damageAdjustment,promptDamageAdjustment} from '../scripts/damage-adjustment.mjs';
test('cobertura leve, proteção rígida e modificador são validados',()=>{
 assert.deepEqual(damageAdjustment({cover:'-2',modifier:1}),{cover:'-2',modifier:1,total:-1,blocked:false});
 assert.equal(damageAdjustment({cover:'blocked'}).blocked,true);
 assert.throws(()=>damageAdjustment({cover:'-9'}));assert.throws(()=>damageAdjustment({modifier:1.5}));
});
test('cancelar janela não envia ajuste; confirmação lê seletores',async()=>{
 const message={getFlag:()=>({injury:{die:4,total:5,location:1,weapon:0}})},token={name:'Alvo',actor:{type:'character'}};
 globalThis.foundry={utils:{escapeHTML:s=>s},applications:{api:{DialogV2:{prompt:async()=>null}}}};
 assert.equal(await promptDamageAdjustment(message,token),null);
 foundry.applications.api.DialogV2.prompt=async config=>config.ok.callback(null,null,{element:{querySelector:selector=>({value:selector==='[name=cover]'?'-3':'1'})}});
 assert.equal((await promptDamageAdjustment(message,token)).total,-2);
});
