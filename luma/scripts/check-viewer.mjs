import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const player=await read('components/cinema-player.tsx');
assert(!/CineSrcVideo|relayEnabled|api\/cinesrc/.test(player),'Native CineSrc must stay disconnected');
assert(!/rewrites|proxyTimeout|RELAY/.test(await read('next.config.ts')),'No browser-service gateway in active config');
const pkg=JSON.parse(await read('package.json'));
assert(!pkg.scripts['dev:cinesrc']&&!pkg.dependencies['hls.js'],'No active native-player dependency or launcher');
const library=JSON.parse(await read('lib/youtube-library.json'));
assert(library.length>=30);assert(library.filter(f=>f.audioLanguage==='ar').length>=15);
assert.equal(new Set(library.map(f=>f.id)).size,library.length);
const channels=new Set(['UCSMOQeBJ2RAnuFungnQOxLg','UC0LSnqrwqtMwl2YwfUpO66g','UCET6sWl4Xcu-U8Ka9PJPrwA','UCz75RVbH8q2jdBJ4SnwuZZQ','UCm5U4zqpahzyNXBv5ZT51Jw']);
for(const f of library){assert(/^[\w-]{11}$/.test(f.id));assert(channels.has(f.publisherUrl.split('/').pop()));assert(f.durationSeconds>0&&f.verifiedAt&&f.channel);assert.equal(f.creditUrl,'https://www.youtube.com/watch?v='+f.id);assert(['film','short','documentary'].includes(f.category));if(f.category==='documentary')assert(f.durationSeconds>=1200);}
assert(library.some(f=>f.category==='film'));assert(library.some(f=>f.category==='short'));
for(const id of ['3DuMaOvjKOc','E9yj7pCIdY0','aqz-KE-bpKQ','eRsGyueVLvQ','R6MlUcmOul8'])assert(library.some(f=>f.id===id));
console.log('Protected embed restoration and 30 official YouTube records, Arabic coverage, identity, completeness and attribution checks passed.');
