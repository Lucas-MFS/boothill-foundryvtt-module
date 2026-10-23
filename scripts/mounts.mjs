// Mounted hits: reference PDF physical page 46. Actors remain independent.
export function transferMountedHit(type,region,value) {
 if(!Number.isInteger(value)) return false;
 return type==='horse'?['chest','abdomen'].includes(region)&&value%2===0:['character','npc'].includes(type)&&['leftLeg','rightLeg','abdomen'].includes(region)&&value%2===1;
}
export async function mountActor(link) {
 if(!link?.uuid) return null;
 const document=await fromUuid(link.uuid);
 return document?.documentName==='Token'?document.actor:document;
}
export async function mountedToken(riderToken) {
 const link=riderToken.actor?.system.mount;
 if(!link?.mounted) return null;
 const horse=await mountActor(link);
 if(horse?.type!=='horse') throw new Error('Montaria vinculada não encontrada. Corrija o vínculo na ficha.');
 const tokens=[...(riderToken.parent?.tokens??[])];
 const specific=link.tokenUuid?await fromUuid(link.tokenUuid):horse.token;
 if(specific) {
  if(specific.parent?.id!==riderToken.parent?.id||specific.actor?.type!=='horse'||specific.actor.id!==horse.id) throw new Error('O token da montaria não está nesta cena. Escolha o token correto na ficha.');
  return specific;
 }
 const matches=tokens.filter(t=>t.actor?.type==='horse'&&t.actor.id===horse.id);
 if(matches.length!==1) throw new Error('Escolha o token exato da montaria na ficha do cavaleiro.');
 return matches[0];
}
export async function mountedRecipient(token,region,value) {
 if(!transferMountedHit(token.actor?.type,region,value)) return null;
 if(token.actor.type!=='horse') return mountedToken(token);
 const riders=[];
 for(const rider of token.parent?.tokens??[]) {
  if(!['character','npc'].includes(rider.actor?.type)||!rider.actor.system.mount?.mounted) continue;
  const horse=await mountActor(rider.actor.system.mount);
  if(horse?.id!==token.actor.id) continue;
  if((await mountedToken(rider))?.uuid===token.uuid) riders.push(rider);
 }
 if(riders.length>1) throw new Error('Mais de um cavaleiro está marcado como montado neste cavalo. Corrija os vínculos.');
 return riders[0]??null;
}
