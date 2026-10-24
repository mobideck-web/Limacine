export type Identity='tmdb'|'imdb'|'archive'|'nasa'|'youtube';
export type PublisherMetadata={publisherUrl?:string;durationSeconds?:number;verifiedAt?:string;publishedAt?:string};
export type Film=PublisherMetadata&{id:number|string;identity?:Identity;type:'movie'|'tv';title:string;arabicTitle?:string;year?:number;genre?:string;genres?:string[];runtime?:string;overview?:string;imdb?:string;tmdbId?:number;poster?:string|null;source?:string;creditUrl?:string;license?:string;free?:boolean;audioLanguage?:string;anime?:boolean;channel?:string;topic?:string;category?:'film'|'documentary'|'short'};
export function filmKey(film:Film){return film.identity==='archive'||film.identity==='nasa'||film.identity==='youtube'?`${film.identity}:${film.id}`:`${film.type}-${film.id}`;}
export function isDirect(film:Film){return film.identity==='archive'||film.identity==='nasa';}
export function tmdbId(film:Film){const id=film.tmdbId??(film.identity!=='imdb'&&film.identity!=='youtube'&&!isDirect(film)?Number(film.id):NaN);return Number.isSafeInteger(id)&&id>0?id:undefined;}
