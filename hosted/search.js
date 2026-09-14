import { fallback } from './catalog.js';
const cache = new Map();
export async function searchBooks(genre, env) {
  const prior = cache.get(genre);
  if (prior && prior.until > Date.now()) return prior.value;
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', `subject:${genre}`); url.searchParams.set('maxResults','40'); url.searchParams.set('langRestrict','en');
  if(env.GOOGLE_API_KEY) url.searchParams.set('key',env.GOOGLE_API_KEY);
  let value;
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(5000)});
    if(!response.ok) throw new Error('Search unavailable');
    const json = await response.json();
    const books = (json.items || []).map(({id,volumeInfo:v={}})=>({id,title:v.title,authors:v.authors||[],categories:v.categories||[],description:v.description||'No description available.',thumbnail:(v.imageLinks?.thumbnail||'').replace(/^http:/,'https:')})).filter(b=>b.title);
    value = {books:books.length?books:fallback(genre),source:books.length?'google':'classics'};
  } catch { value = {books:fallback(genre),source:'classics'}; }
  if(cache.size>100) cache.clear();
  cache.set(genre,{until:Date.now()+300000,value});
  return value;
}
