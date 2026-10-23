import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animalAttackResult,animalAttackCard} from '../scripts/animal-attack.mjs';
test('Tabela 19: ataque de animal fere em 8 ou mais após modificador',()=>{
 assert.equal(animalAttackResult(2,5).hit,false);
 assert.equal(animalAttackResult(3,5).hit,true);
 assert.equal(animalAttackResult(8,0).hit,true);
 assert.equal(animalAttackResult(9,-2).hit,false);
 const card=animalAttackCard({title:'<Urso>',attackTotal:7,attackDie:2,attackModifier:5});
 assert.match(card,/&lt;Urso&gt;/);assert.match(card,/Errou/);assert.doesNotMatch(card,/data-bh-damage/);
});

test('ataque bem sucedido rola localização e gravidade e oferece aplicação manual sem alvo',async()=>{
 const {attackAnimal}=await import('../scripts/animal-attack.mjs');
 const dice=[3,19,4],messages=[];
 globalThis.Roll=class {async evaluate(){return {total:dice.shift()};}};
 globalThis.game={user:{targets:new Set()}};
 globalThis.CONST={CHAT_MESSAGE_STYLES:{ROLL:5}};
 globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),create:async data=>{messages.push(data);return data;}};
 const actor={id:'bear',name:'Urso',system:{attributes:{strength:50},animal:{attack:5,severity:2},health:{points:0,temporary:0,mortal:false,locations:{}}}};
 await attackAnimal.call({isEditable:true,actor,submit:async()=>{}},{shiftKey:false});
 const data=messages[0].flags.boothill.check;
 assert.equal(data.attackTotal,8);assert.equal(data.injury.id,'head');assert.equal(data.injury.total,7);
 assert.equal(data.defectCleared,true);assert.equal(messages[0].rolls.length,3);assert.match(messages[0].content,/data-bh-damage/);
});
