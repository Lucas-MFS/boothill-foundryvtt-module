import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modifierText,rollCard,postCheck,registerChatCards} from '../scripts/chat.mjs';
test('cartões escondem base e modificadores zero e escapam nomes',()=>{
 assert.equal(modifierText([['Juiz',0],['Ferimentos',0]]),'');
 assert.equal(modifierText([['Juiz',2],['Mão',-2]]),'<small class="bh-roll-modifiers">Juiz +2 · Mão -2</small>');
 const html=rollCard({title:'<img src=x>',target:12,die:8,luck:5,modifiers:[['Juiz',0]]});
 assert.ok(html.includes('&lt;img src=x&gt;'));assert.ok(html.includes('bh-roll-success'));
 assert.ok(!html.includes('bh-roll-modifiers'));assert.ok(!html.includes('Base'));
 assert.ok(rollCard({title:'Força',target:12,die:13,luck:5}).includes('bh-roll-failure'));
});
test('Sorte só fica pendente nos extremos naturais e se resolve no mesmo cartão',()=>{
 for(const [target,die] of [[0,1],[25,20],[20,20]]) {
  const data={title:'Teste',target,die,luck:5};
  assert.ok(rollCard(data).includes('data-bh-luck'));
  assert.ok(rollCard({...data,luckDie:5}).includes('bh-roll-success'));
  assert.ok(rollCard({...data,luckDie:6}).includes('bh-roll-failure'));
  assert.ok(!rollCard({...data,luckDie:5}).includes('data-bh-luck'));
 }
 for(const [target,die] of [[0,2],[25,19],[19,20]]) assert.ok(!rollCard({title:'Teste',target,die,luck:5}).includes('data-bh-luck'));
});
test('postar teste mantém d20 original e não rola Sorte automaticamente',async()=>{
 globalThis.ChatMessage={getSpeaker:()=>({actor:'a'}),create:async data=>data};
 globalThis.CONST={CHAT_MESSAGE_STYLES:{ROLL:5}};
 const roll={total:20};
 const msg=await postCheck({system:{attributes:{luck:7}}},{title:'Teste',target:25,roll});
 assert.deepEqual(msg.rolls,[roll]);assert.equal(msg.flags.boothill.check.luck,7);
 assert.ok(msg.content.includes('data-bh-luck'));
});
test('botão Sorte respeita privacidade, permissão e impede repetir resolução',async()=>{
 let hook,click,rolled=0;
 globalThis.Hooks={on:(name,fn)=>{assert.equal(name,'renderChatMessageHTML');hook=fn;}};
 globalThis.game={user:{isGM:false}};
 globalThis.Roll=class {async evaluate(){rolled++;return {total:3};}};
 registerChatCards();
 const button={addEventListener:(name,fn)=>{click=fn;}};
 const content={innerHTML:'',querySelector:()=>button};
 const html={classList:{add:()=>{}},querySelector:()=>content};
 let data={title:'Teste',target:25,die:20,luck:5};
 const message={id:'msg',isAuthor:false,isContentVisible:false,rolls:[{total:20}],getFlag:()=>data,update:async changes=>{data=changes['flags.boothill.check'];}};
 hook(message,html);assert.equal(content.innerHTML,'');
 message.isContentVisible=true;hook(message,html);assert.equal(button.disabled,true);
 await click();assert.equal(rolled,0);
 message.isAuthor=true;hook(message,html);assert.equal(button.disabled,false);
 await Promise.all([click(),click()]);assert.equal(rolled,1);assert.equal(data.luckDie,3);
 await click();assert.equal(rolled,1);
});
