import {ATTRIBUTES,SKILLS,generatedScore,creationSummary,needsLuck,succeeds} from './rules.mjs';
class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const {SchemaField,NumberField,StringField,BooleanField}=foundry.data.fields;
    const level=()=>new NumberField({required:true,nullable:false,integer:true,min:0,initial:0});
    return {identity:new SchemaField({player:new StringField({initial:''}),age:level(),ambidextrous:new BooleanField({initial:false})}),attributes:new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(id=>[id,level()]))),skills:new SchemaField(Object.fromEntries(SKILLS.map(s=>[s.id,level()])))};
  }
}
export class CharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  get title() { return `Personagem: ${this.actor.name}`; }
  static DEFAULT_OPTIONS={classes:['boothill'],tag:'form',position:{width:860,height:800},form:{submitOnChange:true,closeOnSubmit:false},actions:{check:CharacterSheet.check,generate:CharacterSheet.generate,generateSkill:CharacterSheet.generateSkill}};
  static PARTS={main:{template:'systems/boothill/templates/character.hbs',scrollable:['.bh-body']}};
  async _prepareContext(options) {
    const context=await super._prepareContext(options),{attributes,skills}=this.actor.system;
    const rows=SKILLS.map(s=>({...s,value:skills[s.id]}));
    const icons={strength:'hand-fist',coordination:'crosshairs',observation:'eye',stature:'person',luck:'clover'};
    const work=rows.filter(s=>s.kind==='work');
    return {...context,actor:this.actor,editable:this.isEditable,attributes:Object.entries(ATTRIBUTES).map(([id,label])=>({id,label,icon:icons[id],value:attributes[id]})),workColumns:[work.slice(0,19),work.slice(19,38),work.slice(38)],weapons:rows.filter(s=>s.kind==='weapon'),summary:creationSummary(attributes,skills)};
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
    await this.actor.update({[`system.skills.${skill.id}`]:value});
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Nível: ${skill.label} → ${value}`});
  }
  static async check(event,button) {
    if(!this.isEditable) return;
    const {group,id}=button.dataset,skill=SKILLS.find(s=>s.id===id&&s.kind==='work');
    if(!(group==='attributes'&&Object.hasOwn(ATTRIBUTES,id))&&!(group==='skills'&&skill)) return;
    let target=this.actor.system[group][id];
    if(group==='skills'&&!target) return ui.notifications.warn('Perícia não aprendida.');
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
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',CharacterSheet,{types:['character'],makeDefault:true,label:'Boot Hill — Personagem de jogador'});
});
