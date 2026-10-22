import {test} from 'node:test';
import assert from 'node:assert/strict';
import {healthDamage,supportsHealth,registerDamage} from '../scripts/damage.mjs';
import {LOCATIONS} from '../scripts/combat-rules.mjs';
const health=()=>({points:2,temporary:3,locations:Object.fromEntries(Object.keys(LOCATIONS).map(id=>[id,{light:0,serious:0}]))});
test('dano soma pontos reais e contagem regional sem tocar nos temporários',()=>{
 const h=health(),r=healthDamage(h,{id:'head',total:4,severity:'Ferimento sério'});
 assert.equal(r.changes['system.health.points'],6);assert.equal(r.changes['system.health.locations.head.serious'],1);
 assert.equal(h.points,2);assert.ok(!('system.health.temporary' in r.changes));
 assert.deepEqual(healthDamage(h,{id:'leftArm',total:-1,severity:'Arranhão'}).changes,{});
 assert.equal(healthDamage(h,{id:'leftArm',total:0,severity:'Ferimento leve'}).changes['system.health.locations.leftArm.light'],1);
});
test('mortal usa Sorte do alvo: salvo vira leve de 1 ponto; falha registra mortal',()=>{
 const h=health(),injury={id:'head',total:6,severity:'Ferimento mortal'};
 const saved=healthDamage(h,injury,5,5);assert.equal(saved.points,1);assert.equal(saved.changes['system.health.points'],3);assert.equal(saved.changes['system.health.locations.head.light'],1);
 const dead=healthDamage(h,injury,6,5);assert.equal(dead.mortal,true);assert.equal(dead.changes['system.health.mortal'],true);assert.equal(dead.changes['system.health.points'],undefined);
 assert.throws(()=>healthDamage(h,injury));
});
test('compatibilidade usa estrutura de saúde para permitir futuras fichas NPC',()=>{
 assert.equal(supportsHealth({type:'npc',system:{health:health()}}),true);
 assert.equal(supportsHealth({system:{}}),false);
});
test('Juiz aplica ao actor do token, serializa pedidos e impede dano duplicado',async()=>{
 const hooks={};globalThis.Hooks={on:(name,fn)=>hooks[name]=fn,once:()=>{}};
 globalThis.game={user:{id:'gm'},users:{activeGM:{id:'gm'}},messages:new Map()};
 let writes=0;const h=health(),ledger={};
 const actor={system:{health:h},getFlag:(s,key)=>ledger[key],update:async changes=>{writes++;h.points=changes['system.health.points'];for(const [key,value] of Object.entries(changes)) if(key.startsWith('flags.boothill.')) ledger[key.slice('flags.boothill.'.length)]=value;}};
 globalThis.fromUuid=async()=>({documentName:'Token',uuid:'Scene.s.Token.t',name:'Alvo desvinculado',actor});
 let data={shot:{},target:12,die:8,injury:{id:'leftLeg',total:3,severity:'Ferimento sério'}};
 const source={id:'source',whisper:[],rolls:[],getFlag:()=>data,update:async changes=>{data=changes['flags.boothill.check'];}};
 game.messages.set('source',source);
 const request=()=>({author:{id:'player'},getFlag:(s,key)=>key==='damageRequest'?{messageId:'source',tokenUuid:'Scene.s.Token.t'}:false,setFlag:async()=>{},update:async()=>{}});
 registerDamage(()=>'<card>');hooks.createChatMessage(request());hooks.createChatMessage(request());
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes,1);assert.equal(h.points,5);assert.equal(data.applied.name,'Alvo desvinculado');
});
