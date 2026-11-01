import {test} from 'node:test';
import assert from 'node:assert/strict';
import {targetMovementPenalty,shootingModifiers,promptShootingModifiers} from '../scripts/shooting-modifiers.mjs';
test('movimento do alvo: esquiva/galopar −4, correr/trotar −2; rodada expirada não conta',()=>{
 const actor={system:{combat:{movement:'dodge',movementCombat:'fight',movementRound:2}}},combat={id:'fight',round:2};
 assert.equal(targetMovementPenalty(actor,combat),-4);
 for(const [movement,expected]of [['gallop',-4],['run',-2],['trot',-2],['walk',0],['still',0]]){actor.system.combat.movement=movement;assert.equal(targetMovementPenalty(actor,combat),expected);}
 actor.system.combat.movement='dodge';assert.equal(targetMovementPenalty(actor,{...combat,round:3}),0);assert.equal(targetMovementPenalty(actor,null),0);assert.equal(targetMovementPenalty(null,combat),0);
});
test('visibilidade usa uma única penalidade, acumulada com tamanho, espreita e movimento',()=>{
 assert.equal(shootingModifiers({size:-4,visibility:-4,ambush:true,modifier:1,movement:-4}).total,-9);
 assert.equal(shootingModifiers({visibility:-2}).total,-2);assert.equal(shootingModifiers({visibility:-6}),null);
 assert.equal(shootingModifiers({size:4}).total,4);assert.equal(shootingModifiers({size:3}),null);assert.equal(shootingModifiers({modifier:1.5}),null);
});
test('clique normal aplica esquiva automaticamente e cancelar o Shift não confirma o tiro',async()=>{
 globalThis.game={combat:{id:'fight',round:2}};
 const actor={system:{combat:{movement:'dodge',movementCombat:'fight',movementRound:2}}};
 assert.equal((await promptShootingModifiers({shiftKey:false},'Tiro',{actor})).total,-4);
 let config;globalThis.foundry={utils:{escapeHTML:s=>s},applications:{api:{DialogV2:{prompt:async c=>{config=c;return null;}}}}};
 assert.equal(await promptShootingModifiers({shiftKey:true},'Tiro',{actor}),null);
 assert.ok(config.content.indexOf('name="modifier"')<config.content.indexOf('name="size"'));
 assert.match(config.content,/<select name="visibility">/);assert.doesNotMatch(config.content,/name="(?:obscured|darkness|movement)"/);
 assert.equal((await promptShootingModifiers({shiftKey:false},'Tiro')).total,0);
});
