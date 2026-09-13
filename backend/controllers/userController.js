const bcrypt = require('bcryptjs');
const emailValidator = require('email-validator');
const mongoose = require('mongoose');
const User = require('../models/user');
const Book = require('../models/book');
const Rating = require('../models/rating');
const { passwordErrors, validPreferences } = require('../services/validation');
const publicUser = user => ({ _id: user._id, username: user.username, email: user.email, preferences: user.preferences });
const destroySession = (req, token) => new Promise((resolve, reject) => req.sessionStore.destroy(token, err => err ? reject(err) : resolve()));
exports.getUsers = async (req, res) => res.json({ allUsers: [publicUser(req.user)] });
exports.getByUsername = async (req, res) => res.json({ user: publicUser(req.user) });
exports.createAccount = async (req, res) => {
  const { username, password, preferences = [] } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const errors = passwordErrors(password);
  if (typeof username !== 'string' || !/^[A-Za-z0-9]{5,100}$/.test(username)) errors.push('Username must contain 5–100 letters or numbers');
  if (!emailValidator.validate(email)) errors.push('Email must be valid');
  if (!validPreferences(preferences)) errors.push('Preferences must be a list of genres');
  if (errors.length) return res.status(400).json({ error: errors });
  if (await User.exists({ $or: [{ username }, { email }] })) return res.status(409).json({ error: ['Username or email already exists'] });
  const user = await User.create({ username, email, password: await bcrypt.hash(password, 12), preferences: [...new Set(preferences)] });
  res.status(201).json({ data: publicUser(user), message: 'Account successfully created', error: [] });
};
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Username and password are required' });
  const user = await User.findOne({ username });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Incorrect username or password' });
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.user = { username: user.username, id: String(user._id), authVersion: user.authVersion || 0 };
  await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
  res.json({ data: publicUser(user), message: 'Login Successful', sessionID: req.sessionID, error: null });
};
exports.logout = async (req, res) => {
  await destroySession(req, req.authToken);
  res.json({ message: 'logout successful' });
};
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword, newPassword2 } = req.body;
  const errors = passwordErrors(newPassword);
  if (newPassword !== newPassword2) errors.push('New passwords do not match');
  if (typeof oldPassword !== 'string' || !await bcrypt.compare(oldPassword, req.user.password)) errors.push('Password does not match');
  if (errors.length) return res.status(400).json({ error: errors });
  req.user.password = await bcrypt.hash(newPassword, 12);
  req.user.authVersion = (req.user.authVersion || 0) + 1;
  await req.user.save();
  req.authSession.user.authVersion = req.user.authVersion;
  await new Promise((resolve, reject) => req.sessionStore.set(req.authToken, req.authSession, err => err ? reject(err) : resolve()));
  res.json({ error: [], message: 'Password updated' });
};
exports.deleteAccount = async (req, res) => {
  if (typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password, req.user.password)) return res.status(400).json({ error: 'Password does not match' });
  await Rating.deleteMany({ user: req.user._id });
  await req.user.deleteOne();
  await destroySession(req, req.authToken);
  res.json({ data: 'Account deleted successfully', error: '' });
};
exports.viewMyLibrary = async (req, res) => res.json({ myLibrary: await Book.find({ _id: { $in: req.user.myLibrary } }), error: null });
exports.setMyLibrary = async (req, res) => {
  const id = req.body.removedBook?._id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'A valid book ID is required' });
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { myLibrary: id, readBook: id } }, { new: true });
  res.json({ myLibrary: await Book.find({ _id: { $in: user.myLibrary } }), error: null });
};
exports.getPreferences = async (req, res) => res.json({ data: req.user.preferences, error: null });
exports.setPreferences = async (req, res) => {
  const { preferences } = req.body;
  if (!validPreferences(preferences) || new Set(preferences.map(x => x.trim())).size < 5) return res.status(400).json({ error: 'Select at least 5 different genres (maximum 40)' });
  req.user.preferences = [...new Set(preferences.map(x => x.trim()))];
  await req.user.save();
  res.json({ data: req.user.preferences, error: null });
};
exports.getMyReadBooks = async (req, res) => res.json({ myList: await Book.find({ _id: { $in: req.user.readBook.filter(id => req.user.myLibrary.some(book => book.equals(id))) } }), error: null });
exports.getMyUnReadBooks = async (req, res) => res.json({ myList: await Book.find({ _id: { $in: req.user.myLibrary, $nin: req.user.readBook } }), error: null });
const markRead = read => async (req, res) => {
  const book = req.body.bookId ? await Book.findById(req.body.bookId) : typeof req.body.title === 'string' ? await Book.findOne({ title: req.body.title }) : null;
  if (!book || !req.user.myLibrary.some(id => id.equals(book._id))) return res.status(404).json({ error: 'Book is not in your library' });
  await User.updateOne({ _id: req.user._id }, read ? { $addToSet: { readBook: book._id } } : { $pull: { readBook: book._id } });
  res.json({ book, message: read ? 'book was added to the read list' : 'book was marked unread' });
};
exports.markBookAsRead = markRead(true);
exports.markBookAsUnRead = markRead(false);
