import bcrypt from 'bcryptjs';
import { database } from './db.js';
import { searchBooks, getBookDetails } from './search.js';
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (message,status=400) => { throw Object.assign(new Error(message),{status}); };
const preferencesValid = v => Array.isArray(v) && v.length<=40 && v.every(x=>typeof x==='string' && x.trim().length>0 && x.length<=80);
const passwordValid = p => typeof p==='string' && p.length>=8 && new TextEncoder().encode(p).length<=72 && !/\s/.test(p) && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9\s]/.test(p);
const publicUser = u => ({_id:u.id,username:u.username,email:u.email,preferences:JSON.parse(u.preferences)});
const bookView = b => ({...b,_id:b.id,genre:JSON.parse(b.genre),rating:b.rating||0,ratingCount:b.ratingCount||0});
const bookQuery = 'SELECT b.*, COALESCE(AVG(r.value),0) AS rating, COUNT(r.user_id) AS ratingCount FROM books b LEFT JOIN ratings r ON r.book_id=b.id';
export async function handleApi(request,env) {
 const db=database(env.DB), url=new URL(request.url), path=url.pathname.replace(/^\/api/,'');
 const method=request.method;
 if(method==='OPTIONS') return new Response(null,{status:204});
 if(path==='/health') { await db.first('SELECT 1'); return json({status:'ok'}); }
 let body={};
 if(['POST','PUT','DELETE'].includes(method)) {
   if(Number(request.headers.get('content-length')||0)>100000) fail('Request too large',413);
   const raw=await request.text();if(raw.length>100000)fail('Request too large',413);
   try {body=raw?JSON.parse(raw):{};}catch{fail('Invalid JSON');}
   if(!body||Array.isArray(body)||typeof body!=='object')fail('Expected a JSON object');
 }
 if(path==='/users/create'&&method==='POST') {
   const {username,password,preferences=[]}=body, email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(typeof username!=='string'||!/^[A-Za-z0-9]{5,100}$/.test(username))fail('Username must contain 5–100 letters or numbers');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Email must be valid');
   if(!passwordValid(password))fail('Use at least 8 characters with uppercase, lowercase, a number, and a symbol; no spaces (maximum 72 bytes)');
   if(!preferencesValid(preferences))fail('Invalid preferences');
   const id=crypto.randomUUID();
   await db.run('INSERT INTO users (id,username,email,password,preferences) VALUES (?,?,?,?,?)',id,username,email,await bcrypt.hash(password,12),JSON.stringify([...new Set(preferences)]));
   return json({data:{_id:id,username,email,preferences},message:'Account successfully created',error:[]},201);
 }
 if(path==='/users/login'&&method==='POST') {
   if(typeof body.username!=='string'||typeof body.password!=='string')fail('Username and password are required');
   const user=await db.first('SELECT * FROM users WHERE username=?',body.username);
   if(!user||!await bcrypt.compare(body.password,user.password))fail('Incorrect username or password',401);
   const token=crypto.randomUUID()+crypto.randomUUID();
   await db.batch([['DELETE FROM sessions WHERE expires < ?',Date.now()],['INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)',token,user.id,Date.now()+86400000]]);
   return json({data:publicUser(user),message:'Login Successful',sessionID:token,error:null});
 }
 if(path.startsWith('/books/get/db/')&&method==='GET') {
   const title=decodeURIComponent(path.slice('/books/get/db/'.length));
   const book=await db.first(bookQuery+' WHERE b.title=? GROUP BY b.id',title);
   return book?json({book:bookView(book),error:null}):json({book:null,error:null});
 }
 if(path.startsWith('/books/get/by/genre/')&&method==='GET') {
   const result=await searchBooks(decodeURIComponent(path.slice('/books/get/by/genre/'.length)),env,Object.fromEntries(url.searchParams));
   if(url.searchParams.get('catalog')==='1')return json({...result,books:undefined,data:{book:result.books},error:null});
   return json({data:{book:result.books[Math.floor(Math.random()*result.books.length)]||null},source:result.source,error:null});
 }
 if(path.startsWith('/books/get/')&&method==='GET'&&url.searchParams.has('work'))return json(await getBookDetails(url.searchParams.get('work')));
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 const user=await db.first('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?',token,Date.now());
 if(!user)fail('user is not logged in',401);
 const userRoute=path.match(/^\/users\/(get|set)\/(myLibrary|myReadBook|myUnReadBook|preferences)\/(.+)$/);
 const ownRoute=path.match(/^\/users\/get\/([^/]+)$/);
 const name=userRoute?.[3]||ownRoute?.[1];
 if(name&&decodeURIComponent(name)!==user.username)fail('You can only access your own account',403);
 const list=async (filter='')=>(await db.all('SELECT b.* FROM books b JOIN library l ON b.id=l.book_id WHERE l.user_id=? '+filter+' ORDER BY b.title',user.id)).map(bookView);
 if(path==='/users/get'&&method==='GET')return json({allUsers:[publicUser(user)]});
 if(ownRoute&&method==='GET')return json({user:publicUser(user)});
 if(path==='/users/logout'&&method==='POST'){await db.run('DELETE FROM sessions WHERE token=?',token);return json({message:'logout successful'});}
 if(path==='/users/update'&&method==='PUT'){
   if(typeof body.oldPassword!=='string'||!await bcrypt.compare(body.oldPassword,user.password))fail('Password does not match');
   if(!passwordValid(body.newPassword)||body.newPassword!==body.newPassword2)fail('New passwords must match and meet the password requirements');
   await db.batch([['UPDATE users SET password=? WHERE id=?',await bcrypt.hash(body.newPassword,12),user.id],['DELETE FROM sessions WHERE user_id=? AND token<>?',user.id,token]]);
   return json({error:[],message:'Password updated'});
 }
 if(path==='/users/delete'&&method==='DELETE'){
   if(typeof body.password!=='string'||!await bcrypt.compare(body.password,user.password))fail('Password does not match');
   await db.run('DELETE FROM users WHERE id=?',user.id);return json({data:'Account deleted successfully',error:''});
 }
 if(userRoute){
   const item=userRoute[2];
   if(method==='GET'){
     if(item==='preferences')return json({data:JSON.parse(user.preferences),error:null});
     if(item==='myLibrary')return json({myLibrary:await list(),error:null});
     return json({myList:await list(item==='myReadBook'?'AND l.is_read=1':'AND l.is_read=0'),error:null});
   }
   if(method==='POST'){
     if(item==='preferences'){
       if(!preferencesValid(body.preferences)||new Set(body.preferences.map(s=>s.trim())).size<5)fail('Select at least 5 different genres');
       const prefs=[...new Set(body.preferences.map(s=>s.trim()))];await db.run('UPDATE users SET preferences=? WHERE id=?',JSON.stringify(prefs),user.id);return json({data:prefs,error:null});
     }
     if(item==='myLibrary'){
       if(typeof body.removedBook?._id!=='string')fail('A valid book ID is required');
       await db.run('DELETE FROM library WHERE user_id=? AND book_id=?',user.id,body.removedBook._id);return json({myLibrary:await list(),error:null});
     }
     const book=typeof body.bookId==='string'?await db.first('SELECT * FROM books WHERE id=?',body.bookId):typeof body.title==='string'?await db.first('SELECT * FROM books WHERE title=?',body.title):null;
     if(!book||!await db.first('SELECT * FROM library WHERE user_id=? AND book_id=?',user.id,book.id))fail('Book is not in your library',404);
     const read=item==='myReadBook';await db.run('UPDATE library SET is_read=? WHERE user_id=? AND book_id=?',read?1:0,user.id,book.id);
     return json({book:bookView(book),message:read?'book was added to the read list':'book was marked unread'});
   }
 }
 if(path==='/books/get'&&method==='GET'){
   const prefs=JSON.parse(user.preferences),genre=url.searchParams.get('genre')||(prefs.length?prefs[(Math.max(1,parseInt(url.searchParams.get('page'),10)||1)-1)%prefs.length]:'Fiction');
   const result=await searchBooks(genre,env,Object.fromEntries(url.searchParams));
   const excluded=new Set((await db.all('SELECT title FROM rejections WHERE user_id=? UNION SELECT b.title FROM books b JOIN library l ON l.book_id=b.id WHERE l.user_id=?',user.id,user.id)).map(x=>x.title));
   const books=result.books.filter(b=>!excluded.has(b.title));
   return json({...result,books:undefined,data:{book:books},source:result.source,message:books.length?'':'No new books in this genre. Try again or change your preferences.',error:null});
 }
 if(path==='/books/accept'&&method==='POST'){
   const {title,author='',description='',thumbnail='',genre=[]}=body;
   if(typeof title!=='string'||!title.trim()||title.length>1000||![author,description,thumbnail].every(v=>typeof v==='string')||!preferencesValid(genre))fail('Valid book details are required');
   await db.run("INSERT INTO books (id,title,author,description,thumbnail,genre) VALUES (?,?,?,?,?,?) ON CONFLICT(title) DO UPDATE SET thumbnail=COALESCE(NULLIF(excluded.thumbnail,''),books.thumbnail), description=COALESCE(NULLIF(excluded.description,''),books.description)",crypto.randomUUID(),title,author,description,thumbnail,JSON.stringify(genre));
   const book=await db.first('SELECT * FROM books WHERE title=?',title);
   await db.batch([['INSERT INTO library (user_id,book_id,is_read) VALUES (?,?,0) ON CONFLICT DO NOTHING',user.id,book.id],['DELETE FROM rejections WHERE user_id=? AND title=?',user.id,title]]);
   return json({book:bookView(book),message:'book was added to the library'});
 }
 if(['/books/reject','/books/reject/undo'].includes(path)&&method==='POST'){
   if(typeof body.title!=='string'||!body.title.trim())fail('Book title is required');
   const undo=path.endsWith('/undo');await db.run(undo?'DELETE FROM rejections WHERE user_id=? AND title=?':'INSERT INTO rejections (user_id,title) VALUES (?,?) ON CONFLICT DO NOTHING',user.id,body.title);return json({message:undo?'Rejection undone':'book rejected'});
 }
 if(path.startsWith('/books/set/rating/')&&method==='POST'){
   if(!Number.isInteger(body.newRating)||body.newRating<1||body.newRating>5)fail('Rating must be a whole number from 1 to 5');
   const book=await db.first('SELECT b.* FROM books b JOIN library l ON l.book_id=b.id WHERE b.title=? AND l.user_id=? AND l.is_read=1',decodeURIComponent(path.slice('/books/set/rating/'.length)),user.id);
   if(!book)fail('Mark a book in your library as read before rating it',403);
   await db.run('INSERT INTO ratings (user_id,book_id,value) VALUES (?,?,?) ON CONFLICT(user_id,book_id) DO UPDATE SET value=excluded.value',user.id,book.id,body.newRating);return json({message:'Thank you for your rating!'});
 }
 return json({error:'Route not found'},404);
}
export default {
 async fetch(request,env){
   const path=new URL(request.url).pathname;
   if(!path.startsWith('/api/')) {
     const response=await env.ASSETS.fetch(request);
     if(response.status===404 && !path.split('/').pop().includes('.'))return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));
     return response;
   }
   try{return await handleApi(request,env);}catch(error){
     const duplicate=String(error.message).includes('UNIQUE constraint');
     const status=error.status||(duplicate?409:500);
     if(status===500)console.error('BookClub API:',error.message);
     return json({error:duplicate?'Username or email already exists':status===500?'BookClub is temporarily unavailable. Please try again.':error.message},status);
   }
 }
};
