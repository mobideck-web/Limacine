import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const types=data(stripTypeScriptTypes(fs.readFileSync(new URL('../lib/types.ts',import.meta.url),'utf8')));
async function load(name){const code=stripTypeScriptTypes(fs.readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8'));return import(data(code.replaceAll("'./types'",JSON.stringify(types))));}
const {discoverFilms}=await load('discovery');
const {players,playerUrl}=await load('players');
const films=[{id:1,type:'movie',title:'Viewed',genre:'Drama',year:1970},{id:2,type:'movie',title:'Related classic',genre:'Drama',year:1974},{id:3,type:'movie',title:'Different genre',genre:'Action',year:2024},{id:4,type:'tv',title:'Related series',genre:'Drama',year:1975}];
const history=[{film:films[0],opened:Date.now()}];
assert.equal(discoverFilms(films,history,0)[0].id,2,'Prefer an unwatched film matching the viewer’s genre and era');
assert.equal(discoverFilms(films,history,0).at(-1).id,1,'Previously opened titles follow new suggestions');
assert.notEqual(discoverFilms(films,[],0)[0].id,discoverFilms(films,[],1)[0].id,'New viewers get a daily rotating pick');
assert.equal(discoverFilms(films,[{film:films[2],opened:Date.now()}],0).at(-1).id,3,'Changing history changes the recommendation order');
assert.equal(new Set(discoverFilms(films,history,0).map(f=>f.id)).size,films.length,'Recommendations retain each catalog item once');
for(const player of players){
  const movie=new URL(playerUrl(player.id,films[0]));
  const episode=new URL(playerUrl(player.id,{...films[0],type:'tv'},2,7));
  assert.equal(movie.origin,player.origin);
  assert.equal(episode.origin,player.origin);
  if(player.id==='autoembed'){assert.match(episode.pathname,/\/1-2-7$/);}else if(player.id==='cinesrc'){assert.equal(episode.searchParams.get('s'),'2');assert.equal(episode.searchParams.get('e'),'7');}else if(player.id==='primesrc'){assert.equal(episode.searchParams.get('tmdb'),'1');assert.equal(episode.searchParams.get('season'),'2');assert.equal(episode.searchParams.get('episode'),'7');}else assert.match(episode.pathname,/\/1\/2\/7$/,'Series source keeps the selected season and episode');
  assert.ok(!movie.pathname.includes('/tv/'));
}
console.log('Discovery ranking, daily rotation, history exclusion and all movie/episode source URLs passed.');
