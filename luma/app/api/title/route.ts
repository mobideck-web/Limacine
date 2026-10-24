import {apiJson} from '@/lib/api-response';
import {resolveTitle} from '@/lib/catalog-service';
export async function GET(request:Request){const q=new URL(request.url).searchParams,id=q.get('imdb')||'',type=q.get('type');if(!/^tt\d{5,12}$/.test(id)||!['movie','tv'].includes(type||''))return apiJson({error:'Invalid title identifier'},{status:400});try{return apiJson({film:await resolveTitle({id,identity:'imdb',imdb:id,type:type as 'movie'|'tv',title:id})});}catch{return apiJson({error:'Title details unavailable'},{status:503});}}
