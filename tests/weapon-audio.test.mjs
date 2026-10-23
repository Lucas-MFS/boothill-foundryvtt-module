import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shotAudio,playWeaponSound,reloadAudio,playReloadSound} from '../scripts/weapon-audio.mjs';
test('áudio da arma é opcional, não repete e transmite uma vez',async()=>{
 globalThis.game={user:{id:'me'},users:[{id:'me',active:true},{id:'other',active:true},{id:'offline',active:false}]};
 const calls=[];globalThis.foundry={audio:{AudioHelper:{play:async(...args)=>{calls.push(args);}}}};
 assert.equal(await playWeaponSound({shotSound:''}),false);assert.equal(calls.length,0);
 assert.equal(await playWeaponSound({shotSound:'weapons/shot.ogg',shotVolume:.4}),true);
 assert.deepEqual(calls,[ [{src:'weapons/shot.ogg',volume:.4,loop:false,channel:'interface'},{recipients:['other']}]  ]);
 await playWeaponSound({src:'weapons/shot.ogg',volume:.7},false);assert.equal(calls[1][1],false);
 assert.equal(shotAudio({volume:2}).volume,1);
});
test('falha de áudio não interrompe o disparo',async()=>{
 globalThis.foundry={audio:{AudioHelper:{play:async()=>{throw new Error('Arquivo ausente');}}}};
 let notified=false;globalThis.ui={notifications:{warn:()=>{notified=true;}}};
 const original=console.error;console.error=()=>{};
 try {assert.equal(await playWeaponSound({src:'missing.ogg'}),false);assert.equal(notified,true);} finally {console.error=original;}
});

test('recarga usa arquivo próprio e exclui iniciador da transmissão',async()=>{
 globalThis.game={user:{id:'me'},users:[{id:'me',active:true},{id:'other',active:true}]};
 const calls=[];globalThis.foundry={audio:{AudioHelper:{play:async(...args)=>calls.push(args)}}};
 assert.equal(reloadAudio({shotSound:'shot.ogg',reloadSound:'reload.ogg',reloadVolume:.3}).src,'reload.ogg');
 await playReloadSound({reloadSound:'reload.ogg',reloadVolume:.3});
 assert.equal(calls.length,1);assert.equal(calls[0][0].src,'reload.ogg');assert.deepEqual(calls[0][1],{recipients:['other']});
});
