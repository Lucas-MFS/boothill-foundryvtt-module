import {test} from 'node:test';
import assert from 'node:assert/strict';
import {targetMovementPenalty,shootingModifiers,promptShootingModifiers} from '../scripts/shooting-modifiers.mjs';
test('movimento do alvo: esquiva/galopar −4, correr/trotar −2; rodada expirada não conta',()=>{
 const actor={system:{combat:{movement:'dodge',movementCombat:'fight',movementRound:2}}},combat={id:'fight',round:2};
 assert.equal(targetMovementPenalty(actor,combat),-4);
 for(const [movement,expected]of [['gallop',-4],['run',-2],['trot',-2],['walk',0],['still',0]]){actor.system.combat.movement=movement;assert.equal(targetMovementPenalty(actor,combat),expected);}
 actor.system.combat.movement='dodge';assert.equal(targetMovementPenalty(actor,{...combat,round:3}),0);assert.equal(targetMovementPenalty(actor,null),0);assert.equal(targetMovementPenalty(null,combat),0);
});
test('Tabela 4: tamanho, obscuridade, escuridão e espreita acumulam sem duplicar outros ajustes',()=>{
 assert.equal(shootingModifiers({size:-4,obscured:true,darkness:true,ambush:true,modifier:1,movement:-4}).total,-11);
 assert.equal(shootingModifiers({size:4}).total,4);assert.equal(shootingModifiers({size:3}),null);assert.equal(shootingModifiers({modifier:1.5}),null);
});
test('clique normal aplica esquiva automaticamente e cancelar o Shift não confirma o tiro',async()=>{
 globalThis.game={combat:{id:'fight',round:2}};
 const actor={system:{combat:{movement:'dodge',movementCombat:'fight',movementRound:2}}};
 assert.equal((await promptShootingModifiers({shiftKey:false},'Tiro',{actor})).total,-4);
 let config;globalThis.foundry={utils:{escapeHTML:s=>s},applications:{api:{DialogV2:{prompt:async c=>{config=c;return null;}}}}};
 assert.equal(await promptShootingModifiers({shiftKey:true},'Tiro',{actor}),null);
 assert.match(config.content,/name="size"/);assert.match(config.content,/name="obscured"/);assert.doesNotMatch(config.content,/name="movement"/);
 assert.equal((await promptShootingModifiers({shiftKey:false},'Tiro')).total,0);
});
