import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pelletCount,spreadInfo,pelletsCard} from '../scripts/shotgun.mjs';
import {rollCard} from '../scripts/chat.mjs';
import {injuryCard,locationAllowance} from '../scripts/injury.mjs';
test('Tabela 13 inclui seis na última faixa conforme PDF adicional informado',()=>{
 for(const [range,values] of Object.entries({short:[1,2,2,4,4,4],long:[0,1,1,3,3,3],extreme:[0,0,0,2,2,2]})) values.forEach((v,i)=>assert.equal(pelletCount(i+1,range),v));
 assert.equal(pelletCount(5,'close'),4);assert.throws(()=>pelletCount(7,'long'));
 assert.ok(pelletsCard({pelletsDie:6,pelletsCount:null}).includes('Resultado ausente'));
});
test('dispersão só escopeta longo/extremo, chance inclui perícia antes de dividir',()=>{
 const base={target:11,shot:{model:'sawedOff',range:'long'}};
 assert.deepEqual(spreadInfo(base),{radius:2,target:5});
 assert.deepEqual(spreadInfo({...base,shot:{...base.shot,range:'extreme'}}),{radius:5,target:5});
 assert.equal(spreadInfo({...base,shot:{model:'shotgun',range:'long'}}),null);
 assert.equal(spreadInfo({...base,secondary:true}),null);
 assert.equal(spreadInfo({...base,pelletChild:true}),null);
});
test('erro no principal ainda oferece dispersão; ferimentos só após acerto',()=>{
 const base={title:'Escopeta',target:11,die:12,luck:7,shot:{model:'sawedOff',range:'long'}};
 assert.ok(rollCard(base).includes('Rolar contra alvo secundário'));
 assert.ok(!rollCard(base).includes('Rolar quantidade'));
 assert.ok(rollCard({...base,die:5}).includes('Rolar quantidade'));
 assert.ok(pelletsCard({pelletsDie:1,pelletsCount:0}).includes('não causou ferimentos'));
});
test('cada ferimento ganha cartão próprio, secundários sem ajuste e com aplicação manual',()=>{
 assert.equal(locationAllowance({skill:0,mode:'fan',range:'long'}),0);
 const data={title:'Secundário',target:10,die:4,luck:7,secondary:true,pelletChild:true,shot:{model:'sawedOff',skill:0,mode:'fan',range:'long'},injury:{id:'head',die:2,location:1,weapon:0,total:3,severity:'Ferimento sério'}};
 assert.ok(injuryCard(data).includes('data-bh-damage'));
 assert.ok(!injuryCard({...data,applied:{name:'Alvo',points:3,severity:'Ferimento sério'}}).includes('data-bh-damage'));
 const parent=pelletsCard({pelletsDie:5,pelletsCount:3,pelletMessages:{0:'msg'}});
 assert.equal((parent.match(/data-bh-pellets="wound"/g)||[]).length,3);
 assert.ok(parent.includes('Criado no chat'));
});

test('adicionais resolvem localização e gravidade diretamente e exibem raio de dispersão',async()=>{
 const {resolveSecondaryPellet,pelletContext}=await import('../scripts/shotgun.mjs');
 const dice=[11,3];globalThis.Roll=class {async evaluate(){return {total:dice.shift()};}};
 const child={title:'Ferimento adicional',target:10,die:4,luck:7,pelletChild:true,secondary:true,shot:{model:'sawedOff',range:'long',wound:0,mode:'fan',skill:0}};
 const resolved=await resolveSecondaryPellet(child);
 assert.equal(resolved.data.locationValue,11);assert.equal(resolved.data.injury.id,'abdomen');assert.equal(resolved.data.injury.total,3);assert.equal(resolved.data.targetTokenUuid,null);
 const card=rollCard(resolved.data);assert.match(card,/até 2 m do alvo original/);assert.match(card,/data-bh-damage/);assert.doesNotMatch(card,/data-bh-injury/);
 assert.match(pelletContext({...child,shot:{range:'extreme'}}),/até 5 m/);
 const primary={...child,secondary:false,shot:{...child.shot,mode:'aimed',skill:5}};
 assert.equal((await resolveSecondaryPellet(primary)).data,primary);assert.equal(locationAllowance(primary.shot),2);assert.match(pelletContext(primary),/localização ajustável/);
});
