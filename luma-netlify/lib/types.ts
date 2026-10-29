export type Film={id:number;type:'movie'|'tv';title:string;arabicTitle?:string;year?:number;genre?:string;runtime?:string;overview?:string;imdb?:string;poster?:string|null;source?:string;creditUrl?:string};
export function filmKey(film:Film){return `${film.type}-${film.id}`;}
