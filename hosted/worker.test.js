import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from './worker.js';
import { localDatabase } from './local-db.js';

const password='TestOnlyPassword1!';
const genres=['Fiction','Fantasy','History','Mystery','Science'];
function client(DB) {
 return async (path,method='GET',body,token) => {
  const response=await worker.fetch(new Request('https://bookclub.test/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DB});
  return {...await response.json(),status:response.status};
 };
}
test('hosted account, library, rating and session lifecycle against SQLite', async t=>{
 const DB=localDatabase();t.after(()=>DB.close());const api=client(DB);
 let token,otherToken,book;
 await t.test('migrations initialize a healthy database and protect private routes',async()=>{
  assert.equal((await api('/health')).status,200);
  assert.equal((await api('/users/get/myLibrary/readerone')).status,401);
  assert.equal((await api('/users/create','POST',{username:'bad'})).status,400);
 });
 await t.test('registration validates and never exposes password hashes',async()=>{
  const result=await api('/users/create','POST',{username:'readerone',email:'readerone@example.test',password,preferences:genres});
  assert.equal(result.status,201);assert.equal(result.data.password,undefined);
  assert.equal((await api('/users/create','POST',{username:'readerone',email:'readerone@example.test',password})).status,409);
  assert.equal((await api('/users/login','POST',{username:'readerone',password:'wrong'})).status,401);
  token=(await api('/users/login','POST',{username:'readerone',password})).sessionID;
  otherToken=(await api('/users/login','POST',{username:'readerone',password})).sessionID;
  assert.ok(token);assert.notEqual(token,otherToken);
 });
 await t.test('account isolation and preference validation',async()=>{
  assert.equal((await api('/users/get/someoneelse','GET',undefined,token)).status,403);
  assert.equal((await api('/users/get/readerone','GET',undefined,token)).user.password,undefined);
  assert.equal((await api('/users/set/preferences/readerone','POST',{preferences:['Fiction']},token)).status,400);
  assert.deepEqual((await api('/users/set/preferences/readerone','POST',{preferences:genres},token)).data,genres);
 });
 await t.test('accept is idempotent; library and reading lists are persistent',async()=>{
  const details={title:'Lifecycle Book',author:'Test author',description:'Test',genre:['Fiction']};
  book=(await api('/books/accept','POST',details,token)).book;
  await api('/books/accept','POST',{...details,description:'Updated summary',thumbnail:'https://covers.openlibrary.org/b/id/123-M.jpg'},token);
  const saved=(await api('/users/get/myLibrary/readerone','GET',undefined,token)).myLibrary[0];
  assert.equal(saved.description,'Updated summary');assert.match(saved.thumbnail,/covers.openlibrary.org/);
  assert.equal((await api('/users/get/myLibrary/readerone','GET',undefined,token)).myLibrary.length,1);
  assert.equal((await api('/users/get/myUnReadBook/readerone','GET',undefined,token)).myList.length,1);
  assert.equal((await api('/users/set/myReadBook/readerone','POST',{bookId:'missing'},token)).status,404);
 });
 await t.test('ratings require read ownership, validate, and update without double counting',async()=>{
  const path='/books/set/rating/Lifecycle%20Book';
  assert.equal((await api(path,'POST',{newRating:5},token)).status,403);
  await api('/users/set/myReadBook/readerone','POST',{bookId:book._id},token);
  assert.equal((await api(path,'POST',{newRating:6},token)).status,400);
  assert.equal((await api(path,'POST',{newRating:4},token)).status,200);
  await api(path,'POST',{newRating:2},token);
  const stats=await api('/books/get/db/Lifecycle%20Book');assert.equal(stats.book.rating,2);assert.equal(stats.book.ratingCount,1);
  await api('/users/set/myUnReadBook/readerone','POST',{bookId:book._id},token);
  assert.equal((await api('/users/get/myReadBook/readerone','GET',undefined,token)).myList.length,0);
 });
 await t.test('rejection and undo update persistent exclusion records',async()=>{
  await api('/books/reject','POST',{title:'Rejected Book'},token);
  assert.ok(await DB.prepare('SELECT title FROM rejections WHERE title=?').bind('Rejected Book').first());
  await api('/books/reject/undo','POST',{title:'Rejected Book'},token);
  assert.equal(await DB.prepare('SELECT title FROM rejections WHERE title=?').bind('Rejected Book').first(),null);
 });
 await t.test('password changes invalidate other sessions and logout revokes current token',async()=>{
  assert.equal((await api('/users/update','PUT',{oldPassword:'wrong',newPassword:password,newPassword2:password},token)).status,400);
  assert.equal((await api('/users/update','PUT',{oldPassword:password,newPassword:password+'2',newPassword2:password+'2'},token)).status,200);
  assert.equal((await api('/users/get/readerone','GET',undefined,otherToken)).status,401);
  assert.equal((await api('/users/login','POST',{username:'readerone',password})).status,401);
  await api('/users/logout','POST',{},token);
  assert.equal((await api('/users/get/readerone','GET',undefined,token)).status,401);
  token=(await api('/users/login','POST',{username:'readerone',password:password+'2'})).sessionID;
 });
 await t.test('removal and account deletion clean dependent rows',async()=>{
  await api('/users/set/myLibrary/readerone','POST',{removedBook:{_id:book._id}},token);
  assert.equal((await api('/users/get/myLibrary/readerone','GET',undefined,token)).myLibrary.length,0);
  assert.equal((await api('/users/delete','DELETE',{password:'wrong'},token)).status,400);
  assert.equal((await api('/users/delete','DELETE',{password:password+'2'},token)).status,200);
  assert.equal((await api('/users/get/readerone','GET',undefined,token)).status,401);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM ratings').first()).n,0);
 });
});
test('file-backed development database survives closing and reopening',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'bookclub-test-'));const path=join(folder,'db.sqlite');
 try {let db=localDatabase(path);await db.prepare('INSERT INTO users(id,username,email,password) VALUES(?,?,?,?)').bind('persist','persistuser','persist@example.test','test-hash').run();db.close();db=localDatabase(path);assert.equal((await db.prepare('SELECT username FROM users').first()).username,'persistuser');db.close();}finally{rmSync(folder,{recursive:true});}
});
test('upstream outage uses an explicit usable classics fallback',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('',{status:429}));
 const db=localDatabase();t.after(()=>db.close());const response=await client(db)('/books/get/by/genre/Fiction');
 assert.equal(response.status,200);assert.equal(response.source,'classics');assert.ok(response.data.book.title);
});
test('SPA deep links work and missing assets stay 404',async()=>{
 const env={ASSETS:{fetch:async request=>new URL(request.url).pathname==='/index.html'?new Response('<html>BookClub</html>'):new Response('Not found',{status:404})}};
 assert.equal((await worker.fetch(new Request('https://bookclub.test/myLibrary'),env)).status,200);
 assert.equal((await worker.fetch(new Request('https://bookclub.test/missing.png'),env)).status,404);
});
