import { apiURL } from './apiConstants';
export async function request(path, { method = 'GET', body, sessionID } = {}) {
  const token = sessionID || sessionStorage.getItem('sessionID') || '';
  try {
    const response = await fetch(apiURL + path, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const data = await response.json();
    if (response.status === 401 && token && data.error === 'user is not logged in') {
      sessionStorage.removeItem('sessionID');
      sessionStorage.removeItem('username');
      window.dispatchEvent(new Event('bookclub:logout'));
    }
    if (!response.ok && !data.error) data.error = 'Request failed. Please try again.';
    return data;
  } catch {
    return { error: 'Cannot reach BookClub. Check your connection and try again.' };
  }
}
export const errorText = error => Array.isArray(error) ? error.join('. ') : typeof error === 'string' ? error : 'Something went wrong. Please try again.';
