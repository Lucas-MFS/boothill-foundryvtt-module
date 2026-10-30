import {t} from './localization.mjs';
import {HIT_REGIONS,injuryResult} from './injury.mjs';
export function isShotgun(data) {return ['shotgun','sawedOff'].includes(data.shot?.model);}
export function pelletCount(die,range) {
 if(!Number.isInteger(die)||die<1||die>6) throw new Error(t("Esperado d6."));
 const table={close:[1,2,4],short:[1,2,4],long:[0,1,3],extreme:[0,0,2]};
 return table[range]?.[die===1?0:die<=3?1:2]??null;
}
export function spreadInfo(data) {
 if(data.secondary||data.pelletChild||data.shot?.model!=='sawedOff'||!['long','extreme'].includes(data.shot.range)) return null;
 return {radius:data.shot.range==='long'?2:5,target:Math.floor(data.target/2)};
}
export function pelletsCard(data) {
 if(data.pelletsDie===undefined) return `<button type="button" data-bh-pellets="count">${t("Rolar quantidade de ferimentos · d6")}</button>`;
 if(data.pelletsCount===null) return `<p>${t("d6: 6 · Resultado ausente na Tabela 13.")}</p><label>${t("Quantidade definida pelo Juiz")} <select data-bh-pellets-count>${[0,1,2,3,4].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><button type="button" data-bh-pellets="manual">${t("Confirmar quantidade · Juiz")}</button>`;
 return `<div class="bh-pellets"><p>${t("d6:")} ${data.pelletsDie} · ${data.pelletsCount} ${t("ferimento(s)")}${data.pelletsManual?" "+t("· Quantidade definida pelo Juiz")+"":''}</p>${Array.from({length:data.pelletsCount},(_,i)=>`<button type="button" data-bh-pellets="wound" data-index="${i}" ${data.pelletMessages?.[i]?'disabled':''}>${t("Ferimento")} ${i+1} · ${data.pelletMessages?.[i]?t("Criado no chat"):t("Resolver")}</button>`).join('')}${data.pelletsCount===0?`<p>${t("O disparo acertou, mas não causou ferimentos.")}</p>`:''}</div>`;
}
export function spreadCard(data) {
 const info=spreadInfo(data);
 return info?`<section class="bh-spread"><h4>${t("Dispersão")}</h4><p>${t("Alvos até")} ${info.radius} ${t("m do alvo original · Chance secundária")} ${info.target}.</p><small>${t("O Juiz determina quem está na área. Localização sem ajuste. Nenhum dano secundário é aplicado automaticamente.")}</small><button type="button" data-bh-pellets="secondary">${t("Rolar contra alvo secundário")}</button></section>`:'';
}

export function pelletContext(data) {
 if(!data.pelletChild) return '';
 if(!data.secondary) return `<p class="bh-pellet-context"><strong>${t("Alvo original")}</strong> ${t("· localização ajustável")}</p>`;
 const radius=data.shot?.range==='long'?2:data.shot?.range==='extreme'?5:null;
 return `<p class="bh-pellet-context"><strong>${t("Alvo adicional")}</strong>${radius?` ${t("· até")} ${radius} ${t("m do alvo original")}`:''}</p>`;
}
export async function resolveSecondaryPellet(data) {
 if(!data.secondary) return {data,rolls:[]};
 const location=await new Roll('1d20').evaluate(),severity=await new Roll('1d6').evaluate();
 const id=HIT_REGIONS.find(([,min,max])=>location.total>=min&&location.total<=max)[0];
 return {data:{...data,targetTokenUuid:null,locationDie:location.total,locationValue:location.total,injury:injuryResult(severity.total,id,data.shot.wound)},rolls:[location,severity]};
}
