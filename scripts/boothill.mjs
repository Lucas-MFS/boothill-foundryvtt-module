import {remainingHealth,registerHealthResource} from './health-resource.mjs';
import {attackAnimal} from './animal-attack.mjs';
import {AmmunitionData,AmmunitionSheet} from './ammunition.mjs';
import {reloadWithReserve,inventoryItems} from './ammunition-rules.mjs';
import {reportReload} from './reload-chat.mjs';
import {playReloadSound,playWeaponSound,shotAudio} from './weapon-audio.mjs';
import {mountActor} from './mounts.mjs';
import {attackMelee} from './melee-actions.mjs';
import {registerMelee,consumeMeleeModifier} from './melee.mjs';
import {pendingMeleeModifier,HOLDS} from './melee-rules.mjs';
import {postCheck,modifierText,registerChatCards} from './chat.mjs';
import {ATTRIBUTES,NPC_ATTRIBUTES,SKILLS,generatedNpcScore,generatedScore,creationSummary,isWorkTrained} from './rules.mjs';
import {WeaponData,WeaponSheet} from './weapon.mjs';
import {weaponSummary} from './weapon-rules.mjs';
import {LOCATIONS,SHOTS,MOVEMENTS,movementDistances,rapidity,handsRequired,canHold,healthSummary,shotTarget} from './combat-rules.mjs';
async function judgeModifier(event,title) {
  if(!event.shiftKey) return 0;
  return foundry.applications.api.DialogV2.prompt({window:{title},content:'<label>Modificador <input name="modifier" type="number" step="1" value="0"></label>',ok:{label:'Confirmar',callback:(e,b,d)=>Number(d.element.querySelector('[name="modifier"]').value)},rejectClose:false});
}
class CharacterData extends foundry.abstract.TypeDataModel {
  prepareDerivedData() {
    this.hp=remainingHealth(this);
  }
  static defineSchema() {
    const {SchemaField,NumberField,StringField,BooleanField,ArrayField}=foundry.data.fields;
    const level=()=>new NumberField({required:true,nullable:false,integer:true,min:0,initial:0});
    const health=new SchemaField({mortal:new BooleanField({initial:false}),mortalLocation:new StringField({initial:''}),points:level(),temporary:level(),locations:new SchemaField(Object.fromEntries(Object.keys(LOCATIONS).map(id=>[id,new SchemaField({light:level(),serious:level()})])))});
    const combat=new SchemaField({stronger:new BooleanField({initial:false}),bladeReady:new BooleanField({initial:false}),movement:new StringField({initial:'still',choices:Object.keys(MOVEMENTS)}),movementRound:new NumberField({nullable:true,initial:null}),movementCombat:new StringField({initial:''}),primaryWeapon:new StringField({initial:''}),dualFire:new BooleanField({initial:true}),range:new StringField({initial:'short',choices:['close','short','long','extreme']})});
    return {mount:new SchemaField({uuid:new StringField({initial:''}),tokenUuid:new StringField({initial:''}),mounted:new BooleanField({initial:false})}),health,combat,inventory:new ArrayField(new SchemaField({id:new StringField(),name:new StringField(),quantity:new NumberField({min:1,integer:true,initial:1}),weight:new NumberField({min:0,initial:0})}),{initial:[]}),carryCapacity:new NumberField({min:0,initial:0}),identity:new SchemaField({player:new StringField({initial:''}),age:level(),xp:level(),ambidextrous:new BooleanField({initial:false})}),attributes:new SchemaField(Object.fromEntries(Object.keys(ATTRIBUTES).map(id=>[id,level()]))),skills:new SchemaField(Object.fromEntries(SKILLS.map(s=>[s.id,level()]))),trained:new SchemaField(Object.fromEntries(SKILLS.filter(s=>s.kind==='work').map(s=>[s.id,new BooleanField({nullable:true,initial:null})])))};
  }
}
class NpcData extends CharacterData {
  static defineSchema() {
    const schema=super.defineSchema(),{SchemaField,NumberField,BooleanField}=foundry.data.fields;
    schema.attributes=new SchemaField(Object.fromEntries(Object.keys(NPC_ATTRIBUTES).map(id=>[id,new NumberField({required:true,nullable:false,integer:true,min:0,initial:0})])));
    schema.identity=new SchemaField({ambidextrous:new BooleanField({initial:false})});
    delete schema.inventory;delete schema.carryCapacity;
    return schema;
  }
}
export class CharacterSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  get isNpc() {return this.actor.type==='npc';}
  get attributeLabels() {return this.isNpc?NPC_ATTRIBUTES:ATTRIBUTES;}
  get title() { return `${this.isNpc?'NPC':'Personagem'}: ${this.actor.name}`; }
  _editingSkills=false;
  _expandedWeapons=new Set();
  _expandedSkills=new Set();
  _movementTab="foot";
  static DEFAULT_OPTIONS={classes:['boothill'],tag:'form',position:{width:912,height:960},form:{submitOnChange:true,closeOnSubmit:false},actions:{chooseMount:CharacterSheet.chooseMount,toggleMount:CharacterSheet.toggleMount,removeMount:CharacterSheet.removeMount,chooseMountToken:CharacterSheet.chooseMountToken,check:CharacterSheet.check,generate:CharacterSheet.generate,generateSkill:CharacterSheet.generateSkill,toggleSkills:CharacterSheet.toggleSkills,openWeapon:CharacterSheet.openWeapon,toggleWeapon:CharacterSheet.toggleWeapon,createWeapon:CharacterSheet.createWeapon,shoot:CharacterSheet.shoot,swapHands:CharacterSheet.swapHands,reloadWeapon:CharacterSheet.reloadWeapon,reportRapidity:CharacterSheet.reportRapidity,toggleDetails:CharacterSheet.toggleDetails,toggleSkillDetails:CharacterSheet.toggleSkillDetails,movementTab:CharacterSheet.movementTab,move:CharacterSheet.move,clearMovement:CharacterSheet.clearMovement,addGear:CharacterSheet.addGear,removeGear:CharacterSheet.removeGear,toggleMortal:CharacterSheet.toggleMortal,melee:attackMelee,clearMelee:CharacterSheet.clearMelee}};
  static PARTS={main:{template:'systems/boothill/templates/character.hbs',scrollable:['.bh-body']}};
  async _onRender(context,options) {
    await super._onRender(context,options);
    const mountLink=this.element.querySelector('[data-mount-link]');
    mountLink?.addEventListener('dblclick',()=>this.openMount());
    mountLink?.addEventListener('keydown',event=>{if(event.key==='Enter') this.openMount();});
    if(!this.isEditable) return;
    if(['character','npc'].includes(this.actor.type)) {
      this.element.addEventListener('dragover',event=>event.preventDefault());
      this.element.addEventListener('drop',async event=>{
        let data;try {data=JSON.parse(event.dataTransfer.getData('text/plain'));} catch {return;}
        if(data.type!=='Actor'||!data.uuid) return;
        event.preventDefault();event.stopPropagation();
        const document=await fromUuid(data.uuid);
        const actor=document?.documentName==='Token'?document.actor:document;
        if(actor) await this._onDropActor(event,actor);
      });
    }
    for(const row of this.element.querySelectorAll('tr[data-action="toggleDetails"]')) row.addEventListener('keydown',event=>{
      if(event.target===row&&['Enter',' '].includes(event.key)) {event.preventDefault();CharacterSheet.toggleDetails.call(this,event,row);}
    });
    for(const input of this.element.querySelectorAll('[data-inventory-id]')) input.addEventListener('change',async()=>{
      const value=input.valueAsNumber,field=input.dataset.field,id=input.dataset.inventoryId;
      if(!Number.isFinite(value)||value<0||(field==='quantity'&&(!Number.isInteger(value)||(input.dataset.documentItem!=='true'&&value<1)))) return;
      if(input.dataset.documentItem==='true') await this.actor.items.get(id)?.update({[`system.${field}`]:value});
      else await this.actor.update({'system.inventory':this.actor.system.inventory.map(i=>i.id===id?{...i,[field]:value}:i)});
    });
    for(const select of this.element.querySelectorAll('[data-weapon-range]')) select.addEventListener('change',()=>this.actor.update({'system.combat.range':select.value}));
    for(const select of this.element.querySelectorAll('[data-weapon-ammunition]')) select.addEventListener('change',()=>this.actor.items.get(select.dataset.weaponAmmunition)?.update({'system.ammunitionId':select.value}));
    this._ammoChanges??={};
    this._saveAmmo??=foundry.utils.debounce(async()=>{
      const changes=this._ammoChanges;this._ammoChanges={};
      if(Object.keys(changes).length) await this.actor.updateEmbeddedDocuments('Item',Object.entries(changes).map(([id,ammo])=>({_id:id,'system.ammo':ammo,'system.reloadProgress':0})));
    },300);
    for(const input of this.element.querySelectorAll('[data-ammo-id]')) input.addEventListener('input',()=>{
      const item=this.actor.items.get(input.dataset.ammoId),value=input.valueAsNumber;
      if(!item||!Number.isInteger(value)||value<0||value>item.system.capacity) return;
      this._ammoChanges[item.id]=value;this._saveAmmo();
    });
    this._healthChanges??={};
    this._saveHealth??=foundry.utils.debounce(async()=>{
      const changes=this._healthChanges;this._healthChanges={};
      if(Object.keys(changes).length) await this.actor.update(changes);
    },300);
    for(const input of this.element.querySelectorAll('.bh-health input[type="number"]')) input.addEventListener('input',()=>{
      const value=input.valueAsNumber;
      if(!Number.isInteger(value)||value<0) return;
      this._healthChanges[input.name]=value;this._saveHealth();
    });
  }
  async _prepareContext(options) {
    const context=await super._prepareContext(options),{attributes,skills,trained}=this.actor.system;
    const rows=SKILLS.map(s=>({...s,value:skills[s.id],trained:isWorkTrained(s.id,skills,trained)}));
    const icons={strength:'hand-fist',coordination:'crosshairs',observation:'eye',stature:'person',luck:'clover'};
    const work=rows.filter(s=>s.kind==='work'&&(this._editingSkills||s.trained));
    const health=healthSummary(this.actor.system.health,attributes.strength);
    const equipped=this.heldWeapons();
    const armament=this.actor.items.filter(i=>i.type==='weapon').map(i=>({id:i.id,name:i.name,img:i.img,system:i.system,hands:handsRequired(i.system),...weaponSummary(i.system)}));
    const held=equipped.map((i,index)=>({...armament.find(a=>a.id===i.id),rapidity:this.rapidityFor(i).total,hand:handsRequired(i.system)===2?'Duas mãos':index===0?'Mão principal':'Mão secundária',shots:Object.entries(SHOTS).map(([mode,shot])=>{
      const chance=this.chanceFor(i,mode);
      return {mode,...shot,chance:chance?.total,supported:chance!==null,available:chance!==null&&!health.unconscious&&i.system.ammo>0};
    })}));
    for(const row of armament) {row.ammunition=this.actor.items.filter(i=>i.type==='ammunition').map(i=>({id:i.id,label:`${i.name} (${i.system.quantity})`,selected:i.id===row.system.ammunitionId}));row.expanded=this._expandedWeapons.has(row.id);row.held=held.find(h=>h.id===row.id);row.handLabel=row.held?.hand??'Guardada';row.offhandPenalty=row.held?.hand==='Mão secundária'&&!this.actor.system.identity.ambidextrous;row.ranges=Object.entries({close:'Próximo (até 2 m)',short:`Curto (até ${row.system.short} m)`,long:`Longo (até ${row.system.long} m)`,extreme:`Extremo (até ${row.system.extreme} m)`}).map(([id,label])=>({id,label,selected:id===this.actor.system.combat.range}));}
    const gear=[...inventoryItems(this.actor),...(this.actor.system.inventory??[])];
    const totalWeight=gear.reduce((n,i)=>n+i.quantity*i.weight,0);
    const mount=await this.mountContext();
    const ranges={close:'Próximo (até 2 m)',short:'Curto',long:'Longo',extreme:'Extremo'};
    return {...context,mount,mountedTab:this._movementTab==='mounted',meleeEffect:pendingMeleeModifier(this.actor),meleeHolds:(this.actor.getFlag('boothill','meleeState')?.holds??[]).map(h=>HOLDS[h.kind]).join(' · '),outgoingHold:this.actor.getFlag('boothill','meleeState')?.outgoing,isNpc:this.isNpc,canGenerate:!this.isNpc||game.user.isGM,extraAttributes:this.isNpc&&game.user.isGM?['greed','bravery'].map(id=>({id,label:NPC_ATTRIBUTES[id],value:attributes[id]})):[],gear,totalWeight:Math.round(totalWeight*1000)/1000,movementActive:this.actor.system.combat.movement!=='still',movements:Object.entries(MOVEMENTS).map(([id,label])=>({id,label,selected:id===this.actor.system.combat.movement})),distances:movementDistances(this.actor.system.health,mount?.health,mount?.strength).map((r,index)=>({...r,group:index<4?'foot':'mounted',visible:(index<4?'foot':'mounted')===this._movementTab,id:['crawl','walk','dodge','run','horseWalk','trot','gallop'][index],combat:r.combat?`${r.combat.toLocaleString('pt-BR',{maximumFractionDigits:3})} m`:'—',firefight:r.firefight?`${r.firefight.toLocaleString('pt-BR',{maximumFractionDigits:3})} m`:'—'})),actor:this.actor,editable:this.isEditable,editingSkills:this._editingSkills,hasWork:work.length>0,work,held,hasTwo:held.length===2,health,locations:Object.entries(LOCATIONS).map(([id,label])=>({id,label,...this.actor.system.health.locations[id]})),ranges:Object.entries(ranges).map(([id,label])=>({id,label,selected:id===this.actor.system.combat.range})),armament,attributes:Object.entries(ATTRIBUTES).map(([id,label])=>({id,label,icon:icons[id],value:attributes[id]})),weapons:rows.filter(s=>s.kind==='weapon').map(s=>({...s,brawl:s.id==='briga',blade:s.id==='faca-espada',expandable:['briga','faca-espada'].includes(s.id),expanded:this._expandedSkills.has(s.id)})),summary:creationSummary(attributes,skills,trained)};
  }
  async mountContext() {
    const link=this.actor.system.mount;
    if(!link?.uuid) return null;
    const horse=await mountActor(link);
    const token=link.tokenUuid?await fromUuid(link.tokenUuid):null;
    const candidates=[...(globalThis.canvas?.scene?.tokens??[])].filter(t=>t.actor?.type==='horse'&&t.actor.id===horse?.id);
    const source=token?.actor?.id===horse?.id?token.actor:horse?.token?horse:candidates.length===1?candidates[0].actor:horse;
    return {name:horse?.name??'Montaria indisponível',img:horse?.img??'icons/svg/horse.svg',mounted:link.mounted,tokenName:token?.name??'Automático (se único na cena)',health:source?.system?.health,strength:source?.system?.attributes?.strength,sourceUuid:source?.uuid};
  }
  async openMount() {
    const context=await this.mountContext();
    const horse=context?.sourceUuid?await fromUuid(context.sourceUuid):await mountActor(this.actor.system.mount);
    if(!horse) return ui.notifications.warn('Montaria não encontrada.');
    horse.sheet.render({force:true});
  }
  async _onDropActor(event,actor) {
    if(!this.isEditable||!['character','npc'].includes(this.actor.type)||actor.type!=='horse') {ui.notifications.warn('Arraste um cavalo para a ficha de personagem ou NPC.');return null;}
    await this.actor.update({'system.mount':{uuid:actor.uuid,tokenUuid:actor.token?.uuid??'',mounted:false}});
    return actor;
  }
  static async chooseMount() {
    if(!this.isEditable) return;
    const horses=game.actors.filter(actor=>actor.type==='horse'&&actor.testUserPermission(game.user,'LIMITED'));
    if(!horses.length) return ui.notifications.warn('Crie um cavalo na aba Atores primeiro.');
    const id=await foundry.applications.api.DialogV2.prompt({window:{title:'Vincular montaria'},content:`<label>Cavalo <select name="horse">${horses.map(h=>`<option value="${h.id}">${foundry.utils.escapeHTML(h.name)}</option>`).join('')}</select></label>`,ok:{label:'Vincular',callback:(e,b,d)=>d.element.querySelector('[name=horse]').value},rejectClose:false});
    const horse=horses.find(h=>h.id===id);
    if(horse) await this._onDropActor(null,horse);
  }
  static async toggleMount() {
    if(!this.isEditable||!this.actor.system.mount?.uuid) return;
    await this.actor.update({'system.mount.mounted':!this.actor.system.mount.mounted});
  }
  static async removeMount() {
    if(this.isEditable) await this.actor.update({'system.mount':{uuid:'',tokenUuid:'',mounted:false}});
  }
  static async chooseMountToken() {
    if(!this.isEditable) return;
    const horse=await mountActor(this.actor.system.mount);
    const tokens=[...(canvas.scene?.tokens??[])].filter(t=>t.actor?.type==='horse'&&t.actor.id===horse?.id);
    if(!tokens.length) return ui.notifications.warn('Coloque o cavalo nesta cena antes de selecionar seu token.');
    const id=await foundry.applications.api.DialogV2.prompt({window:{title:'Token da montaria nesta cena'},content:`<label>Montaria <select name="mount-token">${tokens.map(t=>`<option value="${t.id}">${foundry.utils.escapeHTML(t.name)} (${t.id.slice(-4)})</option>`).join('')}</select></label>`,ok:{label:'Vincular token',callback:(e,b,d)=>d.element.querySelector('[name=mount-token]').value},rejectClose:false});
    const token=tokens.find(t=>t.id===id);
    if(token) await this.actor.update({'system.mount.tokenUuid':token.uuid});
  }
  heldWeapons() {
    return this.actor.items.filter(i=>i.type==='weapon'&&i.system.equipped).sort((a,b)=>Number(b.id===this.actor.system.combat.primaryWeapon)-Number(a.id===this.actor.system.combat.primaryWeapon)||a.sort-b.sort||a.id.localeCompare(b.id));
  }
  chanceFor(item,mode) {
    const held=this.heldWeapons(),index=held.findIndex(i=>i.id===item.id),{attributes,skills,identity,combat,health}=this.actor.system;
    if(combat.movement==='dodge'||index<0||held.reduce((n,i)=>n+handsRequired(i.system),0)>2) return null;
    const result=shotTarget({coordination:attributes.coordination,skill:skills[weaponSummary(item.system).skill==='Rifle'?'rifle':'pistola'],mode,weapon:item.system,secondary:index===1,dual:held.length===2&&combat.dualFire,ambidextrous:identity.ambidextrous,woundPenalty:healthSummary(health,attributes.strength).penalty,range:combat.range,movementPenalty:['run','trot'].includes(combat.movement)?-2:combat.movement==='gallop'?-4:0});
    return result?{...result,effect:pendingMeleeModifier(this.actor),total:result.total+pendingMeleeModifier(this.actor)}:null;
  }
  static async toggleSkillDetails(event,button) {
    const id=button.dataset.id;
    const opening=!this._expandedSkills.has(id);
    if(opening) this._expandedSkills.add(id);else this._expandedSkills.delete(id);
    button.setAttribute('aria-expanded',String(opening));
    const panel=button.closest('.bh-weapon-skill').querySelector('.bh-melee-details');
    panel.hidden=!opening;
    if(opening&&!matchMedia('(prefers-reduced-motion: reduce)').matches) panel.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
  }
  static async toggleDetails(event,button) {
    if(event.target.closest('button,input,img,a,select')) return;
    const id=button.dataset.id;
    if(this._expandedWeapons.has(id)) this._expandedWeapons.delete(id);else this._expandedWeapons.add(id);
    const detail=button.nextElementSibling;
    if(detail?.classList.contains('bh-weapon-details')) {
      const panel=detail.querySelector('.bh-details-inner');
      const opening=this._expandedWeapons.has(id);
      button.setAttribute('aria-expanded',String(opening));
      detail.hidden=false;
      const height=panel.scrollHeight;
      const animation=panel.animate([{height:opening?'0px':`${height}px`,opacity:opening?0:1},{height:opening?`${height}px`:'0px',opacity:opening?1:0}],{duration:220,easing:'ease-in-out'});
      await animation.finished;
      detail.hidden=!opening;
    }
  }
  static movementTab(event,button) {
    this._movementTab=button.dataset.id;
    const movement=button.closest('.bh-movement');
    for(const tab of movement.querySelectorAll('[role=tab]')) tab.setAttribute('aria-selected',String(tab.dataset.id===this._movementTab));
    for(const row of movement.querySelectorAll('[data-movement-group]')) row.hidden=row.dataset.movementGroup!==this._movementTab;
  }
  static async move(event,button) {
    if(!this.isEditable) return;
    const id=button.dataset.id;
    if(!Object.hasOwn(MOVEMENTS,id)) return;
    const combat=game.combat;
    await this.actor.update({'system.combat.movement':id,'system.combat.movementRound':combat?.round??null,'system.combat.movementCombat':combat?.id??''});
    const verb={crawl:'rastejando',walk:'andando',dodge:'esquivando',run:'correndo',horseWalk:'andando a cavalo',trot:'trotando',gallop:'galopando'}[id];
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content:`${foundry.utils.escapeHTML(this.actor.name)} está ${verb}.`});
  }
  static async clearMovement() {if(this.isEditable) await this.actor.update({'system.combat.movement':'still','system.combat.movementRound':null,'system.combat.movementCombat':''});}
  static async addGear() {
    if(!this.isEditable) return;
    const name=this.element.querySelector('[data-gear-name]').value.trim(),weight=Number(this.element.querySelector('[data-gear-weight]').value),quantity=Number(this.element.querySelector('[data-gear-quantity]').value);
    if(!name||!Number.isFinite(weight)||weight<0||!Number.isInteger(quantity)||quantity<1) return ui.notifications.warn('Preencha nome, quantidade e peso válidos.');
    await this.actor.update({'system.inventory':[...this.actor.system.inventory,{id:foundry.utils.randomID(),name,weight,quantity}]});
  }
  static async removeGear(event,button) {
    event.stopPropagation();
    if(!this.isEditable) return;
    const id=button.dataset.id;
    if(button.dataset.documentItem==='true'||button.dataset.weapon==='true') {
      if(!['weapon','ammunition'].includes(this.actor.items.get(id)?.type)) return;
      await this.actor.deleteEmbeddedDocuments('Item',[id]);
      this._expandedWeapons?.delete(id);
    } else await this.actor.update({'system.inventory':(this.actor.system.inventory??[]).filter(i=>i.id!==id)});
  }
  static async clearMelee() {if(this.isEditable) await this.actor.update({'flags.boothill.meleeState.effects':[],'flags.boothill.meleeState.holds':[]});}
  static async toggleMortal() {if(this.isEditable) await this.actor.update({'system.health.mortal':!this.actor.system.health.mortal});}
  static async swapHands() {
    if(!this.isEditable) return;
    await this.submit();
    const held=this.heldWeapons();
    if(held.length===2) await this.actor.update({'system.combat.primaryWeapon':held[1].id});
  }
  static async shoot(event,button) {
    if(!this.isEditable||this._firing) return;
    this._firing=true;
    try {
      await this.submit();
      const item=this.actor.items.get(button.dataset.id),mode=button.dataset.mode;
      if(item?.type!=='weapon'||!Object.hasOwn(SHOTS,mode)) return;
      if(healthSummary(this.actor.system.health,this.actor.system.attributes.strength).unconscious) return ui.notifications.warn('O personagem atingiu o limite de ferimentos e está desmaiado.');
      const chance=this.chanceFor(item,mode);
      if(!chance) return ui.notifications.warn('Empunhadura inválida ou tipo de tiro indisponível para esta arma.');
      if(item.system.malfunction) return ui.notifications.warn('A arma precisa ser destravada ou limpa pela ficha do item.');
      if(!item.system.ammo) return ui.notifications.warn('A arma está descarregada.');
      const modifier=await judgeModifier(event,`${SHOTS[mode].label} — ${item.name}`);
      if(modifier===null||modifier===undefined||!Number.isInteger(modifier)) return;
      if(!item.system.ammo||!item.system.equipped) return;
      const current=this.chanceFor(item,mode);
      if(!current||healthSummary(this.actor.system.health,this.actor.system.attributes.strength).unconscious) return;
      const ammoBefore=item.system.ammo;
      const target=current.total+modifier,roll=await new Roll('1d20').evaluate();
      await consumeMeleeModifier(this.actor);
      await item.update({'system.ammo':item.system.ammo-1,'system.reloadProgress':0});
      if(roll.total!==20) await playWeaponSound(item.system);
      await postCheck(this.actor,{title:`${item.name} · ${SHOTS[mode].label}`,target,roll,
        modifiers:[['Perícia',current.training],['Duas armas',current.twoWeapons],['Mão inábil',current.offhand],['Ferimentos',current.woundPenalty],['Alcance',current.distance],['Dispersão',current.spread],['Movimento',current.movementPenalty],['Efeito de briga',current.effect],['Juiz',modifier]],
        shot:{img:item.img,weaponName:item.name,audio:shotAudio(item.system),weaponUuid:item.uuid,actorUuid:this.actor.uuid,ammoBefore,model:item.system.model,mode,range:this.actor.system.combat.range,skill:this.actor.system.skills[weaponSummary(item.system).skill==='Rifle'?'rifle':'pistola'],wound:item.system.wound},note:''});
    } finally {this._firing=false;}
  }
  rapidityFor(item) {
    const {attributes,health,combat}=this.actor.system;
    return rapidity({coordination:attributes.coordination,weapon:item.system,woundPenalty:healthSummary(health,attributes.strength).penalty,movement:combat.movement,dual:this.heldWeapons().length===2&&combat.dualFire});
  }
  static async reportRapidity(event,button) {
    if(!this.isEditable) return;
    await this.submit();
    const item=this.actor.items.get(button.dataset.id);
    if(item?.type!=='weapon') return;
    const modifier=event.shiftKey?await foundry.applications.api.DialogV2.prompt({window:{title:'Rapidez — modificadores'},content:'<div class="form-group"><label><input type="radio" name="surprise" value="-2"> Surpreso (−2)</label></div><div class="form-group"><label><input type="radio" name="surprise" value="-4"> Completamente surpreso (−4)</label></div>',ok:{label:'Confirmar',callback:(e,b,d)=>Number(d.element.querySelector('[name="surprise"]:checked')?.value??0)},rejectClose:false}):0;
    if(!Number.isInteger(modifier)) return;
    const r=this.rapidityFor(item);
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.actor}),content:`<article class="bh-roll-card"><header><span>BOOT HILL</span><h3>Rapidez · ${foundry.utils.escapeHTML(item.name)}</h3></header><div class="bh-rapidity-score">${r.total+modifier}</div>${modifierText([['Arma',r.weapon],['Ferimentos',r.wounds],['Movimento',r.motion],['Duas armas',r.dual],[modifier===-4?'Completamente surpreso':'Surpreso',modifier]])}</article>`});
  }
  static async reloadWeapon(event,button) {
    if(!this.isEditable||this._reloading) return;
    this._reloading=true;
    try {
      const item=this.actor.items.get(button.dataset.id);
      if(item?.type!=='weapon') return;
      const pending=this._ammoChanges?.[item.id];
      if(pending!==undefined) delete this._ammoChanges[item.id];
      const previous={ammo:pending??item.system.ammo,reloadProgress:pending===undefined?item.system.reloadProgress:0};
      const next=await reloadWithReserve(item,previous);
      if(!next) return;
      if(previous.ammo!==next.ammo||previous.reloadProgress!==next.reloadProgress) await playReloadSound(item.system);
      await reportReload(this.actor,previous.ammo,next.ammo);
    } finally {this._reloading=false;}
  }
  static async openWeapon(event,button) { this.actor.items.get(button.dataset.id)?.sheet.render({force:true}); }
  static async toggleWeapon(event,button) {
    if(!this.isEditable) return;
    const item=this.actor.items.get(button.dataset.id);
    if(item?.type==='weapon') await item.update({'system.equipped':!item.system.equipped});
  }
  static async createWeapon() {
    if(!this.isEditable) return;
    const [item]=await this.actor.createEmbeddedDocuments('Item',[{name:'Nova arma',type:'weapon',img:'icons/svg/sword.svg'}]);
    item.sheet.render({force:true});
  }
  static async toggleSkills() {
    if(!this.isEditable) return;
    await this.submit();
    this._editingSkills=!this._editingSkills;
    this.render();
  }
  static async generate() {
    if(!this.isEditable||(this.isNpc&&!game.user.isGM)) return;
    if(Object.values(this.actor.system.attributes).some(n=>n>0)&&!await foundry.applications.api.DialogV2.confirm({window:{title:'Gerar atributos'},content:`<p>${this.isNpc?'Substituir os atributos do NPC por novas rolagens de 2d10?':'Substituir os cinco atributos pelo método 1?'}</p>`})) return;
    const update={};
    for(const id of Object.keys(this.attributeLabels)) {
      const roll=await new Roll('2d10').evaluate();
      const value=(this.isNpc?generatedNpcScore:generatedScore)(roll.total,['stature','luck'].includes(id));
      update[`system.attributes.${id}`]=value;
      await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Geração: ${this.attributeLabels[id]} → ${value}`,...(this.isNpc?{whisper:game.users.filter(u=>u.isGM).map(u=>u.id)}:{})});
    }
    await this.actor.update(update);
  }
  static async generateSkill(event,button) {
    if(!this.isEditable) return;
    const skill=SKILLS.find(s=>s.id===button.dataset.id&&s.kind==='work');
    if(!skill) return;
    if(this.actor.system.skills[skill.id]>0&&!await foundry.applications.api.DialogV2.confirm({window:{title:skill.label},content:'<p>Substituir o nível atual?</p>'})) return;
    const roll=await new Roll('2d10').evaluate(),value=(this.isNpc?generatedNpcScore:generatedScore)(roll.total);
    await this.actor.update({[`system.skills.${skill.id}`]:value,[`system.trained.${skill.id}`]:true});
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Nível: ${skill.label} → ${value}`});
  }
  static async check(event,button) {
    if(!this.isEditable) return;
    const {group,id}=button.dataset,skill=SKILLS.find(s=>s.id===id&&s.kind==='work');
    if(!(group==='attributes'&&Object.hasOwn(this.attributeLabels,id))&&!(group==='skills'&&skill)) return;
    const secret=this.isNpc&&group==='attributes'&&['greed','bravery'].includes(id);
    if(secret&&!game.user.isGM) return;
    let target=this.actor.system[group][id];
    if(group==='skills'&&!isWorkTrained(id,this.actor.system.skills,this.actor.system.trained)) return ui.notifications.warn('Perícia não treinada.');
    const modifier=await judgeModifier(event,'Modificador');
    if(modifier===null||modifier===undefined||!Number.isInteger(modifier)) return;
    const effect=pendingMeleeModifier(this.actor);
    target+=modifier+effect;
    const roll=await new Roll('1d20').evaluate();
    await consumeMeleeModifier(this.actor);
    await postCheck(this.actor,{title:group==='attributes'?this.attributeLabels[id]:skill.label,target,roll,modifiers:[['Efeito de briga',effect],['Juiz',modifier]],...(secret?{whisper:game.users.filter(u=>u.isGM).map(u=>u.id)}:{})});
  }
}
export const HORSE_ATTRIBUTES={strength:'Força',coordination:'Coordenação',intelligence:'Inteligência',luck:'Sorte'};
export const HORSE_SKILLS={herding:'Pastoreio',cutting:'Corte',swimming:'Natação',gunfire:'Explosão'};
export const HORSE_LOCATIONS={head:'Cabeça',leftShoulder:'Ombro esq.',rightShoulder:'Ombro dir.',chest:'Peito',abdomen:'Abdômen',leftArm:'Dianteira esq.',rightArm:'Dianteira dir.',leftLeg:'Traseira esq.',rightLeg:'Traseira dir.'};
export class HorseData extends CharacterData {
  static defineSchema() {
    const schema=super.defineSchema(),{SchemaField,NumberField,BooleanField,ArrayField,StringField}=foundry.data.fields;
    const level=()=>new NumberField({required:true,nullable:false,integer:true,min:0,initial:0});
    schema.attributes=new SchemaField(Object.fromEntries(Object.keys(HORSE_ATTRIBUTES).map(id=>[id,level()])));
    schema.skills=new SchemaField(Object.fromEntries(Object.keys(HORSE_SKILLS).map(id=>[id,level()])));
    schema.trained=new SchemaField(Object.fromEntries(Object.keys(HORSE_SKILLS).map(id=>[id,new BooleanField({initial:false})])));
    schema.tricks=new ArrayField(new SchemaField({id:new StringField(),name:new StringField(),level:level()}),{initial:[]});
    delete schema.identity;
    return schema;
  }
}
export class HorseSheet extends CharacterSheet {
  get title() {return `Cavalo: ${this.actor.name}`;}
  static DEFAULT_OPTIONS={classes:['boothill','bh-horse-sheet'],position:{width:912,height:960},actions:{check:HorseSheet.check,addTrick:HorseSheet.addTrick,removeTrick:HorseSheet.removeTrick}};
  static PARTS={main:{template:'systems/boothill/templates/horse.hbs',scrollable:['.bh-body']}};
  async _prepareContext(options) {
    const context=await foundry.applications.sheets.ActorSheetV2.prototype._prepareContext.call(this,options);
    const actor=this.actor,system=actor.system;
    const gear=[...inventoryItems(actor),...system.inventory];
    return {...context,actor,tokenImage:this.token?.texture?.src??actor.prototypeToken?.texture?.src??actor.img,editable:this.isEditable,editingSkills:this._editingSkills,hasHorseSkills:Object.values(system.trained).some(Boolean),gear,totalWeight:Math.round(gear.reduce((sum,i)=>sum+i.quantity*i.weight,0)*1000)/1000,health:healthSummary(system.health,system.attributes.strength),locations:Object.entries(HORSE_LOCATIONS).map(([id,label])=>({id,label,...system.health.locations[id]})),attributes:Object.entries(HORSE_ATTRIBUTES).map(([id,label])=>({id,label,icon:{strength:'hand-fist',coordination:'crosshairs',intelligence:'brain',luck:'clover'}[id],value:system.attributes[id]})),skills:Object.entries(HORSE_SKILLS).filter(([id])=>this._editingSkills||system.trained[id]).map(([id,label])=>({id,label,value:system.skills[id],trained:system.trained[id]})),tricks:system.tricks};
  }
  async _onRender(context,options) {
    await super._onRender(context,options);
    this.element.querySelector('[data-horse-drag]')?.addEventListener('dragstart',event=>{
      event.dataTransfer.setData('text/plain',JSON.stringify({type:'Actor',uuid:this.actor.uuid}));
    });
    if(!this.isEditable) return;
    for(const input of this.element.querySelectorAll('input[name]')) input.addEventListener('change',async()=>{
      const value=input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value;
      if(input.type==='number'&&(!Number.isFinite(value)||(value<0&&!input.name.startsWith('system.animal.')))) return;
      await this.actor.update({[input.name]:value});
    });
    for(const input of this.element.querySelectorAll('[data-trick-id]')) input.addEventListener('change',async()=>{
      const level=input.valueAsNumber;
      if(!Number.isInteger(level)||level<0) return;
      await this.actor.update({'system.tricks':this.actor.system.tricks.map(t=>t.id===input.dataset.trickId?{...t,level}:t)});
    });
  }
  static async check(event,button) {
    if(!this.isEditable) return;
    await this.submit();
    const {attributes,skills,trained,tricks}=this.actor.system,id=button.dataset.id,group=button.dataset.group;
    let target,title;
    if(group==='attributes'&&Object.hasOwn(HORSE_ATTRIBUTES,id)) {target=attributes[id];title=HORSE_ATTRIBUTES[id];if(id==='coordination'&&trained.cutting) target=skills.cutting>target?skills.cutting:target+3;}
    else if(group==='skills'&&Object.hasOwn(HORSE_SKILLS,id)) {
      title=HORSE_SKILLS[id];target=trained[id]?skills[id]:id==='swimming'?Math.ceil(attributes.strength/2):id==='gunfire'?attributes.intelligence:null;
      if(id==='gunfire'&&trained[id]&&attributes.intelligence>=target) target=attributes.intelligence+3;
    } else if(group==='tricks') {const trick=tricks.find(t=>t.id===id);target=trick?.level;title=trick?.name;}
    if(!Number.isFinite(target)) return ui.notifications.warn('Marque esta perícia como treinada para rolá-la.');
    const modifier=await judgeModifier(event,title);
    if(!Number.isInteger(modifier)) return;
    await postCheck(this.actor,{title,target:target+modifier,roll:await new Roll('1d20').evaluate(),modifiers:[['Juiz',modifier]]});
  }
  static async addTrick() {
    if(!this.isEditable) return;
    const name=this.element.querySelector('[data-trick-name]').value.trim();
    if(!name) return;
    await this.actor.update({'system.tricks':[...this.actor.system.tricks,{id:foundry.utils.randomID(),name,level:0}]});
  }
  static async removeTrick(event,button) {if(this.isEditable) await this.actor.update({'system.tricks':this.actor.system.tricks.filter(t=>t.id!==button.dataset.id)});}
}
export class WildAnimalData extends HorseData {
 static defineSchema() {
  const schema=super.defineSchema(),{SchemaField,NumberField}=foundry.data.fields;
  const modifier=()=>new NumberField({required:true,nullable:false,integer:true,initial:0});
  schema.animal=new SchemaField({attack:modifier(),severity:modifier(),defense:modifier()});return schema;
 }
}
export class WildAnimalSheet extends HorseSheet {
 get title() {return `Animal selvagem: ${this.actor.name}`;}
 static DEFAULT_OPTIONS={classes:['boothill','bh-horse-sheet','bh-wild-sheet'],actions:{attackAnimal}};
 static PARTS={main:{template:'systems/boothill/templates/wild-animal.hbs',scrollable:['.bh-body']}};
 async _prepareContext(options) {return {...await super._prepareContext(options),animal:this.actor.system.animal};}
}
registerChatCards();
registerMelee();
Hooks.once('init',()=>{
  CONFIG.Actor.dataModels.character=CharacterData;
  CONFIG.Actor.dataModels.npc=NpcData;
  CONFIG.Actor.dataModels.horse=HorseData;
  CONFIG.Actor.dataModels.wildAnimal=WildAnimalData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',WildAnimalSheet,{types:['wildAnimal'],makeDefault:true,label:'Boot Hill — Animal selvagem'});
  CONFIG.Item.dataModels.weapon=WeaponData;
  CONFIG.Item.dataModels.ammunition=AmmunitionData;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item,'boothill',AmmunitionSheet,{types:['ammunition'],makeDefault:true,label:'Boot Hill — Munição'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',HorseSheet,{types:['horse'],makeDefault:true,label:'Boot Hill — Cavalo'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item,'boothill',WeaponSheet,{types:['weapon'],makeDefault:true,label:'Boot Hill — Arma'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',CharacterSheet,{types:['character'],makeDefault:true,label:'Boot Hill — Personagem de jogador'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'boothill',CharacterSheet,{types:['npc'],makeDefault:true,label:'Boot Hill — NPC'});
});

registerHealthResource();

// Keep hand limits consistent for both the actor sheet and the embedded item sheet.
Hooks.on('preUpdateItem',(item,changes)=>{
  if(item.type!=='weapon'||!item.parent) return;
  const data=foundry.utils.mergeObject(item.system.toObject(),foundry.utils.expandObject(changes).system??{},{inplace:false});
  if(!canHold(item.parent.items.filter(i=>i.type==='weapon'),data,item.id)) {ui.notifications.warn('As mãos já estão ocupadas: use até duas armas de uma mão ou uma de duas mãos.');item.sheet.render({force:true});return false;}
});
Hooks.on('preCreateItem',(item)=>{
  if(item.type==='weapon'&&item.parent&&!canHold(item.parent.items.filter(i=>i.type==='weapon'),item.system,item.id)) item.updateSource({'system.equipped':false});
});

Hooks.on('updateCombat',async(combat,changes)=>{
  if(!game.user.isGM||game.users.activeGM?.id!==game.user.id||!('round' in changes)&&!('active' in changes)) return;
  const actors=new Map([...game.actors,...combat.combatants.map(c=>c.actor).filter(Boolean)].map(a=>[a.uuid,a]));
  for(const actor of actors.values()) if(['character','npc'].includes(actor.type)&&actor.system.combat.movementCombat===combat.id&&(actor.system.combat.movementRound!==combat.round||!combat.active)) await actor.update({'system.combat.movement':'still','system.combat.movementRound':null,'system.combat.movementCombat':''});
});
Hooks.on('deleteCombat',async combat=>{
 if(!game.user.isGM||game.users.activeGM?.id!==game.user.id) return;
 for(const actor of game.actors) if(['character','npc'].includes(actor.type)&&actor.system.combat.movementCombat===combat.id) await actor.update({'system.combat.movement':'still','system.combat.movementRound':null,'system.combat.movementCombat':''});
});

Hooks.on('renderApplicationV2',app=>{
 if(!app.element?.classList.contains('boothill')) return;
 for(const input of app.element.querySelectorAll('input[type="number"]')) input.step='1';
});

// Refresh open rider sheets when their actual mount's health changes.
Hooks.on('updateActor',async actor=>{
 if(actor.type!=='horse') return;
 const riders=new Map([...game.actors,...[...(globalThis.canvas?.scene?.tokens??[])].map(t=>t.actor).filter(Boolean)].map(a=>[a.uuid,a]));
 for(const rider of riders.values()) for(const sheet of Object.values(rider.apps??{})) {
  if(!(sheet instanceof CharacterSheet)||sheet instanceof HorseSheet||!sheet.rendered||!rider.system.mount?.uuid) continue;
  const mount=await sheet.mountContext();
  if(mount?.sourceUuid===actor.uuid) sheet.render();
 }
});
