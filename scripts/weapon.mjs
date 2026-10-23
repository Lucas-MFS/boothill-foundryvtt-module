import {WeaponAudioConfig} from './weapon-audio-config.mjs';
import {WEAPON_MODELS,weaponSummary,advanceReload} from './weapon-rules.mjs';
import {handsRequired} from './combat-rules.mjs';

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const {StringField,NumberField,BooleanField}=foundry.data.fields;
    const number=(initial,min=0)=>new NumberField({required:true,nullable:false,integer:true,min,initial});
    return {shotSound:new StringField({initial:''}),shotVolume:new NumberField({min:0,max:1,initial:.6,nullable:false}),malfunction:new StringField({initial:'',blank:true,choices:['','jam','cleaning']}),jamProgress:number(0),weight:new NumberField({min:0,initial:0}),model:new StringField({required:true,choices:Object.keys(WEAPON_MODELS),initial:'singleAction'}),
      hands:new NumberField({integer:true,nullable:true,initial:null,choices:[1,2]}),capacity:number(6,1),ammo:number(0),roundsPerLoad:number(3,1),turnsPerLoad:number(1,1),reloadProgress:number(0),
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
  static DEFAULT_OPTIONS={classes:['boothill','bh-weapon-sheet'],tag:'form',position:{width:540,height:520},form:{submitOnChange:true,closeOnSubmit:false},actions:{reload:WeaponSheet.reload,spend:WeaponSheet.spend,clearDefect:WeaponSheet.clearDefect}};
  static PARTS={main:{template:'systems/boothill/templates/weapon.hbs',scrollable:['.bh-body']}};
  async _onRender(context,options) {
    await super._onRender(context,options);
    const header=this.element.querySelector('.window-header');
    if(!header||header.querySelector('[data-bh-weapon-audio]')) return;
    const button=document.createElement('button');button.type='button';button.className='header-control icon fa-solid fa-volume-high';button.dataset.bhWeaponAudio='';button.title='Configurar som do disparo';button.setAttribute('aria-label','Configurar som do disparo');
    button.addEventListener('click',event=>{event.stopPropagation();new WeaponAudioConfig(this.document).render({force:true});});
    header.insertBefore(button,header.querySelector('[data-action="close"]'));
  }
  async _prepareContext(options) {
    return {...await super._prepareContext(options),item:this.document,system:this.document.system,editable:this.isEditable,
      models:Object.entries(WEAPON_MODELS).map(([id,m])=>({id,label:m.label,selected:id===this.document.system.model})),
      grips:[{id:1,label:'Uma mão',selected:handsRequired(this.document.system)===1},{id:2,label:'Duas mãos',selected:handsRequired(this.document.system)===2}].filter(g=>!['rifle','shotgun'].includes(WEAPON_MODELS[this.document.system.model].category)||g.id===2),
      ...weaponSummary(this.document.system)};
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
  static async clearDefect() {
    if(!this.isEditable) return;
    const item=this.document;
    if(item.system.malfunction==='cleaning') {
      if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Limpeza da arma'},content:'<p>A arma foi desmontada e limpa fora do tiroteio?</p>'})) return;
      await item.update({'system.malfunction':'','system.jamProgress':0});
    } else if(item.system.malfunction==='jam') {
      const progress=item.system.jamProgress+1;
      let needed=3;
      if(progress===2&&item.actor) {
        const trained=item.actor.system.trained?.['criar-armas'];
        const skill=item.actor.system.skills?.['criar-armas']??0;
        if(trained===true||(trained!==false&&skill>0)) {
          const roll=await new Roll('1d20').evaluate();
          let success=roll.total<=skill;
          if((skill<1&&roll.total===1)||(skill>=20&&roll.total===20)) {const luck=await new Roll('1d20').evaluate();success=luck.total<=item.actor.system.attributes.luck;await luck.toMessage({speaker:ChatMessage.getSpeaker({actor:item.actor}),flavor:'Sorte · Destravar arma'});}
          await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:item.actor}),flavor:`Criar Armas · Destravar · ${success?'Sucesso':'Falha'}`});
          if(success) needed=2;
        }
      }
      await item.update({'system.jamProgress':progress>=needed?0:progress,'system.malfunction':progress>=needed?'':'jam'});
    }
  }
  static async spend() {
    if(!this.isEditable) return;
    await this.submit();
    if(this.document.system.malfunction) return ui.notifications.warn('Arma bloqueada por defeito.');
    if(!this.document.system.ammo) return ui.notifications.warn('A arma está descarregada.');
    await this.document.update({'system.ammo':this.document.system.ammo-1,'system.reloadProgress':0});
  }
}
