import {succeeds} from './rules.mjs';
import {mountedRecipient} from './mounts.mjs';
import {injuryResult} from './injury.mjs';
import {HIT_REGIONS} from './injury.mjs';
export function supportsHealth(actor) {
 const h=actor?.system?.health;
 return Number.isFinite(h?.points)&&h?.locations&&HIT_REGIONS.every(([id])=>Number.isFinite(h.locations[id]?.light)&&Number.isFinite(h.locations[id]?.serious));
}
export function healthDamage(health,injury,luckDie,luck=0,animal=false) {
 if(!HIT_REGIONS.some(([id])=>id===injury.id)||!Number.isFinite(injury.total)) throw new Error('Ferimento inválido.');
 const changes={};
 let points=0,severity=injury.severity,mortal=false;
 if(injury.total>=6||(animal&&injury.die===6)) {
  if(!Number.isInteger(luckDie)) throw new Error('Ferimento mortal exige Sorte do alvo.');
  if(luckDie<=luck) {points=1;severity='Ferimento leve';}
  else {mortal=true;severity='Ferimento mortal';changes['system.health.mortal']=true;changes['system.health.mortalLocation']=injury.id;}
 } else if(injury.total>=0) points=injury.total;
 if(!mortal&&injury.total>=0) {
  const kind=points<=2?'light':'serious';
  changes[`system.health.locations.${injury.id}.${kind}`]=health.locations[injury.id][kind]+1;
  changes['system.health.points']=health.points+points;
 }
 return {changes,points,severity,mortal};
}
export function damageAuthority() {
 const capable=game.users.filter?.(u=>u.active&&u.isGM&&u.getFlag('boothill','damageProtocol')===1)??[];
 return capable.find(u=>u.id===game.users.activeGM?.id)??capable.sort((a,b)=>a.id.localeCompare(b.id))[0]??game.users.activeGM;
}
const busy=new Set();
let queue=Promise.resolve();
export function queueWorldUpdate(work) {queue=queue.then(work).catch(console.error);return queue;}
export async function requestDamage(message,tokenUuid) {
 if(message.getFlag('boothill','check')?.applied) return;
 if(!tokenUuid) return ui.notifications.warn('Selecione exatamente um token para aplicar o dano.');
 const token=await fromUuid(tokenUuid);
 if(token?.documentName!=='Token'||!supportsHealth(token.actor)) return ui.notifications.warn('O token precisa ter uma ficha com saúde compatível.');
 const gm=damageAuthority();
 if(!gm) return ui.notifications.warn('É necessário um Juiz conectado para aplicar o dano. O botão continua disponível.');
 await ChatMessage.create({content:'Aplicação de dano solicitada ao Juiz.',whisper:[game.user.id,gm.id],flags:{boothill:{damageRequest:{messageId:message.id,tokenUuid,processorId:gm.id}}}});
}
export function registerDamage(renderCard) {
 const process=async request=>{
  const req=request.getFlag('boothill','damageRequest');
  const assigned=req?.processorId&&game.users.get?.(req.processorId);
  if(assigned?.active ? assigned.id!==game.user.id : damageAuthority()?.id!==game.user.id) return;
  if(!req||request.getFlag('boothill','damageProcessed')) return;
  const message=game.messages.get(req.messageId);
  let data=message?.getFlag('boothill','check');
  if(data?.defect&&!data.defect.fired) return;
  if(!data?.injury||!data.shot||!(data.bladeHit||succeeds(data.die,data.target,data.luckDie,data.luck))||(data.die===20&&!data.defectCleared)) return;
  // Respect private/blind rolls when another player clicks a damage card.
  const user=request.author;
  if(!user||(!user.isGM&&message.whisper.length&&!message.whisper.includes(user.id)&&message.author?.id!==user.id)) return;
  if(data.applied) {await request.setFlag('boothill','damageProcessed',true);return;}
  if(busy.has(message.id)) return;
  busy.add(message.id);
  try {
   let token=await fromUuid(req.tokenUuid);
   if(data.mountResolution) {
    if(![data.mountResolution.fromTokenUuid,data.mountResolution.toTokenUuid].includes(req.tokenUuid)) throw new Error('Este ferimento já foi transferido para outra montaria/cavaleiro.');
    token=await fromUuid(data.mountResolution.toTokenUuid);
   } else if(token?.actor&&!data.bladeHit&&data.locationDie) {
    const region=HIT_REGIONS.find(([id])=>id===data.injury.id);
    const value=data.locationValue??Math.max(region[1],Math.min(region[2],data.locationDie));
    const recipient=await mountedRecipient(token,data.injury.id,value);
    if(recipient) {
     const locationRoll=await new Roll('1d20').evaluate(),severityRoll=await new Roll('1d6').evaluate();
     const id=HIT_REGIONS.find(([,min,max])=>locationRoll.total>=min&&locationRoll.total<=max)[0];
     data={...data,animalTarget:['horse','wildAnimal'].includes(recipient.actor.type),locationDie:locationRoll.total,locationValue:locationRoll.total,injury:injuryResult(severityRoll.total,id,data.shot.wound),targetTokenUuid:recipient.uuid,mountResolution:{fromTokenUuid:token.uuid,toTokenUuid:recipient.uuid,fromName:token.name,toName:recipient.name,originalLocation:value,newLocation:locationRoll.total}};
     await message.update({'flags.boothill.check':data,content:renderCard(data),rolls:[...message.rolls,locationRoll,severityRoll]});
     token=recipient;
    }
   }
   const actor=token?.actor;
   if(token?.documentName!=='Token'||!supportsHealth(actor)) throw new Error('Alvo sem saúde compatível.');
   if(actor.type==='wildAnimal'&&!data.animalDefenseApplied) {
    data={...data,animalDefenseApplied:true,injury:injuryResult(data.injury.die,data.injury.id,(data.shot.wound??0)+actor.system.animal.defense)};
    await message.update({'flags.boothill.check':data,content:renderCard(data)});
   }
   let applied=actor.getFlag('boothill',`damageLedger.${message.id}`);
   let luckRoll;
   if(!applied) {
    if(data.injury.total>=6||(['horse','wildAnimal'].includes(actor.type)&&data.injury.die===6)) luckRoll=await new Roll('1d20').evaluate();
    const result=healthDamage(actor.system.health,data.injury,luckRoll?.total,actor.system.attributes?.luck??0,['horse','wildAnimal'].includes(actor.type));
    applied={tokenUuid:token.uuid,name:token.name,points:result.points,severity:result.severity,mortal:result.mortal,...(luckRoll?{luckDie:luckRoll.total,luck:actor.system.attributes?.luck??0}:{})};
    await actor.update({...result.changes,[`flags.boothill.damageLedger.${message.id}`]:applied});
   }
   const next={...message.getFlag('boothill','check'),animalTarget:['horse','wildAnimal'].includes(actor.type),applied};
   await message.update({'flags.boothill.check':next,content:renderCard(next),...(luckRoll?{rolls:[...message.rolls,luckRoll]}:{})});
   await request.update({'flags.boothill.damageProcessed':true,content:'Dano aplicado ao token selecionado.'});
  } catch(error) {console.error(error);ui.notifications.error(`Não foi possível aplicar o dano: ${error.message}`);}
  finally {busy.delete(message.id);}
 };
 const schedule=request=>queueWorldUpdate(()=>process(request));
 Hooks.on('createChatMessage',schedule);
 Hooks.once('ready',async()=>{if(game.user.isGM) await game.user.setFlag('boothill','damageProtocol',1);if(damageAuthority()?.id===game.user.id) for(const message of game.messages) if(message.getFlag('boothill','damageRequest')&&!message.getFlag('boothill','damageProcessed')) schedule(message);});
}
