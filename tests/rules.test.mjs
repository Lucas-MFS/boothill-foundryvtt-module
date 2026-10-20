import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generatedScore,initialBudget,succeeds,creationSummary,SKILLS,isWorkTrained} from '../scripts/rules.mjs';
test('treinamento preserva fichas antigas e respeita seleção explícita',()=>{
  const skills={agricultura:14,medicina:0};
  assert.equal(isWorkTrained('agricultura',skills),true);
  assert.equal(isWorkTrained('agricultura',skills,{agricultura:null}),true);
  assert.equal(isWorkTrained('agricultura',skills,{agricultura:false}),false);
  assert.equal(isWorkTrained('medicina',skills,{medicina:true}),true);
  assert.equal(skills.agricultura,14);
  const summary=creationSummary({a:15,b:15,c:15,d:8,e:8},skills,{agricultura:false,medicina:true});
  assert.equal(summary.used,1);
  assert.ok(summary.warnings.includes('Há perícias que exigem Literatura.'));
});
test('geração conforme exemplo do livro',()=>{assert.deepEqual([generatedScore(9),generatedScore(16),generatedScore(5),generatedScore(13,true),generatedScore(17,true)],[12,17,10,8,9]);for(const [n,v] of [[2,7],[5,10],[6,9],[10,13],[11,13],[14,16],[15,16],[17,18],[18,18],[20,20]])assert.equal(generatedScore(n),v);});
test('limites das escolhas iniciais',()=>assert.deepEqual([26,27,40,41,62,63,80,81].map(initialBudget),[null,10,10,8,8,6,6,null]));
test('testes e confirmação de Sorte',()=>{assert.equal(succeeds(12,12),true);assert.equal(succeeds(13,12),false);assert.equal(succeeds(1,0,5,5),true);assert.equal(succeeds(1,0,6,5),false);assert.equal(succeeds(2,0,1,5),false);assert.equal(succeeds(20,20,6,5),false);assert.equal(succeeds(20,25,5,5),true);assert.equal(succeeds(19,20),true);});
test('armas repetidas, Literatura e catálogo',()=>{const s=creationSummary({a:15,b:15,c:15,d:8,e:8},{pistola:5,medicina:12});assert.equal(s.budget,8);assert.equal(s.used,6);assert.equal(s.weapon,5);assert.equal(s.warnings.length,2);assert.equal(new Set(SKILLS.map(s=>s.id)).size,SKILLS.length);assert.equal(SKILLS.filter(s=>s.kind==='weapon').length,5);});
