import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reloadPlan,reloadWithReserve,inventoryItems} from '../scripts/ammunition-rules.mjs';
const weapon={ammo:0,capacity:6,roundsPerLoad:3,turnsPerLoad:1,reloadProgress:0};
test('recarga respeita reserva, capacidade e etapas sem consumir antes de carregar',()=>{
 assert.deepEqual(reloadPlan(weapon,2),{ammo:2,reloadProgress:0,used:2});
 assert.deepEqual(reloadPlan({...weapon,ammo:5},50),{ammo:6,reloadProgress:0,used:1});
 assert.equal(reloadPlan(weapon,0),null);
 assert.deepEqual(reloadPlan({...weapon,turnsPerLoad:3},5),{ammo:0,reloadProgress:1,used:0});
 assert.deepEqual(reloadPlan({...weapon,turnsPerLoad:3,reloadProgress:2},5),{ammo:3,reloadProgress:0,used:3});
 assert.deepEqual(reloadPlan({...weapon,ammo:6},0),{ammo:6,reloadProgress:0,used:0});
});
test('atualização de arma e reserva usa apenas itens do mesmo ator e não recarrega sem seleção',async()=>{
 const updates=[];let warned=0;globalThis.ui={notifications:{warn:()=>warned++}};
 const reserve={id:'ammo',type:'ammunition',name:'Balas',system:{quantity:2,weight:.01}};
 const actor={uuid:'Actor.a',items:new Map([['ammo',reserve]]),updateEmbeddedDocuments:async(type,data)=>updates.push({type,data})};
 const item={id:'gun',actor,system:{...weapon,ammunitionId:'ammo',toObject:()=>weapon}};
 const next=await reloadWithReserve(item,{ammo:0,reloadProgress:0});assert.equal(next.ammo,2);
 assert.deepEqual(updates[0],{type:'Item',data:[{_id:'gun','system.ammo':2,'system.reloadProgress':0},{_id:'ammo','system.quantity':0}]});
 item.system.ammunitionId='outside';assert.equal(await reloadWithReserve(item,{ammo:0,reloadProgress:0}),null);assert.equal(warned,1);assert.equal(updates.length,1);
 const rows=inventoryItems({items:{filter:fn=>[reserve].filter(fn)}});assert.equal(rows[0].quantity*rows[0].weight,.02);assert.equal(rows[0].documentItem,true);
});
