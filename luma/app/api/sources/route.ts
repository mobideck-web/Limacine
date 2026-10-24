import {apiJson} from '@/lib/api-response';
import {players,playerUrl,automaticPlayers,verifiedPlayers,sourceReason} from '@/lib/players';
import type {Film} from '@/lib/types';
export async function GET(request:Request){
 const q=new URL(request.url).searchParams,id=q.get('id'),imdb=q.get('imdb'),type=q.get('type')||'movie',season=Number(q.get('season')||1),episode=Number(q.get('episode')||1);
 if(!['movie','tv'].includes(type)||(!id&&!imdb)||(id!==null&&!/^[1-9]\d{0,9}$/.test(id))||(imdb!==null&&!/^tt\d{5,12}$/.test(imdb))||!Number.isInteger(season)||season<0||season>100||!Number.isInteger(episode)||episode<1||episode>1000)return apiJson({error:'Invalid title identity',sources:[]},{status:400});
 const film:Film={id:id?Number(id):imdb!,identity:id?'tmdb':'imdb',imdb:imdb||undefined,type:type as Film['type'],title:''};
 return apiJson({sources:players.map(p=>({id:p.id,name:p.name,available:p.enabled&&!!playerUrl(p.id,film,season,episode),automatic:automaticPlayers.has(p.id),verified:verifiedPlayers.has(p.id),status:automaticPlayers.has(p.id)?'verified':p.enabled?'manual':'unavailable',reason:sourceReason(p.id),mode:'embed',progress:['framextv','vidly','vidsrc','vidlink','cinesrc'].includes(p.id),sandbox:p.sandbox}))},{headers:{'Cache-Control':'public, max-age=300'}});
}
