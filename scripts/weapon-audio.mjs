export function shotAudio(data) {
 const src=String(data?.shotSound??data?.src??'').trim();
 const volume=Number(data?.shotVolume??data?.volume??.6);
 return {src,volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):.6};
}
export async function playWeaponSound(data,broadcast=true) {
 const audio=shotAudio(data);if(!audio.src) return false;
 try {await foundry.audio.AudioHelper.play({...audio,loop:false,channel:'interface'},broadcast);return true;}
 catch(error) {console.error(error);ui.notifications.warn('Não foi possível reproduzir o som da arma. Confira o arquivo de áudio.');return false;}
}
