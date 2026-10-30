import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {t,textKey} from '../scripts/localization.mjs';
import {ATTRIBUTES,SKILLS} from '../scripts/rules.mjs';
import {LOCATIONS,SHOTS,shotTarget} from '../scripts/combat-rules.mjs';
import {WEAPON_MODELS} from '../scripts/weapon-rules.mjs';
import {rollCard} from '../scripts/chat.mjs';
const dictionaries=Object.fromEntries(['en','pt-BR'].map(lang=>[lang,JSON.parse(fs.readFileSync(new URL(`../lang/${lang}.json`,import.meta.url)))]));
function language(lang){globalThis.game={i18n:{lang,localize:key=>dictionaries[lang][key]??key}};}

test('idiomas têm as mesmas chaves e todos os textos dos templates existem nos dois catálogos',()=>{
 assert.deepEqual(Object.keys(dictionaries.en).sort(),Object.keys(dictionaries['pt-BR']).sort());
 for(const file of fs.readdirSync(new URL('../templates/',import.meta.url))) {
  const template=fs.readFileSync(new URL('../templates/'+file,import.meta.url),'utf8');
  for(const[,key]of template.matchAll(/{{localize '([^']+)'/g)) for(const lang of ['en','pt-BR']) assert.ok(dictionaries[lang][key],`${file}: ${lang} ${key}`);
 }
 for(const file of fs.readdirSync(new URL('../scripts/',import.meta.url)).filter(f=>f.endsWith('.mjs'))) {
  const source=fs.readFileSync(new URL('../scripts/'+file,import.meta.url),'utf8');
  for(const[,literal]of source.matchAll(/\bt\(("(?:\\.|[^"\\])*")\)/g)) assert.ok(dictionaries.en[textKey(JSON.parse(literal).trim())],`${file}: ${literal}`);
 }
 const manifest=JSON.parse(fs.readFileSync(new URL('../system.json',import.meta.url)));
 assert.deepEqual(manifest.languages.map(l=>l.lang),['pt-BR','en']);
});

test('troca de idioma traduz catálogos sem mudar IDs de perícias, armas nem cálculos',()=>{
 language('pt-BR');const ids=SKILLS.map(s=>s.id),models=Object.keys(WEAPON_MODELS);
 const shot={coordination:13,skill:2,mode:'aimed',weapon:{model:'singleAction'},range:'short'};
 const before=shotTarget(shot);
 assert.equal(ATTRIBUTES.strength,'Força');
 language('en');assert.equal(ATTRIBUTES.strength,'Strength');assert.equal(LOCATIONS.head,'Head');assert.equal(SHOTS.aimed.label,'Aimed Shot');
 assert.equal(SKILLS.find(s=>s.id==='criar-armas').label,'Gunsmithing');
 assert.equal(WEAPON_MODELS.singleAction.label,'Single-action revolver');
 assert.deepEqual(SKILLS.map(s=>s.id),ids);assert.deepEqual(Object.keys(WEAPON_MODELS),models);assert.deepEqual(shotTarget(shot),before);
 language('pt-BR');assert.equal(SKILLS.find(s=>s.id==='criar-armas').label,'Criar Armas');
});

test('cartão em inglês traduz resultado e modificadores antigos, mantendo nomes e escape de HTML',()=>{
 language('en');
 const card=rollCard({title:'João <cowboy>',target:12,die:5,luck:10,modifiers:[['Ferimentos',-1]]});
 assert.match(card,/Success/);assert.match(card,/Chance to hit/);assert.match(card,/Wounds -1/);assert.match(card,/João &lt;cowboy&gt;/);
 assert.equal(t('Meu personagem personalizado'),'Meu personagem personalizado');
 language('pt-BR');assert.equal(t('Light wound'),'Ferimento leve');assert.equal(t('Surprised'),'Surpreso');
 assert.equal(t('  Saúde  '),'  Saúde  ');assert.ok(dictionaries.en[textKey('Aplicar dano')]);
});
