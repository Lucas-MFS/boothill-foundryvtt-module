import {t} from './localization.mjs';
// Table 5, reference PDF physical pages 25–26.
export function defectResult(model,die,ammoBefore=2) {
 if(!Number.isInteger(die)||die<1||die>20) throw new Error(t("d20 inválido"));
 let kind;
 if(['capBall','cylinderRifle','cylinderCarbine'].includes(model)) kind=die<=16?'misfire':ammoBefore<=1?'none':'explosion';
 else if(['muzzleRifle','muzzleCarbine','smoothPistol'].includes(model)) kind='misfire';
 else if(['leverRifle','leverCarbine'].includes(model)) kind=die<=8?'none':die<=12?'misfire':'jam';
 else if(['breechRifle','breechCarbine','buffalo'].includes(model)) kind=die<=8?'none':'misfire';
 else if(model==='gatling') kind=die<=4?'none':die<=6?'misfire':'jam';
 else kind=die<=(model==='derringer'?12:16)?'none':'misfire';
 return {die,kind,label:{none:t("Sem defeito"),misfire:t("Falha"),explosion:t("Explosão"),jam:t("Trava")}[kind],fired:['none','jam'].includes(kind),blocked:kind==='jam'?'jam':kind==='misfire'&&['muzzleRifle','muzzleCarbine','smoothPistol','cylinderRifle','cylinderCarbine'].includes(model)?'cleaning':'',bonus:kind==='explosion'&&ammoBefore>=4?1:0};
}
export function defectCard(data) {
 if(!data.shot||data.bladeHit||data.secondary||data.pelletChild||data.die!==20) return '';
 if(!data.defect) return data.defectCleared?'':`<button type="button" data-bh-defect>${t("Verificar defeito · d20")}</button>`;
 const d=data.defect;
 return `<div class="bh-defect-result"><strong>${t("Defeito · d20")} ${d.die}: ${t(d.label)}</strong><p>${d.kind==='jam'?t("A bala disparou. Arma travada: 3 turnos para destravar; 2 com teste bem-sucedido de Criar Armas."):d.blocked==='cleaning'?t("A bala não disparou. Desmontar/limpar a arma antes de usá-la novamente."):d.kind==='misfire'?t("A bala não disparou; esta tentativa errou."):d.kind==='explosion'?t("O cilindro descarregou. Role a gravidade do ferimento na mão do atirador."):t("A bala disparou normalmente.")}</p>${d.kind==='explosion'&&!data.explosionMessage?`<button type="button" data-bh-explosion>${t("Ferimento na mão · d6")}</button>`:''}</div>`;
}
