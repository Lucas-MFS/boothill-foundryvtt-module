// Derived display resource: the sheet's wound totals remain the source of truth.
export const HEALTH_BAR='hp';
export const HEALTH_RESOURCE='hp.value';
const TYPES=['character','npc','horse','wildAnimal'];
export function remainingHealth(system) {
  const max=Math.max(0,Number(system.attributes.strength)||0);
  const wounds=(Number(system.health.points)||0)+(Number(system.health.temporary)||0);
  return {value:system.health.mortal?0:Math.max(0,max-wounds),max};
}
export function needsHealthBar(attribute) {
  return !attribute||attribute==='health.points';
}
export function registerHealthResource() {
  Hooks.on('init',()=>{
    for(const type of TYPES) {
      const attributes=CONFIG.Token.documentClass.getTrackedAttributes(CONFIG.Actor.dataModels[type]);
      CONFIG.Actor.trackableAttributes[type]={
        bar:[...new Set([...attributes.bar.map(p=>p.join('.')),HEALTH_BAR])],
        value:[...new Set([...attributes.value.map(p=>p.join('.')),HEALTH_RESOURCE])]
      };
    }
  });
  Hooks.on('preCreateActor',actor=>{
    if(TYPES.includes(actor.type)&&needsHealthBar(actor.prototypeToken.bar1.attribute)) actor.updateSource({'prototypeToken.bar1.attribute':HEALTH_BAR});
  });
  Hooks.on('preCreateToken',token=>{
    if(TYPES.includes(token.actor?.type)&&needsHealthBar(token.bar1.attribute)) token.updateSource({'bar1.attribute':HEALTH_BAR});
  });
  Hooks.on('ready',async()=>{
    if(!game.user.isGM||game.users.activeGM?.id!==game.user.id) return;
    try {
      const config=game.settings.get('core','combatTrackerConfig');
      if(!config.resource||['health.points','health.temporary'].includes(config.resource)) await game.settings.set('core','combatTrackerConfig',{...config,resource:HEALTH_RESOURCE});
      for(const actor of game.actors) if(TYPES.includes(actor.type)&&needsHealthBar(actor.prototypeToken.bar1.attribute)) await actor.update({'prototypeToken.bar1.attribute':HEALTH_BAR});
      for(const scene of game.scenes) {
        const updates=scene.tokens.filter(t=>TYPES.includes(t.actor?.type)&&needsHealthBar(t.bar1.attribute)).map(t=>({_id:t.id,'bar1.attribute':HEALTH_BAR}));
        if(updates.length) await scene.updateEmbeddedDocuments('Token',updates);
      }
    } catch(error) {
      console.error('Boot Hill | Configuração do recurso de saúde',error);
      ui.notifications.error('Não foi possível configurar o recurso de saúde dos tokens. Consulte o console.');
    }
  });
}
