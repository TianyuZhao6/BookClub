const search = require('../services/bookSearch');
const User = require('../models/user');
const Book = require('../models/book');
const Rating = require('../models/rating');
async function results(query, field = 'title', limit = 40) {
  try { return await search.search(query, { field, limit }); }
  catch (error) { const err = new Error('Book search is temporarily unavailable. Please try again.'); err.status = 502; throw err; }
}
exports.getBookByName = async (req, res) => {
  if(req.query.work)return res.json(await search.details(req.query.work));
  const found = await results(req.params.bookName, 'title', 1);
  res.json({ data: { book: found }, message: found.length ? '' : 'Book not found', error: null });
};
exports.getBookRecommendation = async (req, res) => {
  const preferences = req.user.preferences.length ? req.user.preferences : ['Fiction'];
  const genre = req.query.genre || preferences[(Math.max(1,parseInt(req.query.page,10)||1)-1)%preferences.length];
  const library = await Book.find({ _id: { $in: req.user.myLibrary } }).select('title');
  const excluded = new Set([...library.map(book => book.title), ...(req.user.rejectedBooks || [])]);
  const catalog=req.query.catalog==='1'?await search.browse(genre,req.query):null;
  const found = (catalog?catalog.books:await results(genre, 'subject')).filter(book => book.title && !excluded.has(book.title));
  res.json({ ...(catalog||{}), books:undefined, data: { book: found }, message: found.length ? '' : 'No new books in this genre. Try again or change your preferences.', error: null });
};
exports.getBookRecommendationByGenre = async (req, res) => {
  if(req.query.catalog==='1'){const result=await search.browse(req.params.genre,req.query);return res.json({...result,books:undefined,data:{book:result.books},error:null});}
  const found = (await results(req.params.genre, 'subject')).filter(book => book.title);
  res.json({ data: { book: found[Math.floor(Math.random() * found.length)] || null }, message: found.length ? '' : 'No books found for this genre', error: null });
};
exports.acceptBookRecommendation = async (req, res) => {
  const { title, description = '', author = '', genre = [], thumbnail = '' } = req.body;
  if (typeof title !== 'string' || !title.trim() || title.length > 1000 || ![description, author, thumbnail].every(v => typeof v === 'string') || !Array.isArray(genre) || !genre.every(v => typeof v === 'string')) return res.status(400).json({ error: 'Valid book details are required' });
  const metadata={...(description?{description}:{}),...(thumbnail?{thumbnail}:{})};
  const defaults={title,author,genre,...(!description?{description}:{}),...(!thumbnail?{thumbnail}:{})};
  const book = await Book.findOneAndUpdate({ title }, { $setOnInsert: defaults, $set: metadata }, { upsert: true, new: true, runValidators: true });
  await User.updateOne({ _id: req.user._id }, { $addToSet: { myLibrary: book._id }, $pull: { rejectedBooks: title } });
  res.json({ book, message: 'book was added to the library' });
};
exports.rejectBookRecommendation = async (req, res) => {
  if (typeof req.body.title !== 'string' || !req.body.title.trim()) return res.status(400).json({ error: 'Book title is required' });
  await User.updateOne({ _id: req.user._id }, { $addToSet: { rejectedBooks: req.body.title } });
  res.json({ message: 'book rejected' });
};
exports.undoRejection = async (req, res) => {
  if (typeof req.body.title !== 'string') return res.status(400).json({ error: 'Book title is required' });
  await User.updateOne({ _id: req.user._id }, { $pull: { rejectedBooks: req.body.title } });
  res.json({ message: 'Rejection undone' });
};
exports.setBookRating = async (req, res) => {
  const value = req.body.newRating;
  if (!Number.isInteger(value) || value < 1 || value > 5) return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5' });
  const book = await Book.findOne({ title: req.params.bookName });
  if (!book || !req.user.myLibrary.some(id => id.equals(book._id)) || !req.user.readBook.some(id => id.equals(book._id))) return res.status(403).json({ error: 'Mark a book in your library as read before rating it' });
  await Rating.findOneAndUpdate({ user: req.user._id, book: book._id }, { $set: { value } }, { upsert: true, runValidators: true });
  res.json({ message: 'Thank you for your rating!' });
};
exports.getBookByNameInDatabase = async (req, res) => {
  const book = await Book.findOne({ title: req.params.bookName }).lean();
  if (!book) return res.status(404).json({ book: null, error: 'This book has no ratings yet' });
  const [stats] = await Rating.aggregate([{ $match: { book: book._id } }, { $group: { _id: null, rating: { $avg: '$value' }, ratingCount: { $sum: 1 } } }]);
  // Preserve historical aggregate ratings until the book has new per-user ratings.
  if (stats) Object.assign(book, { rating: stats.rating, ratingCount: stats.ratingCount });
  res.json({ book, error: null });
};
