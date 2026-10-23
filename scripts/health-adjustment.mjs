export function regionalHealthAdjustment(health,id,kind,count,points) {
 const previous=health.locations[id]?.[kind];
 if(!['light','serious'].includes(kind)||!Number.isInteger(previous)||!Number.isInteger(count)||count<0||!Number.isInteger(points)||points<0) throw new Error('Ajuste de ferimento inválido.');
 const delta=count-previous;
 if(!delta) return {};
 if(delta>0) {
  const min=kind==='serious'?3*delta:0,max=(kind==='serious'?5:2)*delta;
  if(points<min||points>max) throw new Error(`Informe entre ${min} e ${max} pontos para as feridas adicionadas.`);
 } else if(points>health.points) throw new Error('A cura não pode exceder os pontos de ferimento atuais.');
 return {[`system.health.locations.${id}.${kind}`]:count,'system.health.points':health.points+(delta>0?points:-points)};
}
