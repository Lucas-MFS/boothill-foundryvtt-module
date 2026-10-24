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
test('Juiz transfere tiro e dispersão manual uma vez, ferindo apenas o cavalo',async()=>{
 for(const secondary of [false,true]) {
 const f=sceneFixture(),hooks={},ledger={};let writes=0,riderWrites=0,rolled=0;
 f.horse.system={attributes:{luck:10},health:{points:0,locations:Object.fromEntries(Object.keys(LOCATIONS).map(id=>[id,{light:0,serious:0}]))}};
 f.horse.getFlag=(s,key)=>ledger[key];f.horse.update=async change=>{writes++;for(const [k,v] of Object.entries(change)) if(k.startsWith('flags.boothill.')) ledger[k.slice(15)]=v;};f.rider.update=async()=>riderWrites++;
 globalThis.Hooks={on:(key,fn)=>hooks[key]=fn,once:()=>{}};globalThis.game={user:{id:'gm'},users:{activeGM:{id:'gm'}},messages:new Map()};globalThis.ui={notifications:{error:m=>{throw new Error(m);}}};
 globalThis.Roll=class {constructor(formula){this.formula=formula;}async evaluate(){rolled++;this.total=this.formula==='1d20'?5:2;return this;}};
 let data={secondary,pelletChild:true,target:15,die:10,shot:{model:'sawedOff',wound:0},locationDie:1,locationValue:1,injury:{id:'leftLeg',die:3,total:2,severity:'Ferimento leve'}};
 const message={id:'mounted-source',whisper:[],rolls:[],getFlag:()=>data,update:async change=>{if(change['flags.boothill.check']) data=change['flags.boothill.check'];if(change.rolls) message.rolls=change.rolls;}};game.messages.set(message.id,message);
 const request=()=>({author:{id:'gm',isGM:true},getFlag:(s,key)=>key==='damageRequest'?{messageId:message.id,tokenUuid:f.r.uuid}:false,setFlag:async()=>{},update:async()=>{}});
 registerDamage(()=>'<card>');hooks.createChatMessage(request());hooks.createChatMessage(request());await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes,1);assert.equal(riderWrites,0);assert.equal(rolled,2);assert.equal(data.mountResolution.toTokenUuid,f.h.uuid);assert.equal(data.injury.id,'leftArm');assert.equal(data.applied.name,'h');
 }
});
test('botão Cavalo transfere antes da gravidade e mostra silhueta do cavalo',async()=>{
 const {registerChatCards,rollCard}=await import('../scripts/chat.mjs');
 const {injuryChoiceShot}=await import('../scripts/injury.mjs');
 const f=sceneFixture();let hook,click;
 globalThis.Hooks={once:()=>{},on:(name,fn)=>{if(name==='renderChatMessageHTML') hook=fn;}};
 globalThis.game={user:{isGM:true}};
 globalThis.ui={notifications:{error:m=>{throw new Error(m);}}};
 globalThis.Roll=class {async evaluate(){return {total:7};}};
 const action={dataset:{bhInjury:'horse'},addEventListener:(name,fn)=>{click=fn;}};
 const content={innerHTML:'',querySelector:()=>null,querySelectorAll:selector=>selector==='[data-bh-injury]'?[action]:[]};
 const html={classList:{add:()=>{}},querySelector:()=>content};
 let data={title:'Tiro',die:10,target:15,luck:8,shot:{mode:'aimed',skill:6,range:'short',wound:0},locationDie:1,riderMounted:true,targetTokenUuid:f.r.uuid};
 const message={id:'early-transfer',isAuthor:true,isContentVisible:true,rolls:[],getFlag:()=>data,update:async changes=>{data=changes['flags.boothill.check'];}};
 registerChatCards();hook(message,html);await click();
 assert.equal(data.injury,undefined);assert.equal(data.locationDie,7);assert.equal(data.targetTokenUuid,f.h.uuid);assert.equal(data.animalTarget,true);assert.equal(data.mountResolution.originalLocation,1);assert.equal(injuryChoiceShot(data).skill,0);assert.ok(rollCard(data).includes('horse.png'));assert.ok(rollCard(data).includes('O tiro foi transferido'));
});

test('botão Cavalo só aparece com ímpar alcançável, considerando todo o ajuste',async()=>{
 const {horseLocationChoice,injuryCard}=await import('../scripts/injury.mjs');
 const data={locationDie:2,riderMounted:true,targetTokenUuid:'Token.r',shot:{mode:'aimed',range:'short',skill:1}};
 assert.equal(horseLocationChoice(data).value,1);assert.ok(injuryCard(data).includes('data-bh-injury="horse"'));
 assert.equal(horseLocationChoice({...data,shot:{...data.shot,skill:0}}),null);
 assert.equal(horseLocationChoice({...data,riderMounted:false}),null);
 assert.equal(horseLocationChoice({...data,locationDie:18}),null);
 assert.equal(horseLocationChoice({...data,mountResolution:{}}),null);
 assert.equal(horseLocationChoice({...data,bladeHit:true}),null);
});

test('membros do cavaleiro só aceitam pares alcançáveis; Cavalo é a única escolha dos ímpares',async()=>{
 const {selectableLocationChoices,injuryCard}=await import('../scripts/injury.mjs');
 const data={locationDie:11,riderMounted:true,targetTokenUuid:'Token.r',shot:{mode:'aimed',range:'short',skill:0}};
 assert.equal(selectableLocationChoices(data).find(r=>r.id==='abdomen').available,false);
 const html=injuryCard(data);assert.ok(html.includes('data-bh-injury="horse"'));assert.ok(!html.includes('→ Cavalo'));
 const adjusted={...data,shot:{...data.shot,skill:1}};
 const abdomen=selectableLocationChoices(adjusted).find(r=>r.id==='abdomen');assert.equal(abdomen.available,true);assert.equal(abdomen.value,12);
 const leg={...data,locationDie:1};assert.equal(selectableLocationChoices(leg).find(r=>r.id==='leftLeg').available,false);
 assert.equal(selectableLocationChoices({...leg,shot:{...leg.shot,skill:1}}).find(r=>r.id==='leftLeg').value,2);
 assert.equal(selectableLocationChoices({...data,riderMounted:false}).find(r=>r.id==='abdomen').available,true);
});
