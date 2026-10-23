import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportReload} from '../scripts/reload-chat.mjs';
test('recarga anuncia apenas balas carregadas durante combate, com nome escapado',async()=>{
 const messages=[];globalThis.game={combat:{started:true}};
 globalThis.foundry={utils:{escapeHTML:s=>s.replaceAll('<','&lt;').replaceAll('>','&gt;')}};
 globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),create:async data=>messages.push(data)};
 const actor={id:'a',name:'<John>'};
 await reportReload(actor,1,4);assert.equal(messages[0].content,'<p>&lt;John&gt; recarregou 3 balas.</p>');
 await reportReload(actor,4,5);assert.match(messages[1].content,/1 bala\./);
 await reportReload(actor,6,6);await reportReload(null,0,3);
 game.combat.started=false;await reportReload(actor,0,3);
 assert.equal(messages.length,2);
});
