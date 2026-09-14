import { useContext, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import Rating from '@mui/material/Rating';
import { leaveBookRating } from '../../api/bookAPI';
import { setMyLibraryByUsername, markBookAsRead, markBookAsUnRead } from '../../api/userAPI';
import { errorText } from '../../api/request';
import UserContext from '../../user/UserContext';
import Modal from '../modal/Modal';
import './BookInfoModal.css';
export default function BookInfoModal({ book, rBooks, onRefresh, onCloseModal }) {
  const { username } = useContext(UserContext);
  const [value, setValue] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRead = rBooks.some(item => item._id === book._id);
  const act = async (operation, close = false) => {
    setBusy(true); setError(''); setMessage('');
    const response = await operation();
    if (response.error) setError(errorText(response.error));
    else { setMessage(response.message || 'Library updated'); await onRefresh(); }
    setBusy(false);
    if (!response.error && close) onCloseModal();
  };
  return <Modal onClosePasswordChange={onCloseModal}><div className='modal-container'>
    <h3>{book.title}</h3><h5>{book.author}</h5><p>{book.description}</p>
    <Button disabled={busy} onClick={() => act(() => (isRead ? markBookAsUnRead : markBookAsRead)(username, { bookId: book._id }))}>{isRead ? 'Mark As Unread' : 'Mark As Read'}</Button>
    {isRead && <div><Rating name='book-rating' value={value} onChange={(event, rating) => setValue(rating || 0)} /><Button disabled={busy || value === 0} onClick={() => act(() => leaveBookRating({ newRating: value }, book.title))}>Leave Rating</Button></div>}
    <div className='remove-book-button'><Button variant='danger' disabled={busy} onClick={() => act(() => setMyLibraryByUsername(username, { removedBook: { _id: book._id } }), true)}>Remove From Library</Button></div>
    {error && <Alert variant='danger'>{error}</Alert>}{message && <Alert variant='success'>{message}</Alert>}
  </div></Modal>;
}
