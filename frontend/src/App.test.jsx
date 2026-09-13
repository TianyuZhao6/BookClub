import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import * as users from './api/userAPI';
import * as books from './api/bookAPI';
vi.mock('./api/userAPI');
vi.mock('./api/bookAPI');
vi.mock('./components/navbar/NavBar', () => ({ default: () => <nav>BookClub</nav> }));
const firstBook = { _id: 'book1', title: 'Test Book', author: 'Writer', authors: ['Writer'], description: 'A book description', genre: ['Fiction'], categories: ['Fiction'], thumbnail: '' };
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); window.history.replaceState({}, '', '/');
  document.body.innerHTML = '<div id="overlays"></div>';
  books.getBookByGenre.mockResolvedValue({ data: { book: firstBook } });
  books.getRecommendations.mockResolvedValue({ data: { book: [firstBook] } });
  books.getBookByNameInDatabase.mockResolvedValue({ book: { rating: 0, ratingCount: 0 } });
});
afterEach(cleanup);
const authenticated = path => { sessionStorage.setItem('username', 'reader1'); sessionStorage.setItem('sessionID', 'test-session'); window.history.replaceState({}, '', path); };
test('anonymous private deep link redirects to login', async () => {
  window.history.replaceState({}, '', '/myLibrary'); render(<App />);
  expect(await screen.findByLabelText('Username')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/login');
});
test('signup persists session and reaches preferences', async () => {
  users.createAccount.mockResolvedValue({ message: 'Account successfully created' });
  users.login.mockResolvedValue({ message: 'Login Successful', sessionID: 'new-session' });
  users.getPreferencesByUsername.mockResolvedValue({ data: [] });
  window.history.replaceState({}, '', '/signup'); render(<App />);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'reader@example.com' } });
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'reader1' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'GoodPassword1!' } });
  fireEvent.change(screen.getByLabelText('Re-Enter Password'), { target: { value: 'GoodPassword1!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(await screen.findByText('Select your favourite genres')).toBeInTheDocument();
  expect(sessionStorage.getItem('sessionID')).toBe('new-session');
  expect(sessionStorage.getItem('username')).toBe('reader1');
});
test('authenticated refresh loads library and removal cannot reappear through filters', async () => {
  authenticated('/myLibrary');
  users.getMyLibraryByUsername.mockResolvedValueOnce({ myLibrary: [firstBook] }).mockResolvedValue({ myLibrary: [] });
  users.getMyReadBookByUsername.mockResolvedValue({ myList: [] });
  users.setMyLibraryByUsername.mockResolvedValue({ myLibrary: [] });
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Test Book' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove From Library' }));
  expect(await screen.findByText(/Your library is empty/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Reading status'), { target: { value: 'unread' } });
  expect(screen.queryByRole('button', { name: 'Test Book' })).not.toBeInTheDocument();
});
test('reject and undo preserve the displayed book', async () => {
  authenticated('/');
  books.getRecommendations.mockResolvedValueOnce({ data: { book: [firstBook] } }).mockResolvedValue({ data: { book: [{ ...firstBook, title: 'Next Book' }] } });
  books.rejectBook.mockResolvedValue({ message: 'book rejected' });
  books.undoRejectBook.mockResolvedValue({ message: 'Rejection undone' });
  render(<App />); await screen.findByAltText('Test Book');
  fireEvent.click(screen.getByRole('button', { name: 'REJECT', exact: true }));
  await screen.findByAltText('Next Book');
  fireEvent.click(screen.getByRole('button', { name: 'UNDO REJECTION' }));
  expect(await screen.findByAltText('Test Book')).toBeInTheDocument();
  expect(books.undoRejectBook).toHaveBeenCalledWith({ title: 'Test Book' });
});
test('failed recommendation offers recovery and failed accept keeps the book', async () => {
  authenticated('/');
  books.getRecommendations.mockResolvedValueOnce({ error: 'Search unavailable' }).mockResolvedValue({ data: { book: [firstBook] } });
  books.acceptBook.mockResolvedValue({ error: 'Save failed' });
  render(<App />);
  expect(await screen.findByText('Search unavailable')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByAltText('Test Book');
  fireEvent.click(screen.getByRole('button', { name: 'ACCEPT' }));
  expect(await screen.findByText('Save failed')).toBeInTheDocument();
  expect(screen.getByAltText('Test Book')).toBeInTheDocument();
});
test('logout clears both stored user and session', async () => {
  authenticated('/logout'); users.logout.mockResolvedValue({ message: 'logout successful' });
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe('/login'));
  expect(sessionStorage.getItem('username')).toBeNull(); expect(sessionStorage.getItem('sessionID')).toBeNull();
});
