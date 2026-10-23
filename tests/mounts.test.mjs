import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transferMountedHit,mountedToken,mountedRecipient} from '../scripts/mounts.mjs';
import {registerDamage} from '../scripts/damage.mjs';
import {LOCATIONS} from '../scripts/combat-rules.mjs';
test('montaria: paridade e regiões em ambas as direções, sem afetar outros tiros',()=>{
 for(const type of ['character','npc']) {assert.equal(transferMountedHit(type,'leftLeg',1),true);assert.equal(transferMountedHit(type,'rightLeg',3),true);assert.equal(transferMountedHit(type,'abdomen',11),true);assert.equal(transferMountedHit(type,'leftLeg',2),false);assert.equal(transferMountedHit(type,'chest',15),false);}
 assert.equal(transferMountedHit('horse','chest',16),true);assert.equal(transferMountedHit('horse','abdomen',12),true);assert.equal(transferMountedHit('horse','chest',15),false);assert.equal(transferMountedHit('horse','leftLeg',2),false);
});
function sceneFixture() {
 const scene={id:'s',tokens:[]},horse={id:'horse',type:'horse',uuid:'Actor.horse'},rider={id:'rider',type:'npc',system:{mount:{uuid:'Actor.horse',mounted:true,tokenUuid:''}}};
 const token=(id,actor)=>({id,uuid:`Scene.s.Token.${id}`,documentName:'Token',name:id,actor,parent:scene});
 const h=token('h',horse),r=token('r',rider);scene.tokens=[h,r];
 globalThis.fromUuid=async uuid=>uuid===horse.uuid?horse:scene.tokens.find(t=>t.uuid===uuid);
 return {scene,horse,rider,h,r,token};
}
test('resolve token único, exige escolha em cópias e encontra cavaleiro',async()=>{
 const f=sceneFixture();assert.equal(await mountedToken(f.r),f.h);assert.equal(await mountedRecipient(f.r,'leftLeg',1),f.h);assert.equal(await mountedRecipient(f.h,'chest',16),f.r);
 f.scene.tokens.push(f.token('h2',f.horse));await assert.rejects(()=>mountedToken(f.r),/token exato/);
 f.rider.system.mount.tokenUuid=f.h.uuid;assert.equal(await mountedToken(f.r),f.h);
 f.rider.system.mount.mounted=false;assert.equal(await mountedRecipient(f.r,'leftLeg',1),null);
});
test('Juiz transfere uma vez, rola localização/gravidade e só fere o cavalo',async()=>{
 const f=sceneFixture(),hooks={},ledger={};let writes=0,riderWrites=0,rolled=0;
 f.horse.system={attributes:{luck:10},health:{points:0,locations:Object.fromEntries(Object.keys(LOCATIONS).map(id=>[id,{light:0,serious:0}]))}};
 f.horse.getFlag=(s,key)=>ledger[key];f.horse.update=async change=>{writes++;for(const [k,v] of Object.entries(change)) if(k.startsWith('flags.boothill.')) ledger[k.slice(15)]=v;};f.rider.update=async()=>riderWrites++;
 globalThis.Hooks={on:(key,fn)=>hooks[key]=fn,once:()=>{}};globalThis.game={user:{id:'gm'},users:{activeGM:{id:'gm'}},messages:new Map()};globalThis.ui={notifications:{error:m=>{throw new Error(m);}}};
 globalThis.Roll=class {constructor(formula){this.formula=formula;}async evaluate(){rolled++;this.total=this.formula==='1d20'?5:2;return this;}};
 let data={target:15,die:10,shot:{wound:0},locationDie:1,locationValue:1,injury:{id:'leftLeg',die:3,total:2,severity:'Ferimento leve'}};
 const message={id:'mounted-source',whisper:[],rolls:[],getFlag:()=>data,update:async change=>{if(change['flags.boothill.check']) data=change['flags.boothill.check'];if(change.rolls) message.rolls=change.rolls;}};game.messages.set(message.id,message);
 const request=()=>({author:{id:'gm',isGM:true},getFlag:(s,key)=>key==='damageRequest'?{messageId:message.id,tokenUuid:f.r.uuid}:false,setFlag:async()=>{},update:async()=>{}});
 registerDamage(()=>'<card>');hooks.createChatMessage(request());hooks.createChatMessage(request());await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes,1);assert.equal(riderWrites,0);assert.equal(rolled,2);assert.equal(data.mountResolution.toTokenUuid,f.h.uuid);assert.equal(data.injury.id,'leftArm');assert.equal(data.applied.name,'h');
});
