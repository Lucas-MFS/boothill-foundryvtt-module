import {t,localized} from './localization.mjs';
export const BRAWL_OBJECTS=localized({none:{label:'Punhos',attack:0,damage:0},bottle:{label:'Garrafa / pistola',attack:1,damage:1},chair:{label:'Cadeira / coronha de rifle',attack:2,damage:1},barrel:{label:'Barril vazio / caixa',attack:3,damage:1},person:{label:'Outra pessoa',attack:2,damage:1},rock:{label:'Pedra grande',attack:1,damage:1}});
export const HOLDS=localized({leftArm:'Chave no braço esquerdo',rightArm:'Chave no braço direito',neck:'Gravata',bear:'Abraço de urso'});
export function meleeResult({mode,die,skill=0,defense=0,stronger=false,wounds=0,effect=0,judge=0,object='none',hand='right',ambidextrous=false,freeHands=2}) {
 const tool=mode==='brawl'?(BRAWL_OBJECTS[object]??BRAWL_OBJECTS.none):BRAWL_OBJECTS.none;
 const total=die+skill+(mode==='knife'?0:-defense+(stronger?1:0))+wounds+effect+judge+tool.attack;
 const row=Math.max(1,Math.min(20,total));
 let label,damage=0,opponentEffect=0,selfEffect=0,selfDamage=0,hold=null,severity=null,escape=false;
 if(mode==='grapple') {
  if(row===1){label=t("Oponente o ilude ou o põe de joelhos");selfDamage=2;selfEffect=-2;}
  else if(row<=7){label=t("Sem chave");opponentEffect=row===2?2:row<=4?1:0;}
  else if(row<=11){label=HOLDS.leftArm;damage=1;opponentEffect=-1;hold='leftArm';}
  else if(row<=14){label=HOLDS.rightArm;damage=1;opponentEffect=-1;hold='rightArm';}
  else if(row===15){label=t("Encontrão");damage=1;opponentEffect=-1;}
  else if(row<=17){label=t("Arremesso (e liberdade)");damage=1;opponentEffect=-2;escape=true;}
  else if(row===18){label=t("Chute");damage=2;opponentEffect=-1;}
  else if(row===19){label=HOLDS.neck;damage=3;opponentEffect=-2;hold='neck';}
  else {label=HOLDS.bear;damage=1;opponentEffect=-4;hold='bear';}
 } else {
  let left=0,right=0;
  if(row===1){label=t("Erro");opponentEffect=2;}
  else if(row<=4){label=t("Erro");opponentEffect=1;}
  else if(row<=7){label=t("Bloqueado");}
  else if(row<=14){label=t("Golpe fintado");right=1;opponentEffect=1;severity=-2;}
  else if(row===15){label='Jab';left=1;right=2;severity=-1;}
  else if(row===16){label=t("Gancho");left=2;right=2;severity=0;}
  else if(row<=18){label=t("Sequência");left=1;right=2;opponentEffect=-1;severity=0;}
  else if(row===19){label=t("Direto");left=2;right=2;opponentEffect=-2;severity=1;}
  else {label=t("Cruzado");left=2;right=3;opponentEffect=-3;severity=2;}
  if(mode==='brawl') {
   const hit=n=>n>0?n+tool.damage:0;
   damage=row>=17&&row<=18&&freeHands>=2?hit(right)+hit(ambidextrous?right:left):hit(hand==='left'&&!ambidextrous?left:right);
  } else opponentEffect=0;
 }
 return {mode,die,total,row,label,damage,opponentEffect,selfEffect,selfDamage,hold,severity,escape,modifiers:[[t("Perícia"),skill],[t("Defesa"),mode==='knife'?0:-defense],[t("Mais forte"),mode!=='knife'&&stronger?1:0],[t("Ferimentos"),wounds],[t("Efeito anterior"),effect],[t("Objeto"),tool.attack],[t("Juiz"),judge]]};
}
export function pendingMeleeModifier(actor,combat=globalThis.game?.combat) {
 return (actor.getFlag?.('boothill','meleeState')?.effects??[]).filter(e=>!e.combatId||(combat?.id===e.combatId&&combat.round===e.round)).reduce((n,e)=>n+e.modifier,0);
}
export function allowedHands(actor) {
 const holds=actor.getFlag?.('boothill','meleeState')?.holds??[];
 if(holds.some(h=>h.kind==='bear')) return [];
 return ['right','left'].filter(side=>!holds.some(h=>h.kind===`${side}Arm`));
}
