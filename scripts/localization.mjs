import {aliases} from './localization-aliases.mjs';
// Use Foundry's dictionary; source text also provides a safe fallback before i18n initializes.
export function textKey(source) {
  let hash=2166136261;
  for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `BOOTHILL.Text.${(hash>>>0).toString(16)}`;
}
export function t(source) {
  if(typeof source!=='string') return source;
  const trimmed=source.trim(),key=textKey(trimmed),i18n=globalThis.game?.i18n;
  if(!trimmed||!i18n?.localize) return source;
  let translated=i18n.localize(key);
  if(translated===key&&aliases[key.slice('BOOTHILL.Text.'.length)]) translated=i18n.localize(aliases[key.slice('BOOTHILL.Text.'.length)]);
  if(translated.startsWith('BOOTHILL.Text.')) return source;
  return translated===key?source:source.replace(trimmed,translated);
}
const proxies=new WeakMap();
export function localized(value) {
  if(!value||typeof value!=='object') return t(value);
  if(proxies.has(value)) return proxies.get(value);
  const proxy=new Proxy(value,{get:(target,key,receiver)=>localized(Reflect.get(target,key,receiver))});
  proxies.set(value,proxy);
  return proxy;
}
