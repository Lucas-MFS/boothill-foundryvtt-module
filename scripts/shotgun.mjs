import {HIT_REGIONS,injuryResult} from './injury.mjs';
export function isShotgun(data) {return ['shotgun','sawedOff'].includes(data.shot?.model);}
export function pelletCount(die,range) {
 if(!Number.isInteger(die)||die<1||die>6) throw new Error('Esperado d6.');
 const table={close:[1,2,4],short:[1,2,4],long:[0,1,3],extreme:[0,0,2]};
 return table[range]?.[die===1?0:die<=3?1:2]??null;
}
export function spreadInfo(data) {
 if(data.secondary||data.pelletChild||data.shot?.model!=='sawedOff'||!['long','extreme'].includes(data.shot.range)) return null;
 return {radius:data.shot.range==='long'?2:5,target:Math.floor(data.target/2)};
}
export function pelletsCard(data) {
 if(data.pelletsDie===undefined) return '<button type="button" data-bh-pellets="count">Rolar quantidade de ferimentos · d6</button>';
 if(data.pelletsCount===null) return `<p>d6: 6 · Resultado ausente na Tabela 13.</p><label>Quantidade definida pelo Juiz <select data-bh-pellets-count>${[0,1,2,3,4].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><button type="button" data-bh-pellets="manual">Confirmar quantidade · Juiz</button>`;
 return `<div class="bh-pellets"><p>d6: ${data.pelletsDie} · ${data.pelletsCount} ferimento(s)${data.pelletsManual?' · Quantidade definida pelo Juiz':''}</p>${Array.from({length:data.pelletsCount},(_,i)=>`<button type="button" data-bh-pellets="wound" data-index="${i}" ${data.pelletMessages?.[i]?'disabled':''}>Ferimento ${i+1} · ${data.pelletMessages?.[i]?'Criado no chat':'Resolver'}</button>`).join('')}${data.pelletsCount===0?'<p>O disparo acertou, mas não causou ferimentos.</p>':''}</div>`;
}
export function spreadCard(data) {
 const info=spreadInfo(data);
 return info?`<section class="bh-spread"><h4>Dispersão</h4><p>Alvos até ${info.radius} m do alvo original · Chance secundária ${info.target}.</p><small>O Juiz determina quem está na área. Localização sem ajuste. Nenhum dano secundário é aplicado automaticamente.</small><button type="button" data-bh-pellets="secondary">Rolar contra alvo secundário</button></section>`:'';
}

export function pelletContext(data) {
 if(!data.pelletChild) return '';
 if(!data.secondary) return '<p class="bh-pellet-context"><strong>Alvo original</strong> · localização ajustável</p>';
 const radius=data.shot?.range==='long'?2:data.shot?.range==='extreme'?5:null;
 return `<p class="bh-pellet-context"><strong>Alvo adicional</strong>${radius?` · até ${radius} m do alvo original`:''}</p>`;
}
export async function resolveSecondaryPellet(data) {
 if(!data.secondary) return {data,rolls:[]};
 const location=await new Roll('1d20').evaluate(),severity=await new Roll('1d6').evaluate();
 const id=HIT_REGIONS.find(([,min,max])=>location.total>=min&&location.total<=max)[0];
 return {data:{...data,targetTokenUuid:null,locationDie:location.total,locationValue:location.total,injury:injuryResult(severity.total,id,data.shot.wound)},rolls:[location,severity]};
}
