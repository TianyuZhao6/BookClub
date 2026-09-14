import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchBooks, getBookDetails } from './search.js';
test('catalog normalizes real metadata and pages the upstream subject', async t => {
 let requested;
 t.mock.method(globalThis,'fetch',async url=>{requested=new URL(url);return Response.json({work_count:40,works:[{key:'/works/OL123W',title:'Remote Book',authors:[{name:'Author'}],cover_id:123}]});});
 const result=await searchBooks('Mystery',{}, {page:2});
 assert.equal(requested.searchParams.get('offset'),'12');
 assert.equal(result.source,'openlibrary');assert.equal(result.hasMore,true);
 assert.equal(result.books[0].authors[0],'Author');
 assert.match(result.books[0].thumbnail,/covers.openlibrary.org/);
});
test('text search uses query, preserves empty results, and deduplicates requests',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async url=>{calls++;assert.equal(new URL(url).searchParams.get('q'),'unmatched title');return Response.json({numFound:0,docs:[]});});
 const [first,second]=await Promise.all([searchBooks('All',{}, {search:'unmatched title'}),searchBooks('All',{}, {search:'unmatched title'})]);
 assert.equal(calls,1);assert.deepEqual(first.books,[]);assert.deepEqual(first,second);assert.equal(first.hasMore,false);
});
test('provider outages offer paginated classics without faking search matches',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('',{status:503}));
 const first=await searchBooks('All');
 const second=await searchBooks('All',{}, {page:2});
 assert.equal(first.source,'classics');assert.equal(first.books.length,12);assert.equal(first.hasMore,true);
 assert.ok(second.books.length);assert.equal(second.hasMore,false);
 assert.equal(first.books.some(b=>second.books.some(other=>other.id===b.id)),false);
 assert.deepEqual((await searchBooks('All',{}, {search:'no-such-book-987654'})).books,[]);
});
test('work details validate identifiers and normalize summary objects',async t=>{
 assert.throws(()=>getBookDetails('../invalid'),{status:400});
 t.mock.method(globalThis,'fetch',async()=>Response.json({description:{value:'An upstream summary.'}}));
 assert.equal((await getBookDetails('OL98765W')).description,'An upstream summary.');
});
