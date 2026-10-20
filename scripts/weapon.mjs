import {WEAPON_MODELS,weaponSummary,advanceReload} from './weapon-rules.mjs';

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const {StringField,NumberField,BooleanField}=foundry.data.fields;
    const number=(initial,min=0)=>new NumberField({required:true,nullable:false,integer:true,min,initial});
    return {model:new StringField({required:true,choices:Object.keys(WEAPON_MODELS),initial:'singleAction'}),
      capacity:number(6,1),ammo:number(0),roundsPerLoad:number(3,1),turnsPerLoad:number(1,1),reloadProgress:number(0),
      short:number(10),long:number(20),extreme:number(55),speed:number(1,-2),wound:number(0,-10),
      caliber:new StringField({initial:''}),notes:new StringField({initial:''}),equipped:new BooleanField({initial:false})};
  }
  static validateJoint(data) {
    if(data.ammo>data.capacity) throw new Error('A munição carregada não pode exceder a capacidade.');
    if(data.reloadProgress>=data.turnsPerLoad) throw new Error('Progresso de recarga inválido.');
    if(data.short>data.long||data.long>data.extreme) throw new Error('Os alcances devem estar em ordem: curto, longo e extremo.');
  }
}

export class WeaponSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  get title() { return `Arma: ${this.document.name}`; }
  static DEFAULT_OPTIONS={classes:['boothill','bh-weapon-sheet'],tag:'form',position:{width:660,height:700},form:{submitOnChange:true,closeOnSubmit:false},actions:{reload:WeaponSheet.reload,spend:WeaponSheet.spend,addToActor:WeaponSheet.addToActor}};
  static PARTS={main:{template:'systems/boothill/templates/weapon.hbs',scrollable:['.bh-body']}};
  async _prepareContext(options) {
    return {...await super._prepareContext(options),item:this.document,system:this.document.system,editable:this.isEditable,standalone:!this.document.parent,
      characters:game.actors.filter(a=>a.type==='character'&&a.isOwner).map(a=>({id:a.id,name:a.name})),
      models:Object.entries(WEAPON_MODELS).map(([id,m])=>({id,label:m.label,selected:id===this.document.system.model})),
      ...weaponSummary(this.document.system)};
  }
  static async addToActor() {
    if(!this.isEditable||this.document.parent) return;
    await this.submit();
    const actor=game.actors.get(this.element.querySelector('[data-field="targetActor"]').value);
    if(!actor?.isOwner||actor.type!=='character') return ui.notifications.warn('Selecione um personagem que você possa editar.');
    const data=this.document.toObject();
    delete data._id;
    await actor.createEmbeddedDocuments('Item',[data]);
    ui.notifications.info(`Arma adicionada a ${actor.name}.`);
    actor.sheet.render(true);
  }
  _processFormData(event,form,formData) {
    const data=super._processFormData(event,form,formData);
    if(data.system.model!==this.document.system.model) {
      const {label,category,...defaults}=WEAPON_MODELS[data.system.model];
      Object.assign(data.system,defaults,{reloadProgress:0});
    }
    data.system.ammo=Math.min(Number(data.system.ammo),Number(data.system.capacity));
    if(Number(data.system.turnsPerLoad)!==this.document.system.turnsPerLoad||Number(data.system.roundsPerLoad)!==this.document.system.roundsPerLoad) data.system.reloadProgress=0;
    return data;
  }
  static async reload() {
    if(!this.isEditable) return;
    await this.submit();
    await this.document.update(Object.fromEntries(Object.entries(advanceReload(this.document.system)).map(([key,value])=>[`system.${key}`,value])));
  }
  static async spend() {
    if(!this.isEditable) return;
    await this.submit();
    if(!this.document.system.ammo) return ui.notifications.warn('A arma está descarregada.');
    await this.document.update({'system.ammo':this.document.system.ammo-1,'system.reloadProgress':0});
  }
}
