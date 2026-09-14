import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getBookByGenre, getRecommendations, getBookDetails, getBookByNameInDatabase, acceptBook, rejectBook, undoRejectBook } from '../../api/bookAPI';
import { getMyLibraryByUsername } from '../../api/userAPI';
import { errorText } from '../../api/request';
import UserContext from '../../user/UserContext';
import BookDescription from '../../components/BookDescription/BookDescription';
import BookWall from '../../components/BookWall/BookWall';
import Modal from '../../components/modal/Modal';
import LoginModal from '../LoginModal/LoginModal';
import './HomePage.css';
const genres=['All','Fiction','Fantasy','Science fiction','Mystery','Romance','History','Biography','Adventure','Poetry','Science','Philosophy'];
const coverError=event=>{event.currentTarget.onerror=null;event.currentTarget.src='/book-placeholder.svg';};
export default function HomePage(){
 const {username}=useContext(UserContext);
 const [books,setBooks]=useState([]),[selected,setSelected]=useState(null),[saved,setSaved]=useState(new Set());
 const [filters,setFilters]=useState({genre:'',search:'',page:1}),[search,setSearch]=useState('');
 const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [source,setSource]=useState(''),[hasMore,setHasMore]=useState(false),[rejected,setRejected]=useState([]),[showLogin,setShowLogin]=useState(false);
 const [detail,setDetail]=useState({}),[retry,setRetry]=useState(0);
 const sequence=useRef(0);
 const load=useCallback(async()=>{
  const id=++sequence.current;setBusy(true);setError('');setSelected(null);
  const options={page:filters.page,search:filters.search};
  if(filters.genre||filters.search)options.genre=filters.genre||'All';
  const response=username?await getRecommendations(options):await getBookByGenre(options.genre||'Fiction',options);
  if(id!==sequence.current)return;
  if(response.error){setError(errorText(response.error));setBooks([]);setHasMore(false);}
  else{const list=response.data.book;setBooks(Array.isArray(list)?list:list?[list]:[]);setSource(response.source||'');setHasMore(!!response.hasMore);}
  setBusy(false);
 },[username,filters]);
 useEffect(()=>{load();return()=>{sequence.current++;};},[load]);
 useEffect(()=>{
  let active=true;setSaved(new Set());setRejected([]);setMessage('');
  if(username)getMyLibraryByUsername(username).then(response=>{if(active&&response.myLibrary)setSaved(new Set(response.myLibrary.map(b=>b.title)));});
  return()=>{active=false;};
 },[username]);
 useEffect(()=>{
  let active=true;if(!selected)return;
  const needs=!selected.description&&/^\/works\/OL\d+W$/.test(selected.id||'');
  setDetail({description:selected.description||'',loading:needs});
  if(needs)getBookDetails(selected).then(response=>{
   if(!active)return;
   setDetail(old=>({...old,loading:false,description:response.description||'',error:response.error?errorText(response.error):''}));
  });
  getBookByNameInDatabase(selected.title).then(response=>{if(active&&response.book)setDetail(old=>({...old,rating:response.book.rating,ratingCount:response.book.ratingCount}));});
  return()=>{active=false;};
 },[selected,retry]);
 const choose=async(book,accepted)=>{
  if(!username){setSelected(null);setShowLogin(true);return;}
  if(saving)return;setSaving(true);setError('');setMessage('');
  let description=book.description||(selected?.title===book.title?detail.description:'')||'';
  if(accepted&&!description&&/^\/works\/OL\d+W$/.test(book.id||'')){const response=await getBookDetails(book);description=response.description||'';}
  const body={title:book.title,description,author:(book.authors||[]).join(', '),genre:book.categories||[],thumbnail:book.thumbnail||''};
  const response=await (accepted?acceptBook(body):rejectBook(body));setSaving(false);
  if(response.error){setError(errorText(response.error));return;}
  if(accepted){setSaved(old=>new Set([...old,book.title]));setMessage('Saved “'+book.title+'” to your library.');}
  else{setRejected(old=>[...old,book]);setBooks(old=>old.filter(b=>b.title!==book.title));setSelected(null);setMessage('Book hidden. You can undo this.');}
 };
 const undo=async()=>{
  if(saving||!rejected.length)return;setSaving(true);
  const book=rejected[rejected.length-1],response=await undoRejectBook({title:book.title});setSaving(false);
  if(response.error)setError(errorText(response.error));
  else{setBooks(old=>[book,...old.filter(b=>b.title!==book.title)]);setRejected(old=>old.slice(0,-1));setMessage('Book restored.');}
 };
 const index=selected?books.findIndex(b=>b.title===selected.title):-1;
 return <main className='discovery'>
  <div className='discovery-heading'><div><p className='eyebrow'>YOUR NEXT CHAPTER</p><h1>Find your next favourite book.</h1><p>Explore the collection and save the stories you want to read.</p></div>{username?<Link to='/myLibrary'>My library →</Link>:<Link to='/signup'>Create your free account →</Link>}</div>
  {books.length>0&&<BookWall books={books} onSelect={setSelected} paused={busy||!!selected||showLogin}/>}
  <section id='browse-books' aria-label='Browse books'>
   <form className='catalog-search' onSubmit={event=>{event.preventDefault();setFilters(old=>({...old,search:search.trim(),page:1}));}}>
    <label className='search-field'>Search books<input type='search' placeholder='Title or author…' maxLength={200} value={search} onChange={event=>setSearch(event.target.value)}/></label>
    <label>Genre<select value={filters.genre} onChange={event=>setFilters(old=>({...old,genre:event.target.value,page:1}))}><option value=''>{username?'For you':'Featured fiction'}</option>{genres.map(genre=><option key={genre}>{genre}</option>)}</select></label>
    <Button type='submit' disabled={busy}>Search</Button>
    {filters.search&&<Button variant='outline-secondary' onClick={()=>{setSearch('');setFilters(old=>({...old,search:'',page:1}));}}>Clear search</Button>}
   </form>
   <h2>{filters.search?'Results for “'+filters.search+'”':username&&!filters.genre?'Recommended for you':'Browse the collection'}</h2>
   {username&&!filters.genre&&!filters.search&&<p className='catalog-note'>Based on your genres. <Link to='/setPreferences'>Update your interests</Link></p>}
   {source&&<p className='catalog-note'>{source==='classics'?'Live search is temporarily unavailable. Showing our curated classics.':source==='openlibrary'?'Book metadata and covers from Open Library.':'Book metadata from Google Books.'}</p>}
   {error&&<Alert variant='danger'>{error} <Button size='sm' onClick={load}>Try again</Button></Alert>}
   {message&&<Alert variant='success' role='status'>{message} <Link to='/myLibrary'>View my library</Link></Alert>}
   {rejected.length>0&&<Button disabled={saving} onClick={undo}>Undo rejection</Button>}
   {busy?<p role='status'>Finding your next read…</p>:<div className='catalog-grid'>{books.map(book=><article className='catalog-card' key={book.id||book._id||book.title}>
    <button className='cover-button' aria-label={'View '+book.title} onClick={()=>setSelected(book)}><img src={book.thumbnail||'/book-placeholder.svg'} alt={book.title} loading='lazy' onError={coverError}/></button>
    <div className='catalog-card-body'><p className='book-category'>{book.categories?.[0]||'Discover'}{book.year?' · '+book.year:''}</p><h3>{book.title}</h3><p className='book-author'>{(book.authors||[]).join(', ')||'Author not listed'}</p><p className='book-excerpt'>{book.description||'Open this book to explore its summary and details.'}</p>
     <button className='details-link' onClick={()=>setSelected(book)}>View details →</button>
     <Button disabled={saving||saved.has(book.title)} onClick={()=>choose(book,true)}>{saved.has(book.title)?'✓ In your library':'♡ Save to my library'}</Button>
    </div>
   </article>)}</div>}
   {!busy&&!books.length&&!error&&<div className='catalog-empty'><h3>No books to show here.</h3><p>Try another title, author, genre, or the next page.</p><Button onClick={()=>{setSearch('');setFilters({genre:'All',search:'',page:1});}}>Explore all books</Button></div>}
   <nav className='catalog-pagination' aria-label='Catalog pages'><Button variant='outline-primary' disabled={busy||filters.page===1} onClick={()=>setFilters(old=>({...old,page:old.page-1}))}>Previous page</Button><span>Page {filters.page}</span><Button disabled={busy||!hasMore} onClick={()=>setFilters(old=>({...old,page:old.page+1}))}>Next page</Button></nav>
  </section>
  {selected&&<Modal onClosePasswordChange={()=>setSelected(null)}><div className='catalog-detail'><img src={selected.thumbnail||'/book-placeholder.svg'} alt={'Cover of '+selected.title} onError={coverError}/><div>
   <BookDescription title={selected.title} author={(selected.authors||[]).join(', ')} genres={selected.categories||[]} description={detail.description} rating={detail.rating||0} ratingCount={detail.ratingCount||0} errorMessage={detail.ratingCount?'':'No community ratings yet'}/>
   {detail.loading&&<p role='status'>Loading summary…</p>}{detail.error&&<Alert variant='warning'>{detail.error} <Button size='sm' onClick={()=>setRetry(old=>old+1)}>Retry summary</Button></Alert>}{!detail.loading&&!detail.error&&!detail.description&&<p>No summary is available for this edition.</p>}
   {selected.sourceUrl&&<a href={selected.sourceUrl} target='_blank' rel='noreferrer'>View source on Open Library ↗</a>}
   <div className='detail-actions'><Button disabled={saving||saved.has(selected.title)} onClick={()=>choose(selected,true)}>{saved.has(selected.title)?'✓ In your library':'♡ Save to my library'}</Button><Button variant='outline-secondary' disabled={saving} onClick={()=>choose(selected,false)}>Not for me</Button></div>
   {error&&<Alert variant='danger'>{error}</Alert>}
   <div className='detail-actions'><Button disabled={index<=0||saving} onClick={()=>setSelected(books[index-1])}>Previous book</Button><Button disabled={index<0||index>=books.length-1||saving} onClick={()=>setSelected(books[index+1])}>Next book</Button></div>
  </div></div></Modal>}
  {showLogin&&<LoginModal onCloseModal={()=>setShowLogin(false)}/>}
 </main>;
}
