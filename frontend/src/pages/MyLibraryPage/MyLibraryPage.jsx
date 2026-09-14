import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { getMyLibraryByUsername, getMyReadBookByUsername } from '../../api/userAPI';
import { errorText } from '../../api/request';
import UserContext from '../../user/UserContext';
import BookInfoModal from '../../components/BookInfoModal/BookInfoModal';
import woodshelf from '../../images/woodshelf.png';
import './MyLibraryPage.css';
export default function MyLibraryPage() {
  const { username } = useContext(UserContext);
  const [books, setBooks] = useState([]);
  const [read, setRead] = useState([]);
  const [genre, setGenre] = useState('all');
  const [status, setStatus] = useState('all');
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const [library, reading] = await Promise.all([getMyLibraryByUsername(username), getMyReadBookByUsername(username)]);
    if (library.error || reading.error) setError(errorText(library.error || reading.error));
    else { setBooks(library.myLibrary); setRead(reading.myList); setError(''); }
    setLoading(false);
  }, [username]);
  useEffect(() => { refresh(); }, [refresh]);
  const genres = useMemo(() => [...new Set(books.flatMap(book => book.genre || []))], [books]);
  useEffect(() => { if (genre !== 'all' && !genres.includes(genre)) setGenre('all'); }, [genres, genre]);
  const selected = books.filter(book => (genre === 'all' || book.genre.includes(genre)) && (status === 'all' || read.some(item => item._id === book._id) === (status === 'read')));
  const rows = Array.from({ length: Math.ceil(selected.length / 5) }, (_, i) => selected.slice(i * 5, i * 5 + 5));
  return <main className='myLibrary'>
    <h1 className='myLibraryTitle'>My Library</h1><p>Your saved favourites and reading list. <Link to='/'>Discover more books →</Link></p>
    {error && <Alert variant='danger'>{error}</Alert>}
    <div className='bookFilter'>
      <label>Genre <select value={genre} onChange={event => setGenre(event.target.value)}><option value='all'>All genres</option>{genres.map(item => <option key={item}>{item}</option>)}</select></label>{' '}
      <label>Reading status <select value={status} onChange={event => setStatus(event.target.value)}><option value='all'>All books</option><option value='read'>Read</option><option value='unread'>Unread</option></select></label>
    </div>
    {loading ? <p role='status'>Loading library…</p> : selected.length === 0 && <p>{books.length ? 'No books match these filters.' : 'Your library is empty. Save a book from the collection to start your reading list.'}</p>}
    {rows.map((row, index) => <div key={index}><div className='displayed-books'>{row.map(book => <button type='button' className='book-select' aria-label={book.title} key={book._id} onClick={() => setCurrent(book)}><img className='book-picture' src={book.thumbnail || '/book-placeholder.svg'} alt={book.title} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/book-placeholder.svg'; }} /><span className='library-book-title'>{book.title}</span><span className='library-book-author'>{book.author}</span></button>)}</div><img src={woodshelf} className='shelf' alt='' /></div>)}
    {current && <BookInfoModal book={current} rBooks={read} onRefresh={refresh} onCloseModal={() => setCurrent(null)} />}
  </main>;
}
