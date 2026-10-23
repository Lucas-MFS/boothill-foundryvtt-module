import {test} from 'node:test';
import assert from 'node:assert/strict';
import {locationAllowance,locationChoices,injuryResult,injuryCard} from '../scripts/injury.mjs';
import {rollCard} from '../scripts/chat.mjs';
test('ajuste segue tabela cumulativa, arredonda e nunca ultrapassa um quarto',()=>{
 for(const [mode,values] of Object.entries({aimed:[9,4,2],steady:[4,2,0],draw:[2,0,0],fan:[0,0,0]})) ['short','long','extreme'].forEach((range,i)=>assert.equal(locationAllowance({skill:9,mode,range}),values[i]));
});
test('escolha permite apenas regiões alcançáveis sem dar a volta no d20',()=>{
 const rows=locationChoices(15,{skill:4,mode:'aimed',range:'short'});
 assert.equal(rows.find(r=>r.id==='head').available,true);
 assert.equal(rows.find(r=>r.id==='head').value,19);
 assert.equal(rows.find(r=>r.id==='leftArm').available,false);
 assert.equal(locationChoices(1,{skill:4,mode:'aimed',range:'short'}).find(r=>r.id==='head').available,false);
});
test('gravidade aplica local e arma com limites corretos',()=>{
 assert.equal(injuryResult(3,'rightArm').severity,'Ferimento leve');
 assert.equal(injuryResult(5,'head').severity,'Ferimento mortal');
 assert.equal(injuryResult(1,'leftLeg',-1).severity,'Arranhão');
 assert.equal(injuryResult(3,'abdomen').severity,'Ferimento sério');
});
test('apenas tiro acertado e confirmado libera localização; 20 exige Juiz',()=>{
 const data={title:'Tiro',target:12,die:10,luck:5,shot:{skill:4,mode:'aimed',range:'short',wound:0}};
 assert.ok(rollCard(data).includes('Determinar localização'));
 assert.ok(!rollCard({...data,die:15}).includes('Determinar localização'));
 assert.ok(!rollCard({...data,target:25,die:20}).includes('Determinar localização'));
 assert.ok(rollCard({...data,target:25,die:20,luckDie:3}).includes('data-bh-defect'));
 assert.ok(injuryCard({...data,locationDie:15}).includes('bh-choice-map'));
});
