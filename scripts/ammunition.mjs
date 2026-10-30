import {t} from './localization.mjs';
export class AmmunitionData extends foundry.abstract.TypeDataModel {
 static defineSchema() {
  const {NumberField,StringField}=foundry.data.fields;
  return {quantity:new NumberField({required:true,nullable:false,integer:true,min:0,initial:50}),weight:new NumberField({required:true,nullable:false,min:0,initial:0}),caliber:new StringField({initial:''}),notes:new StringField({initial:''})};
 }
}
export class AmmunitionSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
 get title() {return `${t("Munição:")} ${this.document.name}`;}
 static DEFAULT_OPTIONS={classes:['boothill','bh-weapon-sheet'],tag:'form',position:{width:440,height:350},form:{submitOnChange:true,closeOnSubmit:false}};
 static PARTS={main:{template:'systems/boothill/templates/ammunition.hbs'}};
 async _prepareContext(options) {return {...await super._prepareContext(options),item:this.document,system:this.document.system,editable:this.isEditable};}
}
