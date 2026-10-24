import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const urls=new Map();
function source(name){if(urls.has(name))return urls.get(name);let code=name.endsWith('.json')?'export default '+fs.readFileSync(new URL('../lib/'+name,import.meta.url),'utf8'):stripTypeScriptTypes(fs.readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8'));code=code.replace(/from ['"]\.\/([^'"]+)['"]/g,(_,path)=>'from '+JSON.stringify(source(path)));const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');urls.set(name,url);return url;}
const types=await import(source('types')),search=await import(source('search')),service=await import(source('catalog-service')),subs=await import(source('subtitle-source'));
assert.equal(types.filmKey({id:238,type:'movie'}),'movie-238');assert.equal(types.filmKey({id:'238',identity:'archive',type:'movie'}),'archive:238');assert.equal(types.tmdbId({id:'tt1234567',identity:'imdb',type:'movie'}),undefined);
assert.equal(types.filmKey({id:'aqz-KE-bpKQ',identity:'youtube',type:'movie'}),'youtube:aqz-KE-bpKQ');
assert.equal(service.validProviderId('youtube','aqz-KE-bpKQ'),true);
assert.equal(service.validProviderId('youtube','../../arbitrary-url'),false);
assert.equal(service.validProviderId('nasa','legacy-record'),false);
const enriched=search.mergeFilms([{id:'tt5311514',identity:'imdb',type:'movie',title:'Your Name.',imdb:'tt5311514',anime:true},{id:372058,identity:'tmdb',type:'movie',title:'Your Name.',imdb:'tt5311514',poster:'https://example.test/poster'}]);
assert.equal(enriched.length,1);assert.equal(enriched[0].id,372058);assert.equal(enriched[0].anime,true);assert.ok(enriched[0].poster);
assert.equal(search.filterFilms([{id:1,type:'movie',title:'Animation',genres:['Animation']},{id:2,type:'movie',title:'Anime',anime:true}],{type:'anime'}).length,1,'Animation alone is not proof of anime');
assert.equal(search.filterFilms([{id:1,type:'movie',title:'Arabic subtitles only'},{id:2,type:'movie',title:'Arabic audio',audioLanguage:'ar'}],{type:'arabic'}).length,1);
assert.equal(search.normalizeTitle('إِسْمُك'),'اسمك');assert.equal(search.normalizeTitle('أفلام عربية'),'افلام عربيه');
const local=[{id:1,type:'movie',title:'Interstellar',arabicTitle:'بين النجوم'},{id:2,type:'movie',title:'Interstellar Stories'}];assert.equal(search.mergeFilms(local,'Interstellar')[0].id,1);assert.ok(search.matchScore(local[0],'Interstllar')>0);assert.ok(search.matchScore(local[0],'بين النُّجوم')>0);
assert.equal(search.mergeFilms([{...local[0],imdb:'tt0816692'},{id:'tt0816692',identity:'imdb',type:'movie',title:'Interstellar',imdb:'tt0816692'}]).length,1);
for(const [w,h,compact] of [[292,330,true],[362,530,true],[696,680,false],[1136,370,false],[1660,700,false]]){const p=search.pageCapacity(w,h,compact);assert.ok(p.size>=1);assert.equal(p.size,p.columns*p.rows);if(compact)assert.ok(p.size*88<=h);else if(p.size>1){const width=(w-16*(p.columns-1))/p.columns;assert.ok(p.rows*(width*1.5+64)+(p.rows-1)*16<=h+1);}}
assert.equal(service.validProviderId('archive','../../etc/passwd'),false);assert.equal(service.validProviderId('nasa','https://127.0.0.1/secret'),false);assert.equal(service.validProviderId('nasa','..'),false);assert.equal(service.validProviderId('archive','his_girl_friday'),true);
assert.equal(service.validArchiveLicense('http://creativecommons.org/licenses/publicdomain/'),true);assert.equal(service.validArchiveLicense('https://creativecommons.org/licenses/by/4.0/'),true);assert.equal(service.validArchiveLicense('https://creativecommons.org.evil.test/licenses/by/4.0/'),false);
assert.equal(service.archiveFilm({identifier:'test',title:'Trailer',licenseurl:'http://creativecommons.org/licenses/publicdomain/'}),null);assert.equal(service.archiveFilm({identifier:'test',title:'Film',access_restricted:true,licenseurl:'http://creativecommons.org/licenses/publicdomain/'}),null);
const originalFetch=globalThis.fetch;
try{
 const requested=[];
 globalThis.fetch=async url=>{requested.push(String(url));return new Response('',{status:503});};
 const partial=await service.catalogResults('',{});assert.ok(partial.results.some(x=>x.identity==='youtube'));assert.equal(partial.providerStatus.YouTube,'ok');assert.ok(partial.degraded);assert.ok(requested.every(u=>u.startsWith('https://')));
 globalThis.fetch=async url=>String(url).includes('/metadata/')?Response.json({is_dark:true,metadata:{}}):new Response('',{status:503});await assert.rejects(()=>service.resolveMedia('archive','restricted-fixture'));
 const good='1\n00:00:01,000 --> 00:00:04,000\nاختبار ترجمة عربية';const calls=[];
 const result=await subs.loadSubtitles({imdb:'tt0903747',type:'tv',season:2,episode:3,language:'ar',track:0},async url=>{calls.push(url);return url.includes('/subtitles/')?Response.json({subtitles:[{lang:'eng',url:'https://subs5.strem.io/en'},{lang:'ara',url:'https://subs5.strem.io/ar',subtitleFileName:'Arabic full'},{lang:'ara',foreign_parts_only:true,url:'https://subs5.strem.io/partial'}]}):new Response(good);});
 assert.equal(result.source,'OpenSubtitles via Stremio');assert.equal(result.available,true);assert.equal(result.tracks.length,1);assert.ok(calls[0].includes('/series/tt0903747:2:3.json'));assert.ok(!calls.some(x=>x.endsWith('/en')));
 const fallback=await subs.loadSubtitles({id:372058,imdb:'tt5311514',type:'movie',season:1,episode:1,language:'ar',track:0},async url=>url.includes('opensubtitles-v3')?new Response('',{status:503}):url.includes('/api/subtitles')?Response.json({subtitles:[{lang:'ar',url:'https://subs5.strem.io/ar'}]}):new Response(good));assert.equal(fallback.available,true);assert.equal(fallback.source,'FrameXTV subtitle catalog');
}finally{globalThis.fetch=originalFetch;}
const responseModule=await import(source('api-response'));const response=responseModule.apiJson({results:[]},{headers:{'Cache-Control':'public, max-age=300'}});assert.equal(response.headers.get('Netlify-Vary'),'query');assert.equal(response.headers.get('Cache-Control'),'public, max-age=300');assert.equal(responseModule.apiJson({error:'unavailable'},{status:503}).headers.get('Cache-Control'),'no-store');
console.log('Bilingual ranking, identity compatibility, fitted pagination, provider isolation, media guards and official Arabic subtitle matching passed.');
