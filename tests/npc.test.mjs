import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ATTRIBUTES,NPC_ATTRIBUTES,generatedNpcScore,generatedScore} from '../scripts/rules.mjs';
test('NPC conserva os cinco atributos e acrescenta Ganância e Bravura',()=>{
 assert.deepEqual(Object.keys(NPC_ATTRIBUTES),[...Object.keys(ATTRIBUTES),'greed','bravery']);
 assert.equal(generatedNpcScore(5),5);assert.equal(generatedScore(5),10);
 assert.equal(generatedNpcScore(9,true),5);assert.throws(()=>generatedNpcScore(21));
});
test('modelos NPC e personagem são independentes e NPC compartilha saúde e combate',async()=>{
 class Field {constructor(options={}){this.options=options;}}
 class Schema extends Field {constructor(fields){super();this.fields=fields;}}
 class Sheet {async _prepareContext(){return {};}}
 const hooks={};globalThis.Hooks={once:(name,fn)=>hooks[name]=fn,on:()=>{}};
 globalThis.foundry={abstract:{TypeDataModel:class{}},data:{fields:{SchemaField:Schema,NumberField:Field,StringField:Field,BooleanField:Field,ArrayField:Field}},applications:{api:{HandlebarsApplicationMixin:Base=>Base},sheets:{ActorSheetV2:Sheet,ItemSheetV2:Sheet},apps:{DocumentSheetConfig:{registerSheet:()=>{}}}}};
 globalThis.CONFIG={Actor:{dataModels:{}},Item:{dataModels:{}}};globalThis.Actor=class{};globalThis.Item=class{};
 const {CharacterSheet}=await import('../scripts/boothill.mjs');hooks.init();
 const pc=CONFIG.Actor.dataModels.character.defineSchema(),npc=CONFIG.Actor.dataModels.npc.defineSchema();
 assert.equal('greed' in pc.attributes.fields,false);assert.equal('greed' in npc.attributes.fields,true);
 assert.equal('inventory' in npc,false);assert.equal('player' in npc.identity.fields,false);
 assert.deepEqual(Object.keys(npc.health.fields),Object.keys(pc.health.fields));
 globalThis.game={user:{isGM:true}};
 const sheet=new CharacterSheet();sheet.actor={getFlag:()=>undefined,type:'npc',system:{attributes:Object.fromEntries(Object.keys(NPC_ATTRIBUTES).map(id=>[id,5])),skills:{},trained:{},health:{points:0,temporary:0,locations:Object.fromEntries(['head','leftShoulder','rightShoulder','leftArm','rightArm','chest','abdomen','leftLeg','rightLeg'].map(id=>[id,{light:0,serious:0}]))},combat:{movement:'still',range:'short'},identity:{ambidextrous:false}},items:[]};
 assert.equal((await sheet._prepareContext({})).extraAttributes.length,2);
 game.user.isGM=false;assert.equal((await sheet._prepareContext({})).extraAttributes.length,0);
});
