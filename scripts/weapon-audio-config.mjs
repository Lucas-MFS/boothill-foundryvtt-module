import {playWeaponSound} from './weapon-audio.mjs';
export class WeaponAudioConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
 constructor(item) {super();this.item=item;}
 get title() {return `Som do disparo · ${this.item.name}`;}
 static DEFAULT_OPTIONS={classes:['boothill','bh-weapon-audio'],tag:'form',position:{width:460},actions:{browse:WeaponAudioConfig.browse,preview:WeaponAudioConfig.preview,save:WeaponAudioConfig.save,clear:WeaponAudioConfig.clear}};
 static PARTS={main:{template:'systems/boothill/templates/weapon-audio.hbs'}};
 async _prepareContext() {return {src:this.item.system.shotSound,volume:Math.round(this.item.system.shotVolume*100),editable:this.item.isOwner};}
 values() {return {src:this.element.querySelector('[name=audio]').value.trim(),volume:Number(this.element.querySelector('[name=volume]').value)/100};}
 static browse() {
  if(!this.item.isOwner) return;
  const field=this.element.querySelector('[name=audio]');
  new foundry.applications.apps.FilePicker.implementation({type:'audio',current:field.value,callback:path=>{field.value=path;}}).render({force:true});
 }
 static async preview() {await playWeaponSound(this.values(),false);}
 static clear() {if(this.item.isOwner) this.element.querySelector('[name=audio]').value='';}
 static async save() {
  if(!this.item.isOwner) return;
  const audio=this.values();
  if(!Number.isFinite(audio.volume)||audio.volume<0||audio.volume>1) return ui.notifications.warn('Volume inválido.');
  await this.item.update({'system.shotSound':audio.src,'system.shotVolume':audio.volume});
  await this.close();
 }
}
