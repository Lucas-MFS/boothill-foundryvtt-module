import {t} from './localization.mjs';
export function shotAudio(data) {
 const src=String(data?.shotSound??data?.src??'').trim();
 const volume=Number(data?.shotVolume??data?.volume??.6);
 return {src,volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):.6};
}
export async function playWeaponSound(data,broadcast=true) {
 const audio=shotAudio(data);if(!audio.src) return false;
 try {
  const recipients=broadcast?[...(globalThis.game?.users??[])].filter(user=>user.active&&user.id!==game.user.id).map(user=>user.id):[];
  await foundry.audio.AudioHelper.play({...audio,loop:false,channel:'interface'},recipients.length?{recipients}:false);return true;
 }
 catch(error) {console.error(error);ui.notifications.warn(t("Não foi possível reproduzir o som da arma. Confira o arquivo de áudio."));return false;}
}
export function reloadAudio(data) {return shotAudio({src:data?.reloadSound,volume:data?.reloadVolume??.6});}
export async function playReloadSound(data) {return playWeaponSound(reloadAudio(data));}
