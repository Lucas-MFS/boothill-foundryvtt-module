import {test} from 'node:test';
import assert from 'node:assert/strict';
import {remainingHealth,registerHealthResource} from '../scripts/health-resource.mjs';

test('saúde restante acompanha Força, ferimentos temporários, cura e mortalidade',()=>{
  const system={attributes:{strength:15},health:{points:0,temporary:0,mortal:false}};
  assert.deepEqual(remainingHealth(system),{value:15,max:15});
  system.health.points=6;system.health.temporary=3;
  assert.deepEqual(remainingHealth(system),{value:6,max:15});
  system.health.temporary=0;system.attributes.strength=18;
  assert.deepEqual(remainingHealth(system),{value:12,max:18});
  system.health.points=30;assert.equal(remainingHealth(system).value,0);
  system.health.points=0;system.health.mortal=true;assert.equal(remainingHealth(system).value,0);
  assert.equal(system.health.points,0);
});

test('configuração automática preserva recursos personalizados e evita gravações repetidas',async()=>{
  const hooks={};globalThis.Hooks={on:(name,fn)=>hooks[name]=fn};
  const writes=[];
  const actor={id:'a',type:'character',prototypeToken:{bar1:{attribute:'health.points'}},update:async data=>{writes.push(data);actor.prototypeToken.bar1.attribute=data['prototypeToken.bar1.attribute'];}};
  const custom={type:'npc',prototypeToken:{bar1:{attribute:'attributes.luck'}},update:async()=>assert.fail('barra personalizada alterada')};
  const token={id:'t',actor:{type:'horse'},bar1:{attribute:null}};
  let config={resource:'',skipDefeated:true};
  globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings:{get:()=>config,set:async(scope,key,value)=>{config=value;}},actors:[actor,custom],scenes:[{tokens:[token],updateEmbeddedDocuments:async(type,updates)=>{writes.push(updates);token.bar1.attribute=updates[0]['bar1.attribute'];}}]};
  registerHealthResource();await hooks.ready();
  assert.equal(config.resource,'hp.value');assert.equal(config.skipDefeated,true);
  assert.equal(actor.prototypeToken.bar1.attribute,'hp');assert.equal(token.bar1.attribute,'hp');
  assert.equal(writes.length,2);await hooks.ready();assert.equal(writes.length,2);
  config.resource='attributes.luck';await hooks.ready();assert.equal(config.resource,'attributes.luck');
  game.user.isGM=false;await hooks.ready();assert.equal(writes.length,2);
});
