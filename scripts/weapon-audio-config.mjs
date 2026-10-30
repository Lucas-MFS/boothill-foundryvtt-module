import {t} from './localization.mjs';
import {playWeaponSound} from './weapon-audio.mjs';
export class WeaponAudioConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
 constructor(item) {super();this.item=item;}
 get title() {return `${t("Sons da arma ·")} ${this.item.name}`;}
 static DEFAULT_OPTIONS={classes:['boothill','bh-weapon-audio'],tag:'form',position:{width:460},actions:{browse:WeaponAudioConfig.browse,preview:WeaponAudioConfig.preview,save:WeaponAudioConfig.save,clear:WeaponAudioConfig.clear}};
 static PARTS={main:{template:'systems/boothill/templates/weapon-audio.hbs'}};
 async _prepareContext() {return {src:this.item.system.shotSound,volume:Math.round(this.item.system.shotVolume*100),reloadSrc:this.item.system.reloadSound,reloadVolume:Math.round(this.item.system.reloadVolume*100),editable:this.item.isOwner};}
 values(kind='shot') {return {src:this.element.querySelector(kind==='reload'?'[name=reloadAudio]':'[name=audio]').value.trim(),volume:Number(this.element.querySelector(kind==='reload'?'[name=reloadVolume]':'[name=volume]').value)/100};}
 static browse(event,button) {
  if(!this.item.isOwner) return;
  const field=this.element.querySelector(button.dataset.kind==='reload'?'[name=reloadAudio]':'[name=audio]');
  new foundry.applications.apps.FilePicker.implementation({type:'audio',current:field.value,callback:path=>{field.value=path;}}).render({force:true});
 }
 static async preview(event,button) {await playWeaponSound(this.values(button.dataset.kind),false);}
 static clear(event,button) {if(this.item.isOwner) this.element.querySelector(button.dataset.kind==='reload'?'[name=reloadAudio]':'[name=audio]').value='';}
 static async save() {
  if(!this.item.isOwner) return;
  const audio=this.values(),reload=this.values('reload');
  if([audio,reload].some(sound=>!Number.isFinite(sound.volume)||sound.volume<0||sound.volume>1)) return ui.notifications.warn(t("Volume inválido."));
  await this.item.update({'system.shotSound':audio.src,'system.shotVolume':audio.volume,'system.reloadSound':reload.src,'system.reloadVolume':reload.volume});
  await this.close();
 }
}
