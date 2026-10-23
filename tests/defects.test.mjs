import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defectResult} from '../scripts/defects.mjs';
import {rollCard,registerChatCards} from '../scripts/chat.mjs';
test('Tabela 5: limites por mecanismo e explosão na última bala',()=>{
 for(const model of ['capBall','cylinderRifle','cylinderCarbine']) {assert.equal(defectResult(model,1,4).kind,'misfire');assert.equal(defectResult(model,16,4).kind,'misfire');assert.equal(defectResult(model,17,4).kind,'explosion');assert.equal(defectResult(model,20,1).kind,'none');assert.equal(defectResult(model,20,4).bonus,1);assert.equal(defectResult(model,20,3).bonus,0);}
 for(const model of ['singleAction','doubleAction','longBarrel','fastDraw','shotgun','sawedOff']) {assert.equal(defectResult(model,16).kind,'none');assert.equal(defectResult(model,17).kind,'misfire');}
 assert.equal(defectResult('derringer',12).kind,'none');assert.equal(defectResult('derringer',13).kind,'misfire');
 for(const model of ['leverRifle','leverCarbine']) {assert.equal(defectResult(model,8).kind,'none');assert.equal(defectResult(model,9).kind,'misfire');assert.equal(defectResult(model,12).kind,'misfire');assert.equal(defectResult(model,13).kind,'jam');assert.equal(defectResult(model,13).fired,true);}
 for(const model of ['breechRifle','breechCarbine','buffalo']) {assert.equal(defectResult(model,8).kind,'none');assert.equal(defectResult(model,9).kind,'misfire');}
 for(const model of ['smoothPistol','muzzleRifle','muzzleCarbine']) {assert.equal(defectResult(model,1).blocked,'cleaning');assert.equal(defectResult(model,20).kind,'misfire');}
});
test('20 natural exige defeito mesmo quando erra; falha bloqueia dano e dispersão',()=>{
 const data={title:'Tiro',die:20,target:25,luck:8,luckDie:1,shot:{model:'sawedOff',range:'long',weaponUuid:'Item.test'}};
 assert.ok(rollCard(data).includes('data-bh-defect'));assert.ok(!rollCard(data).includes('data-bh-injury'));assert.ok(rollCard({...data,target:10}).includes('data-bh-defect'));
 const failed=rollCard({...data,defect:defectResult('sawedOff',20)});assert.ok(failed.includes('Falha'));assert.ok(!failed.includes('data-bh-pellets'));assert.ok(!failed.includes('data-bh-injury'));assert.ok(!failed.includes('data-bh-luck'));
 const clear=rollCard({...data,defect:defectResult('sawedOff',1),defectCleared:true});assert.ok(clear.includes('data-bh-pellets'));
});

test('resolver defeito trava a arma uma vez e exige propriedade',async()=>{
 let hook,click,rolled=0,updates=[];
 globalThis.Hooks={once:()=>{},on:(name,fn)=>{if(name==='renderChatMessageHTML') hook=fn;}};
 globalThis.game={user:{isGM:false}};
 globalThis.ui={notifications:{warn:()=>{},error:()=>{throw new Error('Falha inesperada');}}};
 globalThis.Roll=class {async evaluate(){rolled++;return {total:13};}};
 const item={isOwner:true,update:async change=>updates.push(change)};
 globalThis.fromUuid=async()=>item;
 registerChatCards();
 const action={hasAttribute:()=>true,addEventListener:(name,fn)=>{click=fn;}};
 const content={innerHTML:'',querySelector:()=>null,querySelectorAll:selector=>selector.includes('data-bh-defect')?[action]:[]};
 const html={classList:{add:()=>{}},querySelector:()=>content};
 let data={title:'Tiro',die:20,target:25,luck:8,shot:{model:'leverRifle',weaponUuid:'Actor.test.Item.test',ammoBefore:5}};
 const message={id:'defect-test',isAuthor:true,isContentVisible:true,rolls:[],getFlag:()=>data,update:async change=>{data=change['flags.boothill.check'];}};
 hook(message,html);item.isOwner=false;await click();assert.equal(rolled,0);
 item.isOwner=true;await Promise.all([click(),click()]);assert.equal(rolled,1);assert.equal(data.defect.kind,'jam');assert.equal(data.defectCleared,true);assert.deepEqual(updates,[{'system.malfunction':'jam','system.jamProgress':0}]);
 await click();assert.equal(rolled,1);
});
