// Small adapter: tests replace only the external Google service, not application/database logic.
exports.search = (query, options) => new Promise((resolve, reject) => {
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', `${options.field === 'subject' ? 'subject' : 'intitle'}:${query}`);
  url.searchParams.set('maxResults', String(options.limit || 10));
  url.searchParams.set('langRestrict', 'en');
  if (process.env.GOOGLE_API_KEY) url.searchParams.set('key', process.env.GOOGLE_API_KEY);
  fetch(url, { signal: AbortSignal.timeout(10000) }).then(async response => {
    if (!response.ok) throw new Error(`Google Books returned ${response.status}`);
    const data = await response.json();
    return (data.items || []).map(({ id, volumeInfo: v = {} }) => ({
      id, title: v.title, authors: v.authors || [], description: v.description || 'No description available.',
      categories: v.categories || [], thumbnail: (v.imageLinks?.thumbnail || '').replace(/^http:/, 'https:')
    }));
  }).then(resolve, reject);
});

exports.browse = async (genre,options) => (await import('../../hosted/search.js')).searchBooks(genre,process.env,options);
exports.details = async work => (await import('../../hosted/search.js')).getBookDetails(work);
