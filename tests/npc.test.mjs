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
 globalThis.foundry={abstract:{TypeDataModel:class{}},data:{fields:{SchemaField:Schema,NumberField:Field,StringField:Field,BooleanField:Field,ArrayField:Field}},applications:{api:{ApplicationV2:Sheet,HandlebarsApplicationMixin:Base=>Base},sheets:{ActorSheetV2:Sheet,ItemSheetV2:Sheet},apps:{DocumentSheetConfig:{registerSheet:()=>{}}}}};
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

test('Cavalo tem atributos próprios, inventário e regiões compatíveis com dano',async()=>{
 const {HorseSheet,HORSE_ATTRIBUTES,HORSE_SKILLS}=await import('../scripts/boothill.mjs');
 const schema=CONFIG.Actor.dataModels.horse.defineSchema();
 assert.deepEqual(Object.keys(schema.attributes.fields),['strength','coordination','intelligence','luck']);
 assert.deepEqual(Object.keys(schema.skills.fields),Object.keys(HORSE_SKILLS));
 assert.ok(schema.inventory);assert.ok(schema.tricks);assert.equal('identity' in schema,false);
 const sheet=new HorseSheet();sheet.isEditable=true;
 sheet.actor={type:'horse',system:{attributes:{strength:20,coordination:12,intelligence:5,luck:10},skills:{},trained:{},tricks:[],inventory:[{id:'rope',name:'Corda',quantity:2,weight:1.5}],health:{points:1,temporary:2,locations:Object.fromEntries(Object.keys(schema.health.fields.locations.fields).map(id=>[id,{light:0,serious:0}]))}},items:[]};
 const context=await sheet._prepareContext();assert.equal(context.totalWeight,3);assert.equal(context.health.total,3);assert.equal(context.locations.find(l=>l.id==='leftArm').label,'Dianteira esq.');assert.equal(context.locations.find(l=>l.id==='rightLeg').label,'Traseira dir.');assert.equal(context.attributes.length,Object.keys(HORSE_ATTRIBUTES).length);
 assert.equal(context.skills.length,0);sheet._editingSkills=true;assert.equal((await sheet._prepareContext({})).skills.length,4);sheet._editingSkills=false;sheet.actor.system.trained.herding=true;assert.deepEqual((await sheet._prepareContext({})).skills.map(s=>s.id),['herding']);
});

test('soltar Cavalo cria referência sem copiar ator e inicia desmontado',async()=>{
 const {CharacterSheet}=await import('../scripts/boothill.mjs');
 const sheet=new CharacterSheet();sheet.isEditable=true;let change;
 sheet.actor={type:'character',update:async value=>{change=value;}};
 const horse={type:'horse',uuid:'Actor.horse',token:{uuid:'Scene.s.Token.h'}};
 assert.equal(await sheet._onDropActor(null,horse),horse);
 assert.deepEqual(change,{'system.mount':{uuid:'Actor.horse',tokenUuid:'Scene.s.Token.h',mounted:false}});
});
test('vínculo abre a mesma cópia de montaria usada no deslocamento',async()=>{
 const {CharacterSheet}=await import('../scripts/boothill.mjs');
 const base={id:'h',uuid:'Actor.h',name:'Cavalo',system:{health:{points:0},attributes:{strength:20}}};let opened=false;
 const actual={...base,uuid:'Scene.s.Token.h.Actor.h',system:{health:{points:3},attributes:{strength:20}},sheet:{render:()=>{opened=true;}}};
 const token={uuid:'Scene.s.Token.h',name:'Cavalo da cena',actor:actual};
 globalThis.fromUuid=async uuid=>uuid===base.uuid?base:uuid===token.uuid?token:actual;
 globalThis.canvas={scene:{tokens:[token]}};
 const sheet=new CharacterSheet();sheet.actor={system:{mount:{uuid:base.uuid,tokenUuid:token.uuid,mounted:true}}};
 const mount=await sheet.mountContext();assert.equal(mount.health.points,3);assert.equal(mount.sourceUuid,actual.uuid);
 await sheet.openMount();assert.equal(opened,true);
});

test('remoção de inventário separa armas incorporadas, itens manuais e permissões',async()=>{
 const {CharacterSheet,HorseSheet}=await import('../scripts/boothill.mjs');
 for(const Sheet of [CharacterSheet,HorseSheet]) {
  const deleted=[],updates=[];
  const sheet=new Sheet();sheet.isEditable=true;
  sheet.actor={items:new Map([['gun',{type:'weapon'}]]),system:{inventory:[{id:'rope'},{id:'keep'}]},deleteEmbeddedDocuments:async(...args)=>deleted.push(args),update:async data=>updates.push(data)};
  const event={stopPropagation:()=>{}};
  await CharacterSheet.removeGear.call(sheet,event,{dataset:{id:'gun',weapon:'true'}});
  assert.deepEqual(deleted,[['Item',['gun']]]);assert.equal(updates.length,0);
  await CharacterSheet.removeGear.call(sheet,event,{dataset:{id:'rope',weapon:'false'}});
  assert.deepEqual(updates,[{'system.inventory':[{id:'keep'}]}]);
  await CharacterSheet.removeGear.call(sheet,event,{dataset:{id:'missing',weapon:'true'}});assert.equal(deleted.length,1);
  sheet.isEditable=false;
  await CharacterSheet.removeGear.call(sheet,event,{dataset:{id:'gun',weapon:'true'}});assert.equal(deleted.length,1);
 }
});
