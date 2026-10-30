import {t} from './localization.mjs';
export async function reportReload(actor,before,after) {
 const loaded=after-before;
 if(!actor||!game.combat?.started||loaded<=0) return;
 const name=foundry.utils.escapeHTML(actor.name);
 return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p>${name} ${t("recarregou")} ${loaded} ${loaded===1?t("bala"):t("balas")}.</p>`});
}
