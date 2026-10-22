export const ATTRIBUTES = {strength:'Força',coordination:'Coordenação',observation:'Observação',stature:'Estatura',luck:'Sorte'};
const work = 'Agricultura|Arremesso|Artilharia|Artista|Ator|Avaliação|Barista|Bovinocultura|Burocracia|Carpintaria|Carroçaria|Cavalgar|Chicote|Cocheiro|Comércio|Contabilidade|Contato Índio|Cordas|Costura/Alfaiataria|Criar Armas|Culinária|Curtidura|Direito|Engenharia Civil|Engenharia Ferroviária|Entretenedor|Exploração|Explosivos|Forja|Fotografia|Furtividade|Impressão/Jornalismo|Jogo|Liderança|Línguas|Literatura|Medicina|Natação|Odontologia|Oratória|Orientação|Ourivesaria|Ovinocultura|Pregação/Teologia|Prospecção/Mineração|Punga|Química|Rastrear|Saque Rápido|Selas|Sobrevivência|Sondagem/Mapas|Táticas|Telégrafo|Trancas|Veterinário'.split('|');
const id = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
export const SKILLS = [...work.map(label=>({id:id(label),label,kind:'work'})),...['Arquearia','Briga','Faca/Espada','Pistola','Rifle'].map(label=>({id:id(label),label,kind:'weapon'}))];
export function generatedScore(n,half=false) {
  if (!Number.isInteger(n)||n<2||n>20) throw new RangeError('Esperado total de 2d10.');
  const value=n+(n<=5?5:n<=10?3:n<=14?2:n<=17?1:0);
  return half?Math.ceil(value/2):value;
}
export function initialBudget(n) {return n>=27&&n<=40?10:n>=41&&n<=62?8:n>=63&&n<=80?6:null;}
export function needsLuck(die,target) {return (target<1&&die===1)||(target>=20&&die===20);}
export function succeeds(die,target,luckDie,luck) {return needsLuck(die,target)?Number.isInteger(luckDie)&&luckDie<=luck:die<=target;}
export function isWorkTrained(id,skills,trained={}) { return trained[id] ?? ((skills[id] || 0)>0); }
export function creationSummary(attributes,skills,trained={}) {
  const total=Object.values(attributes).reduce((a,b)=>a+b,0),budget=initialBudget(total);
  const weapon=SKILLS.filter(s=>s.kind==='weapon').reduce((n,s)=>n+(skills[s.id]||0),0);
  const used=weapon+SKILLS.filter(s=>s.kind==='work'&&isWorkTrained(s.id,skills,trained)).length;
  const warnings=[];
  if (budget===null) warnings.push('Soma fora da tabela inicial (27–80).');
  else {if(used>budget) warnings.push('Escolhas acima do limite inicial.'); if(weapon>budget/2) warnings.push('No máximo metade das escolhas iniciais pode ser de armas.');}
  if(!isWorkTrained('literatura',skills,trained)&&['burocracia','contabilidade','direito','engenharia-civil','impressao-jornalismo','linguas','medicina','odontologia','quimica','sondagem-mapas'].some(s=>isWorkTrained(s,skills,trained))) warnings.push('Há perícias que exigem Literatura.');
  return {total,budget,weapon,used,warnings};
}

export const NPC_ATTRIBUTES={...ATTRIBUTES,greed:'Ganância',bravery:'Bravura'};
export function generatedNpcScore(n,half=false) {
 if(!Number.isInteger(n)||n<2||n>20) throw new RangeError('Esperado total de 2d10.');
 return half?Math.ceil(n/2):n;
}
