import { fallback, catalog } from './catalog.js';
const cache = new Map(), pending = new Map();
const headers = { 'User-Agent': 'BookClub/1.0 (https://github.com/TianyuZhao6/BookClub)' };
async function cached(key, operation) {
 const old=cache.get(key); if(old?.until>Date.now())return old.value;
 if(pending.has(key))return pending.get(key);
 const result=operation().then(value=>{
  if(cache.size>=100)cache.delete(cache.keys().next().value);
  cache.set(key,{value,until:Date.now()+(value.source==='classics'?30000:300000)});return value;
 }).finally(()=>pending.delete(key));
 pending.set(key,result);return result;
}
export function searchBooks(genre,env={},options={}) {
 const page=Math.max(1,Math.min(100,parseInt(options.page,10)||1));
 const search=String(options.search||'').trim().slice(0,200);
 const topic=String(genre||'').trim().slice(0,80);
 return cached(JSON.stringify([topic,search,page,!!env.GOOGLE_API_KEY]),async()=>{
  const subject=!search;
  const url=subject?new URL('https://openlibrary.org/subjects/'+encodeURIComponent((topic&&topic!=='All'?topic:'fiction').toLowerCase().replace(/ /g,'_'))+'.json'):new URL('https://openlibrary.org/search.json');
  url.searchParams.set('limit','12');
  if(subject){if(page>1)url.searchParams.set('offset',String((page-1)*12));}
  else {
   url.searchParams.set('q',search);url.searchParams.set('page',String(page));
   if(topic&&topic!=='All')url.searchParams.set('subject',topic.toLowerCase());
   url.searchParams.set('fields','key,title,author_name,cover_i,first_publish_year');
  }
  try {
   const response=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error('Catalog unavailable');
   const data=await response.json(),rows=subject?data.works:data.docs;
   if(!Array.isArray(rows))throw new Error('Invalid catalog response');
   const books=rows.filter(b=>b.title&&/^\/works\/OL\d+W$/.test(b.key)).map(b=>{
    const curated=catalog.find(c=>c.id===b.key),cover=b.cover_i||b.cover_id;
    return {id:b.key,title:curated?.title||b.title,authors:subject?(b.authors||[]).map(a=>a.name):b.author_name||[],categories:curated?.categories||(topic&&topic!=='All'?[topic]:[]),description:curated?.description||'',thumbnail:curated?.thumbnail||(cover?'https://covers.openlibrary.org/b/id/'+cover+'-M.jpg?default=false':''),sourceUrl:'https://openlibrary.org'+b.key,year:b.first_publish_year||null};
   });
   const total=(subject?data.work_count:data.numFound)||0;
   return {books,source:'openlibrary',page,hasMore:page*12<total,total};
  } catch {
   if(env.GOOGLE_API_KEY)try {
    const google=new URL('https://www.googleapis.com/books/v1/volumes');
    google.searchParams.set('q',[search,topic&&topic!=='All'?'subject:'+topic:''].filter(Boolean).join(' ')||'books');
    google.searchParams.set('key',env.GOOGLE_API_KEY);google.searchParams.set('maxResults','12');google.searchParams.set('startIndex',String((page-1)*12));
    const response=await fetch(google,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Search unavailable');
    const data=await response.json();
    const books=(data.items||[]).map(({id,volumeInfo:v={}})=>({id,title:v.title,authors:v.authors||[],categories:v.categories||[],description:v.description||'',thumbnail:(v.imageLinks?.thumbnail||'').replace(/^http:/,'https:')})).filter(b=>b.title);
    return {books,source:'google',page,hasMore:page*12<(data.totalItems||0),total:data.totalItems||0};
   }catch{/* Curated metadata remains available without provider access. */}
   const all=fallback(topic).filter(b=>!search||(b.title+' '+b.authors.join(' ')).toLowerCase().includes(search.toLowerCase()));
   return {books:all.slice((page-1)*12,page*12),source:'classics',page,hasMore:page*12<all.length,total:all.length};
  }
 });
}
export function getBookDetails(work) {
 if(!/^OL\d+W$/.test(work))throw Object.assign(new Error('Invalid Open Library work identifier'),{status:400});
 return cached('work:'+work,async()=>{
  const response=await fetch('https://openlibrary.org/works/'+work+'.json',{headers,signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Object.assign(new Error('The summary could not be loaded. Please try again.'),{status:502});
  const book=await response.json();
  return {description:typeof book.description==='string'?book.description:book.description?.value||'',source:'openlibrary',sourceUrl:'https://openlibrary.org/works/'+work};
 });
}
