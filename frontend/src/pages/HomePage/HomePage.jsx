import { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { getBookByGenre, getRecommendations, getBookByNameInDatabase, acceptBook, rejectBook, undoRejectBook } from '../../api/bookAPI';
import { errorText } from '../../api/request';
import UserContext from '../../user/UserContext';
import BookDescription from '../../components/BookDescription/BookDescription';
import LoginModal from '../LoginModal/LoginModal';
import ReactCardFlip from 'react-card-flip';
import './HomePage.css';

export default function HomePage() {
  const { username } = useContext(UserContext);
  const [book, setBook] = useState(null);
  const [rating, setRating] = useState({ rating: 0, ratingCount: 0 });
  const [flipped, setFlipped] = useState(false);
  const [rejected, setRejected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [empty, setEmpty] = useState('');
  const [source, setSource] = useState('');
  const pendingLoad = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++pendingLoad.current;
    setBusy(true); setError(''); setFlipped(false);
    const response = username ? await getRecommendations() : await getBookByGenre('Fiction');
    if (sequence !== pendingLoad.current) return;
    if (response.error) { setError(errorText(response.error)); setBook(null); }
    else {
      setSource(response.source || '');
      const list = response.data.book;
      setBook(Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] || null : list);
      setEmpty(response.message || 'No books found. Try another recommendation.');
    }
    setBusy(false);
  }, [username]);
  useEffect(() => { setRejected([]); load(); return () => { pendingLoad.current++; }; }, [load]);
  useEffect(() => {
    let active = true;
    setRating({ rating: 0, ratingCount: 0 });
    if (book?.title) getBookByNameInDatabase(book.title).then(response => {
      if (active && response.book) setRating(response.book);
    });
    return () => { active = false; };
  }, [book]);
  const choose = async accepted => {
    if (!username) { setShowLogin(true); return; }
    if (!book || busy) return;
    setBusy(true); setError('');
    const body = { title: book.title, description: book.description || '', author: (book.authors || []).join(', '), genre: book.categories || [], thumbnail: book.thumbnail || '' };
    const response = await (accepted ? acceptBook(body) : rejectBook(body));
    if (response.error) { setError(errorText(response.error)); setBusy(false); return; }
    if (!accepted) setRejected(previous => [...previous, book]);
    await load();
  };
  const undo = async () => {
    if (!rejected.length || busy) return;
    setBusy(true);
    const previous = rejected[rejected.length - 1];
    const response = await undoRejectBook({ title: previous.title });
    if (response.error) setError(errorText(response.error));
    else { setBook(previous); setRejected(items => items.slice(0, -1)); setFlipped(false); setError(''); }
    setBusy(false);
  };
  return <main className='discovery'>
    {source === 'classics' && <p className='catalog-notice'>Showing our classics collection while live book search is unavailable.</p>}
    {error && <Alert variant='danger'>{error}</Alert>}
    {busy && <p role='status'>Loading…</p>}
    <Button disabled={busy || !book} onClick={() => choose(true)}>ACCEPT</Button>
    {book ? <div id='imgcontainer' role='button' tabIndex={0} aria-label='Flip book details' onClick={() => setFlipped(!flipped)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFlipped(!flipped); } }}>
      <ReactCardFlip isFlipped={flipped} flipDirection='horizontal'>
        <div className='front-card'><img className='book' src={book.thumbnail || '/book-placeholder.svg'} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/book-placeholder.svg'; }} alt={book.title} /><p>{book.title}</p></div>
        <BookDescription title={book.title} author={(book.authors || []).join(', ')} genres={book.categories || []} description={book.description} rating={rating.rating} ratingCount={rating.ratingCount} errorMessage={rating.ratingCount ? '' : 'No ratings yet'} />
      </ReactCardFlip>
    </div> : !busy && <p>{empty}</p>}
    <Button disabled={busy || !book} onClick={() => choose(false)}>REJECT</Button>{' '}
    {rejected.length > 0 && <Button disabled={busy} onClick={undo}>UNDO REJECTION</Button>}
    {!book && <Button disabled={busy} onClick={load}>Try again</Button>}
    {showLogin && <LoginModal onCloseModal={() => setShowLogin(false)} />}
  </main>;
}
