import {LOCATIONS} from './combat-rules.mjs';
export const HIT_REGIONS=[['leftLeg',1,2],['rightLeg',3,4],['leftArm',5,6],['rightArm',7,8],['leftShoulder',9,9],['rightShoulder',10,10],['abdomen',11,14],['chest',15,18],['head',19,20]];
export function locationAllowance({skill,mode,range}) {
 const divisor=({aimed:1,steady:2,draw:4,fan:Infinity}[mode]??Infinity)*({close:1,short:1,long:2,extreme:4}[range]??Infinity);
 return divisor>4?0:Math.floor(skill/divisor);
}
export function locationChoices(die,shot) {
 const allowance=locationAllowance(shot);
 return HIT_REGIONS.map(([id,min,max])=>({id,label:LOCATIONS[id],value:Math.max(min,Math.min(max,die)),available:Math.max(min,die-allowance)<=Math.min(max,die+allowance)}));
}
export function injuryResult(die,id,weapon=0) {
 if(!HIT_REGIONS.some(r=>r[0]===id)) throw new Error('Local inválido');
 const location=['head','chest'].includes(id)?1:['leftLeg','rightLeg','leftArm','rightArm'].includes(id)?-1:0;
 const total=die+location+weapon;
 return {id,die,location,weapon,total,severity:total<0?'Arranhão':total<=2?'Ferimento leve':total<=5?'Ferimento sério':'Ferimento mortal'};
}
export function injuryCard(data) {
 if(!data.shot) return '';
 if(data.injury) {const r=data.injury;return `<div class="bh-injury-result"><strong>${LOCATIONS[r.id]} · ${r.severity}</strong><small>d6 ${r.die} · Local ${r.location>0?'+':''}${r.location} · Arma ${r.weapon>0?'+':''}${r.weapon} = ${r.total}</small>${r.total>=6&&!data.applied?'<p>Ferimento mortal: o alvo deve testar Sorte para tentar reduzi-lo a leve (1 ponto).</p>':''}${data.applied?`<p>Dano aplicado a <strong>${String(data.applied.name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong>: ${data.applied.points} ponto(s) · ${data.applied.severity}.</p>${data.applied.luckDie?`<small>Sorte do alvo: ${data.applied.luck} / ${data.applied.luckDie}</small>`:''}`:data.secondary?'<small>Aplicação manual pelo Juiz.</small>':'<button type="button" data-bh-damage>Aplicar dano</button>'}</div>`;}
 if(data.die===20&&!data.defectCleared) return '<button type="button" data-bh-injury="defect">Juiz: confirmar arma sem defeito</button>';
 if(!data.locationDie) return '<button type="button" data-bh-injury="location">Determinar localização · d20</button>';
 return `<div class="bh-location-choice"><p>Localização: ${data.locationDie} · Ajuste permitido: ±${locationAllowance(data.shot)}</p><div class="bh-choice-map"><img src="systems/boothill/assets/cowboy.png" alt="Silhueta para escolher o local atingido">${locationChoices(data.locationDie,data.shot).map(r=>`<button type="button" class="bh-choice-${r.id}" data-bh-injury="${r.id}" ${r.available?'':'disabled'}>${r.label}<small>${r.value}</small></button>`).join('')}</div><small>Escolha uma região disponível para rolar a gravidade.</small></div>`;
}
