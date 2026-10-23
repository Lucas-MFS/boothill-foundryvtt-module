import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shotAudio,playWeaponSound} from '../scripts/weapon-audio.mjs';
test('áudio da arma é opcional, não repete e transmite uma vez',async()=>{
 const calls=[];globalThis.foundry={audio:{AudioHelper:{play:async(...args)=>{calls.push(args);}}}};
 assert.equal(await playWeaponSound({shotSound:''}),false);assert.equal(calls.length,0);
 assert.equal(await playWeaponSound({shotSound:'weapons/shot.ogg',shotVolume:.4}),true);
 assert.deepEqual(calls,[ [{src:'weapons/shot.ogg',volume:.4,loop:false,channel:'interface'},true] ]);
 await playWeaponSound({src:'weapons/shot.ogg',volume:.7},false);assert.equal(calls[1][1],false);
 assert.equal(shotAudio({volume:2}).volume,1);
});
test('falha de áudio não interrompe o disparo',async()=>{
 globalThis.foundry={audio:{AudioHelper:{play:async()=>{throw new Error('Arquivo ausente');}}}};
 let notified=false;globalThis.ui={notifications:{warn:()=>{notified=true;}}};
 const original=console.error;console.error=()=>{};
 try {assert.equal(await playWeaponSound({src:'missing.ogg'}),false);assert.equal(notified,true);} finally {console.error=original;}
});
