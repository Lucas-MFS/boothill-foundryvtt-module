import {ATTRIBUTES,SKILLS,generatedScore,creationSummary,needsLuck,succeeds,isWorkTrained} from './rules.mjs';
import {WeaponData,WeaponSheet} from './weapon.mjs';
import {weaponSummary,advanceReload} from './weapon-rules.mjs';
import {LOCATIONS,SHOTS,MOVEMENTS,movementDistances,rapidity,handsRequired,canHold,healthSummary,shotTarget} from './combat-rules.mjs';
async function judgeModifier(event,title) {
  if(!event.shiftKey) return 0;
  return foundry.applications.api.DialogV2.prompt({window:{title},content:'<label>Modificador do Juiz <input name="modifier" type="number" step="1" value="0"></label>',ok:{label:'Confirmar',callback:(e,b,d)=>Number(d.element.querySelector('[name="modifier"]').value)},rejectClose:false});
}
class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const {SchemaField,NumberField,StringField,BooleanField}=foundry.data.fields;
    const level=()=>new NumberField({required:true,nullable:false,integer:true,min:0,initial:0});
    const health=new SchemaField({points:level(),temporary:level(),locations:new SchemaField(Object.fromEntries(Object.keys(LOCATIONS).map(id=>[id,new SchemaField({light:level(),serious:level()})])))});
    const combat=new SchemaField({movement:new StringField({initial:'still',choices:Object.keys(MOVEMENTS)}),primaryWeapon:new StringField({initial:''}),dualFire:new BooleanField({initial:true}),range:new StringField({initial:'short',choices:['close','short','long','extreme']})});
    return {health,combat,identity:new SchemaField({player:new StringField({initial:''}),age:level(),ambidextrous:new BooleanField({initial:false})}),attributes:new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(id=>[id,level()]))),skills:new SchemaField(Object.fromEntries(SKILLS.map(s=>[s.id,level()]))),trained:new SchemaField(Object.fromEntries(SKILLS.filter(s=>s.kind==='work').map(s=>[s.id,new BooleanField({nullable:true,initial:null})])))};
  }
}
export class CharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  get title() { return `Personagem: ${this.actor.name}`; }
  _editingSkills=false;
  static DEFAULT_OPTIONS={classes:['boothill'],tag:'form',position:{width:1140,height:960},form:{submitOnChange:true,closeOnSubmit:false},actions:{check:CharacterSheet.check,generate:CharacterSheet.generate,generateSkill:CharacterSheet.generateSkill,toggleSkills:CharacterSheet.toggleSkills,openWeapon:CharacterSheet.openWeapon,toggleWeapon:CharacterSheet.toggleWeapon,createWeapon:CharacterSheet.createWeapon,shoot:CharacterSheet.shoot,swapHands:CharacterSheet.swapHands,reloadWeapon:CharacterSheet.reloadWeapon,reportRapidity:CharacterSheet.reportRapidity}};
  static PARTS={main:{template:'systems/boothill/templates/character.hbs',scrollable:['.bh-body']}};
  async _onRender(context,options) {
    await super._onRender(context,options);
    if(!this.isEditable) return;
    this._ammoChanges??={};
    this._saveAmmo??=foundry.utils.debounce(async()=>{
      const changes=this._ammoChanges;this._ammoChanges={};
      if(Object.keys(changes).length) await this.actor.updateEmbeddedDocuments('Item',Object.entries(changes).map(([id,ammo])=>({_id:id,'system.ammo':ammo,'system.reloadProgress':0})));
    },300);
    for(const input of this.element.querySelectorAll('[data-ammo-id]')) input.addEventListener('input',()=>{
      const item=this.actor.items.get(input.dataset.ammoId),value=input.valueAsNumber;
      if(!item||!Number.isInteger(value)||value<0||value>item.system.capacity) return;
      this._ammoChanges[item.id]=value;this._saveAmmo();
    });
    this._healthChanges??={};
    this._saveHealth??=foundry.utils.debounce(async()=>{
      const changes=this._healthChanges;this._healthChanges={};
      if(Object.keys(changes).length) await this.actor.update(changes);
    },300);
    for(const input of this.element.querySelectorAll('.bh-health input[type="number"]')) input.addEventListener('input',()=>{
      const value=input.valueAsNumber;
      if(!Number.isInteger(value)||value<0) return;
      this._healthChanges[input.name]=value;this._saveHealth();
    });
  }
  async _prepareContext(options) {
    const context=await super._prepareContext(options),{attributes,skills,trained}=this.actor.system;
    const rows=SKILLS.map(s=>({...s,value:skills[s.id],trained:isWorkTrained(s.id,skills,trained)}));
    const icons={strength:'hand-fist',coordination:'crosshairs',observation:'eye',stature:'person',luck:'clover'};
    const work=rows.filter(s=>s.kind==='work'&&(this._editingSkills||s.trained));
    const health=healthSummary(this.actor.system.health,attributes.strength);
    const equipped=this.heldWeapons();
    const armament=this.actor.items.filter(i=>i.type==='weapon').map(i=>({id:i.id,name:i.name,system:i.system,hands:handsRequired(i.system),...weaponSummary(i.system)}));
    const held=equipped.map((i,index)=>({...armament.find(a=>a.id===i.id),rapidity:this.rapidityFor(i).total,hand:handsRequired(i.system)===2?'Duas mãos':index===0?'Mão principal':'Mão secundária',shots:Object.entries(SHOTS).map(([mode,shot])=>{
      const chance=this.chanceFor(i,mode);
      return {mode,...shot,chance:chance?.total,supported:chance!==null,available:chance!==null&&!health.unconscious&&i.system.ammo>0};
    })}));
    const ranges={close:'Próximo (até 2 m)',short:'Curto',long:'Longo',extreme:'Extremo'};
    return {...context,movements:Object.entries(MOVEMENTS).map(([id,label])=>({id,label,selected:id===this.actor.system.combat.movement})),distances:movementDistances(this.actor.system.health).map(r=>({...r,combat:r.combat?`${r.combat.toLocaleString('pt-BR',{maximumFractionDigits:3})} m`:'—',firefight:r.firefight?`${r.firefight.toLocaleString('pt-BR',{maximumFractionDigits:3})} m`:'—'})),actor:this.actor,editable:this.isEditable,editingSkills:this._editingSkills,hasWork:work.length>0,work,held,hasTwo:held.length===2,health,locations:Object.entries(LOCATIONS).map(([id,label])=>({id,label,...this.actor.system.health.locations[id]})),ranges:Object.entries(ranges).map(([id,label])=>({id,label,selected:id===this.actor.system.combat.range})),armament,attributes:Object.entries(ATTRIBUTES).map(([id,label])=>({id,label,icon:icons[id],value:attributes[id]})),weapons:rows.filter(s=>s.kind==='weapon'),summary:creationSummary(attributes,skills,trained)};
  }
  heldWeapons() {
    return this.actor.items.filter(i=>i.type==='weapon'&&i.system.equipped).sort((a,b)=>Number(b.id===this.actor.system.combat.primaryWeapon)-Number(a.id===this.actor.system.combat.primaryWeapon)||a.sort-b.sort||a.id.localeCompare(b.id));
  }
  chanceFor(item,mode) {
    const held=this.heldWeapons(),index=held.findIndex(i=>i.id===item.id),{attributes,skills,identity,combat,health}=this.actor.system;
    if(combat.movement==='dodge'||index<0||held.reduce((n,i)=>n+handsRequired(i.system),0)>2) return null;
    return shotTarget({coordination:attributes.coordination,skill:skills[weaponSummary(item.system).skill==='Rifle'?'rifle':'pistola'],mode,weapon:item.system,secondary:index===1,dual:held.length===2&&combat.dualFire,ambidextrous:identity.ambidextrous,woundPenalty:healthSummary(health,attributes.strength).penalty,range:combat.range,movementPenalty:['run','trot'].includes(combat.movement)?-2:combat.movement==='gallop'?-4:0});
  }
  static async swapHands() {
    if(!this.isEditable) return;
    const held=this.heldWeapons();
    if(held.length===2) await this.actor.update({'system.combat.primaryWeapon':held[1].id});
  }
  static async shoot(event,button) {
    if(!this.isEditable||this._firing) return;
    this._firing=true;
    try {
      await this.submit();
      const item=this.actor.items.get(button.dataset.id),mode=button.dataset.mode;
      if(item?.type!=='weapon'||!Object.hasOwn(SHOTS,mode)) return;
      if(healthSummary(this.actor.system.health,this.actor.system.attributes.strength).unconscious) return ui.notifications.warn('O personagem atingiu o limite de ferimentos e está desmaiado.');
      const chance=this.chanceFor(item,mode);
      if(!chance) return ui.notifications.warn('Empunhadura inválida ou tipo de tiro indisponível para esta arma.');
      if(!item.system.ammo) return ui.notifications.warn('A arma está descarregada.');
      const modifier=await judgeModifier(event,`${SHOTS[mode].label} — ${item.name}`);
      if(modifier===null||modifier===undefined||!Number.isInteger(modifier)) return;
      if(!item.system.ammo||!item.system.equipped) return;
      const current=this.chanceFor(item,mode);
      if(!current||healthSummary(this.actor.system.health,this.actor.system.attributes.strength).unconscious) return;
      const target=current.total+modifier,roll=await new Roll('1d20').evaluate();
      const luck=needsLuck(roll.total,target)?await new Roll('1d20').evaluate():null;
      const hit=succeeds(roll.total,target,luck?.total,this.actor.system.attributes.luck);
      await item.update({'system.ammo':item.system.ammo-1,'system.reloadProgress':0});
      const escape=foundry.utils.escapeHTML;
      await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:luck?[roll,luck]:[roll],flavor:`${escape(item.name)} · ${SHOTS[mode].label} | Chance ${target}: ${hit?'Acerto':'Erro'}<small class="bh-roll-modifiers">Base ${current.base}, perícia +${current.training}, duas armas ${current.twoWeapons}, mão ${current.offhand}, ferimentos ${current.woundPenalty}, alcance ${current.distance}, dispersão +${current.spread}, movimento ${current.movementPenalty}, Juiz ${modifier}.</small>${luck?` Sorte: ${luck.total}/${this.actor.system.attributes.luck}.`:''}${roll.total===20?' 20 natural: verificar defeito da arma; acerto, se houver, fica pendente desta verificação.':''} Ferimentos ainda não resolvidos.`});
    } finally {this._firing=false;}
  }
  rapidityFor(item) {
    const {attributes,health,combat}=this.actor.system;
    return rapidity({coordination:attributes.coordination,weapon:item.system,woundPenalty:healthSummary(health,attributes.strength).penalty,movement:combat.movement,dual:this.heldWeapons().length===2&&combat.dualFire});
  }
  static async reportRapidity(event,button) {
    if(!this.isEditable) return;
    await this.submit();
    const item=this.actor.items.get(button.dataset.id);
    if(item?.type!=='weapon') return;
    const modifier=await judgeModifier(event,'Rapidez — modificador do Juiz');
    if(!Number.isInteger(modifier)) return;
    const r=this.rapidityFor(item);
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content:`<strong>Rapidez: ${r.total+modifier}</strong> · ${foundry.utils.escapeHTML(item.name)}<small class="bh-roll-modifiers">Coordenação ${r.base} · Arma ${r.weapon} · Ferimentos ${r.wounds} · Movimento ${r.motion} · Duas armas ${r.dual} · Juiz ${modifier}</small>`});
  }
  static async reloadWeapon(event,button) {
    if(!this.isEditable||this._reloading) return;
    this._reloading=true;
    try {
      const item=this.actor.items.get(button.dataset.id);
      if(item?.type!=='weapon') return;
      const pending=this._ammoChanges?.[item.id];
      if(pending!==undefined) delete this._ammoChanges[item.id];
      const next=advanceReload({...item.system.toObject(),ammo:pending??item.system.ammo,reloadProgress:pending===undefined?item.system.reloadProgress:0});
      await item.update({'system.ammo':next.ammo,'system.reloadProgress':next.reloadProgress});
    } finally {this._reloading=false;}
  }
  static async openWeapon(event,button) { this.actor.items.get(button.dataset.id)?.sheet.render(true); }
  static async toggleWeapon(event,button) {
    if(!this.isEditable) return;
    const item=this.actor.items.get(button.dataset.id);
    if(item?.type==='weapon') await item.update({'system.equipped':!item.system.equipped});
  }
  static async createWeapon() {
    if(!this.isEditable) return;
    const [item]=await this.actor.createEmbeddedDocuments('Item',[{name:'Nova arma',type:'weapon',img:'icons/svg/sword.svg'}]);
    item.sheet.render(true);
  }
  static async toggleSkills() {
    if(!this.isEditable) return;
    await this.submit();
    this._editingSkills=!this._editingSkills;
    this.render();
  }
  static async generate() {
    if(!this.isEditable) return;
    if(Object.values(this.actor.system.attributes).some(n=>n>0)&&!await foundry.applications.api.DialogV2.confirm({window:{title:'Gerar atributos'},content:'<p>Substituir os cinco atributos pelo método 1?</p>'})) return;
    const update={};
    for(const id of Object.keys(ATTRIBUTES)) {
      const roll=await new Roll('2d10').evaluate();
      const value=generatedScore(roll.total,['stature','luck'].includes(id));
      update[`system.attributes.${id}`]=value;
      await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Geração: ${ATTRIBUTES[id]} → ${value}`});
    }
    await this.actor.update(update);
  }
  static async generateSkill(event,button) {
    if(!this.isEditable) return;
    const skill=SKILLS.find(s=>s.id===button.dataset.id&&s.kind==='work');
    if(!skill) return;
    if(this.actor.system.skills[skill.id]>0&&!await foundry.applications.api.DialogV2.confirm({window:{title:skill.label},content:'<p>Substituir o nível atual?</p>'})) return;
    const roll=await new Roll('2d10').evaluate(),value=generatedScore(roll.total);
    await this.actor.update({[`system.skills.${skill.id}`]:value,[`system.trained.${skill.id}`]:true});
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Nível: ${skill.label} → ${value}`});
  }
  static async check(event,button) {
    if(!this.isEditable) return;
    const {group,id}=button.dataset,skill=SKILLS.find(s=>s.id===id&&s.kind==='work');
    if(!(group==='attributes'&&Object.hasOwn(ATTRIBUTES,id))&&!(group==='skills'&&skill)) return;
    let target=this.actor.system[group][id];
    if(group==='skills'&&!isWorkTrained(id,this.actor.system.skills,this.actor.system.trained)) return ui.notifications.warn('Perícia não treinada.');
    const modifier=await judgeModifier(event,'Modificador do Juiz');
    if(modifier===null||modifier===undefined||!Number.isInteger(modifier)) return;
    target+=modifier;
    const roll=await new Roll('1d20').evaluate();
    const luckRoll=needsLuck(roll.total,target)?await new Roll('1d20').evaluate():null;
    const success=succeeds(roll.total,target,luckRoll?.total,this.actor.system.attributes.luck);
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:luckRoll?[roll,luckRoll]:[roll],flavor:`${group==='attributes'?ATTRIBUTES[id]:skill.label} | Alvo ${target}: ${success?'Sucesso':'Falha'}<small class="bh-roll-modifiers">Base ${target-modifier} · Juiz ${modifier}</small>${luckRoll?` | Sorte ${luckRoll.total} / ${this.actor.system.attributes.luck}`:''}`});
  }
}
Hooks.once('init',()=>{
  CONFIG.Actor.dataModels.character=CharacterData;
  CONFIG.Item.dataModels.weapon=WeaponData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item,'boothill',WeaponSheet,{types:['weapon'],makeDefault:true,label:'Boot Hill — Arma'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',CharacterSheet,{types:['character'],makeDefault:true,label:'Boot Hill — Personagem de jogador'});
});

// Keep hand limits consistent for both the actor sheet and the embedded item sheet.
Hooks.on('preUpdateItem',(item,changes)=>{
  if(item.type!=='weapon'||!item.parent) return;
  const data=foundry.utils.mergeObject(item.system.toObject(),foundry.utils.expandObject(changes).system??{},{inplace:false});
  if(!canHold(item.parent.items.filter(i=>i.type==='weapon'),data,item.id)) {ui.notifications.warn('As mãos já estão ocupadas: use até duas armas de uma mão ou uma de duas mãos.');item.sheet.render({force:true});return false;}
});
Hooks.on('preCreateItem',(item)=>{
  if(item.type==='weapon'&&item.parent&&!canHold(item.parent.items.filter(i=>i.type==='weapon'),item.system,item.id)) item.updateSource({'system.equipped':false});
});
