import type {Film} from './types';
import youtubeLibrary from './youtube-library.json';

// Editorial identities, not guessed stream URLs. Metadata is enriched through Cinemeta.
export const specialtyTitles:Film[]=[
 {id:372058,title:'Your Name.',arabicTitle:'اسمك',imdb:'tt5311514',anime:true},
 {id:129,title:'Spirited Away',arabicTitle:'المخطوفة',imdb:'tt0245429',anime:true},
 {id:128,title:'Princess Mononoke',imdb:'tt0119698',anime:true},
 {id:4935,title:"Howl's Moving Castle",imdb:'tt0347149',anime:true},
 {id:12477,title:'Grave of the Fireflies',imdb:'tt0095327',anime:true},
 {id:378064,title:'A Silent Voice',imdb:'tt5323662',anime:true},
 {id:85937,title:'Demon Slayer: Kimetsu no Yaiba',imdb:'tt9335498',anime:true,type:'tv'},
 {id:1429,title:'Attack on Titan',imdb:'tt2560140',anime:true,type:'tv'},
 {id:46260,title:'Naruto',imdb:'tt0409591',anime:true,type:'tv'},
 {id:37854,title:'One Piece',imdb:'tt0388629',anime:true,type:'tv'},
 {id:30984,title:'Bleach',imdb:'tt0434665',anime:true,type:'tv'},
 {id:13916,title:'Death Note',imdb:'tt0877057',anime:true,type:'tv'},
 {id:517814,title:'Capernaum',arabicTitle:'كفرناحوم',imdb:'tt8267604',audioLanguage:'ar'},
 {id:309182,title:'Theeb',arabicTitle:'ذيب',imdb:'tt3170902',audioLanguage:'ar'},
 {id:129670,title:'Wadjda',arabicTitle:'وجدة',imdb:'tt2258858',audioLanguage:'ar'},
 {id:676898,title:'The Blue Caftan',arabicTitle:'القفطان الأزرق',imdb:'tt17679584',audioLanguage:'ar'},
 {id:239678,title:'The Square',arabicTitle:'الميدان',imdb:'tt2486682',audioLanguage:'ar',category:'documentary'},
 {id:391714,title:'Clash',arabicTitle:'اشتباك',imdb:'tt5599692',audioLanguage:'ar'},
 {id:481879,title:'Yomeddine',arabicTitle:'يوم الدين',imdb:'tt6846432',audioLanguage:'ar'},
].map(f=>({...f,type:f.type||'movie',identity:'imdb',id:f.imdb,genres:f.anime?['Animation']:f.category==='documentary'?['Documentary']:['Drama'],genre:f.anime?'Animation':f.category==='documentary'?'Documentary':'Drama',source:'Cinemeta'} as Film));

export const youtubeTitles:Film[]=youtubeLibrary.map(f=>({...f,identity:'youtube',type:'movie',source:'YouTube',free:true,poster:`https://i.ytimg.com/vi/${f.id}/hqdefault.jpg`} as Film));
