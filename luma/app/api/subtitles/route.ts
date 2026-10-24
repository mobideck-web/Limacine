import {apiJson} from '@/lib/api-response';
import {loadSubtitles} from '@/lib/subtitle-source';
export async function GET(request:Request){
  const q=new URL(request.url).searchParams,type=q.get('type'),id=q.has('id')?Number(q.get('id')):undefined,imdb=q.get('imdb')||undefined,season=Number(q.get('season')||1),episode=Number(q.get('episode')||1),language=q.get('language')||'ar',track=Number(q.get('track')||0);
  if(!['movie','tv'].includes(type||'')||(!id&&!imdb)||(id!==undefined&&(!Number.isSafeInteger(id)||id<1||id>999999999))||(imdb!==undefined&&!/^tt\d{5,12}$/.test(imdb))||!Number.isSafeInteger(season)||season<1||season>100||!Number.isSafeInteger(episode)||episode<1||episode>1000||!['ar','en'].includes(language)||!Number.isSafeInteger(track)||track<0||track>199)return apiJson({error:'Invalid subtitle request.'},{status:400});
  const result=await loadSubtitles({id,imdb,type:type as 'movie'|'tv',season,episode,language:language as 'ar'|'en',track,refresh:q.get('refresh')==='1'});
  return apiJson(result,{headers:{'Cache-Control':result.available?'public, max-age=300':'no-store'}});
}
