import { request } from './request';
export const getBookByName = title => request('/books/get/' + encodeURIComponent(title));
export const getBookByNameInDatabase = title => request('/books/get/db/' + encodeURIComponent(title));
export const getBookByGenre = genre => request('/books/get/by/genre/' + encodeURIComponent(genre));
export const getRecommendations = () => request('/books/get');
export const acceptBook = (body, sessionID) => request('/books/accept', { method: 'POST', body, sessionID });
export const rejectBook = (body, sessionID) => request('/books/reject', { method: 'POST', body, sessionID });
export const undoRejectBook = body => request('/books/reject/undo', { method: 'POST', body });
export const leaveBookRating = (body, title) => request('/books/set/rating/' + encodeURIComponent(title), { method: 'POST', body });
