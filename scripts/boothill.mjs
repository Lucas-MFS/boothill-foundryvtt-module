import {ATTRIBUTES,SKILLS,generatedScore,creationSummary,needsLuck,succeeds,isWorkTrained} from './rules.mjs';
import {WeaponData,WeaponSheet} from './weapon.mjs';
import {weaponSummary} from './weapon-rules.mjs';
class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const {SchemaField,NumberField,StringField,BooleanField}=foundry.data.fields;
    const level=()=>new NumberField({required:true,nullable:false,integer:true,min:0,initial:0});
    return {identity:new SchemaField({player:new StringField({initial:''}),age:level(),ambidextrous:new BooleanField({initial:false})}),attributes:new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(id=>[id,level()]))),skills:new SchemaField(Object.fromEntries(SKILLS.map(s=>[s.id,level()]))),trained:new SchemaField(Object.fromEntries(SKILLS.filter(s=>s.kind==='work').map(s=>[s.id,new BooleanField({nullable:true,initial:null})])))};
  }
}
export class CharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  get title() { return `Personagem: ${this.actor.name}`; }
  _editingSkills=false;
  static DEFAULT_OPTIONS={classes:['boothill'],tag:'form',position:{width:860,height:800},form:{submitOnChange:true,closeOnSubmit:false},actions:{check:CharacterSheet.check,generate:CharacterSheet.generate,generateSkill:CharacterSheet.generateSkill,toggleSkills:CharacterSheet.toggleSkills,openWeapon:CharacterSheet.openWeapon,toggleWeapon:CharacterSheet.toggleWeapon,createWeapon:CharacterSheet.createWeapon}};
  static PARTS={main:{template:'systems/boothill/templates/character.hbs',scrollable:['.bh-body']}};
  async _prepareContext(options) {
    const context=await super._prepareContext(options),{attributes,skills,trained}=this.actor.system;
    const rows=SKILLS.map(s=>({...s,value:skills[s.id],trained:isWorkTrained(s.id,skills,trained)}));
    const icons={strength:'hand-fist',coordination:'crosshairs',observation:'eye',stature:'person',luck:'clover'};
    const work=rows.filter(s=>s.kind==='work'&&(this._editingSkills||s.trained));
    const size=Math.max(1,Math.ceil(work.length/3));
    const armament=this.actor.items.filter(i=>i.type==='weapon').map(i=>({id:i.id,name:i.name,system:i.system,...weaponSummary(i.system)}));
    return {...context,actor:this.actor,editable:this.isEditable,editingSkills:this._editingSkills,hasWork:work.length>0,armament,attributes:Object.entries(ATTRIBUTES).map(([id,label])=>({id,label,icon:icons[id],value:attributes[id]})),workColumns:[work.slice(0,size),work.slice(size,size*2),work.slice(size*2)],weapons:rows.filter(s=>s.kind==='weapon'),summary:creationSummary(attributes,skills,trained)};
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
    const modifier=await foundry.applications.api.DialogV2.prompt({window:{title:'Modificador do Juiz'},content:'<label>Modificador <input name="modifier" type="number" step="1" value="0"></label>',ok:{label:'Rolar',callback:(event,button,dialog)=>Number(dialog.element.querySelector('[name="modifier"]').value)},rejectClose:false});
    if(modifier===null||modifier===undefined||!Number.isInteger(modifier)) return;
    target+=modifier;
    const roll=await new Roll('1d20').evaluate();
    const luckRoll=needsLuck(roll.total,target)?await new Roll('1d20').evaluate():null;
    const success=succeeds(roll.total,target,luckRoll?.total,this.actor.system.attributes.luck);
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),style:CONST.CHAT_MESSAGE_STYLES.ROLL,rolls:luckRoll?[roll,luckRoll]:[roll],flavor:`${group==='attributes'?ATTRIBUTES[id]:skill.label} | Alvo ${target}: ${success?'Sucesso':'Falha'}${luckRoll?` | Sorte ${luckRoll.total} / ${this.actor.system.attributes.luck}`:''}`});
  }
}
Hooks.once('init',()=>{
  CONFIG.Actor.dataModels.character=CharacterData;
  CONFIG.Item.dataModels.weapon=WeaponData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item,'boothill',WeaponSheet,{types:['weapon'],makeDefault:true,label:'Boot Hill — Arma'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',CharacterSheet,{types:['character'],makeDefault:true,label:'Boot Hill — Personagem de jogador'});
});
