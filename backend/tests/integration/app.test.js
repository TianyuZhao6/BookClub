const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../../app');
const User = require('../../models/user');
const Book = require('../../models/book');
const Rating = require('../../models/rating');
const search = require('../../services/bookSearch');
let mongo, app, store, alice, bob;
const password = 'BookClub123!';
const book = { title: 'Science / Fiction #1?', author: 'Test Author', description: 'A test book', genre: ['Science', 'Fiction'], thumbnail: '' };
const titlePath = encodeURIComponent(book.title);
const call = (method, path, token = alice, body) => request(app)[method](path).set('Authorization', token || '').send(body);
async function signup(username) {
  const response = await request(app).post('/users/create').send({ username, password, email: `${username}@example.com` }).expect(201);
  assert.equal(response.body.data.password, undefined);
  const login = await request(app).post('/users/login').send({ username, password }).expect(200);
  assert.equal(login.body.data.password, undefined);
  return login.body.sessionID;
}
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Book.init(), Rating.init()]);
  store = new session.MemoryStore();
  app = createApp({ store, secret: 'isolated-integration-test-secret' });
  alice = await signup('alice1'); bob = await signup('bobby1');
});
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
test('health and unknown routes', async () => {
  await request(app).get('/health').expect(200, { status: 'ok' });
  await request(app).get('/missing').expect(404);
});
test('signup validation, duplicates, invalid login', async () => {
  for (const body of [{}, { username: {}, password, email: 'x@y.com' }, { username: 'x'.repeat(101), password, email: 'x@y.com' }, { username: 'valid1', password: 'a'.repeat(101), email: 'x@y.com' }, { username: 'valid1', password, email: 'x@y.com', preferences: {} }]) await request(app).post('/users/create').send(body).expect(400);
  await request(app).post('/users/create').send({ username: 'alice1', password, email: 'ALICE1@example.com' }).expect(409);
  await request(app).post('/users/login').send({}).expect(400);
  await request(app).post('/users/login').send({ username: 'alice1', password: 'wrong' }).expect(401);
});
test('all private routes enforce ownership and do not expose passwords', async () => {
  for (const path of ['get/alice1', 'get/myLibrary/alice1', 'get/preferences/alice1', 'get/myReadBook/alice1', 'get/myUnReadBook/alice1']) {
    await call('get', '/users/' + path, '').expect(401);
    await call('get', '/users/' + path, bob).expect(403);
  }
  for (const path of ['myLibrary', 'preferences', 'myReadBook', 'myUnReadBook']) await call('post', `/users/set/${path}/alice1`, bob, {}).expect(403);
  for (const path of ['accept', 'reject', 'set/rating/test']) await call('post', '/books/' + path, '', {}).expect(401);
  assert.equal((await call('get', '/users/get/alice1').expect(200)).body.user.password, undefined);
  assert.equal((await call('get', '/users/get').expect(200)).body.allUsers.length, 1);
});
test('separate login sessions and expiry', async () => {
  const login = await request(app).post('/users/login').send({ username: 'alice1', password }).expect(200);
  assert.notEqual(login.body.sessionID, alice);
  await call('get', '/users/get/alice1', login.body.sessionID).expect(200);
  await new Promise((resolve, reject) => store.set('expired', { user: { username: 'alice1' }, cookie: { expires: new Date(Date.now() - 1000) } }, err => err ? reject(err) : resolve()));
  await call('get', '/users/get/alice1', 'expired').expect(401);
});
test('preferences persist and validate', async () => {
  await call('post', '/users/set/preferences/alice1', alice, { preferences: ['Science'] }).expect(400);
  const preferences = ['Science', 'Fiction', 'History', 'Adventure', 'Poetry'];
  await call('post', '/users/set/preferences/alice1', alice, { preferences }).expect(200);
  assert.deepEqual((await call('get', '/users/get/preferences/alice1')).body.data, preferences);
});
test('accept is idempotent and ignores forged username', async () => {
  await call('post', '/books/accept', alice, {}).expect(400);
  for (let i = 0; i < 2; i++) await call('post', '/books/accept', alice, { ...book, username: 'bobby1' }).expect(200);
  assert.equal((await call('get', '/users/get/myLibrary/alice1')).body.myLibrary.length, 1);
  assert.equal((await call('get', '/users/get/myLibrary/bobby1', bob)).body.myLibrary.length, 0);
});
test('read/unread lists and library membership', async () => {
  assert.equal((await call('get', '/users/get/myUnReadBook/alice1')).body.myList.length, 1);
  await call('post', '/users/set/myReadBook/bobby1', bob, { title: book.title }).expect(404);
  for (let i = 0; i < 2; i++) await call('post', '/users/set/myReadBook/alice1', alice, { title: book.title }).expect(200);
  assert.equal((await call('get', '/users/get/myReadBook/alice1')).body.myList.length, 1);
  assert.equal((await call('get', '/users/get/myUnReadBook/alice1')).body.myList.length, 0);
  await call('post', '/users/set/myUnReadBook/alice1', alice, { title: book.title }).expect(200);
  assert.equal((await call('get', '/users/get/myReadBook/alice1')).body.myList.length, 0);
});
test('rating validation, one rating per user, and average', async () => {
  const path = '/books/set/rating/' + titlePath;
  await call('post', path, alice, { newRating: 5 }).expect(403);
  await call('post', '/users/set/myReadBook/alice1', alice, { title: book.title }).expect(200);
  for (const value of [null, '5', 0, 6, -1, 1.5]) await call('post', path, alice, { newRating: value }).expect(400);
  for (const value of [5, 3]) await call('post', path, alice, { newRating: value }).expect(200);
  let response = await request(app).get('/books/get/db/' + titlePath).expect(200);
  assert.equal(response.body.book.rating, 3); assert.equal(response.body.book.ratingCount, 1);
  await call('post', '/books/accept', bob, book).expect(200);
  await call('post', '/users/set/myReadBook/bobby1', bob, { title: book.title }).expect(200);
  await call('post', path, bob, { newRating: 5 }).expect(200);
  response = await request(app).get('/books/get/db/' + titlePath).expect(200);
  assert.equal(response.body.book.rating, 4); assert.equal(response.body.book.ratingCount, 2);
});
test('recommendations exclude accepted/rejected books and undo restores eligibility', async () => {
  const original = search.search;
  try {
    search.search = async (query, options) => {
      assert.equal(options.field, 'subject');
      assert.ok(['Science', 'Fiction', 'History', 'Adventure', 'Poetry'].includes(query));
      return [{ title: book.title }, { title: 'Another book' }];
    };
    assert.deepEqual((await call('get', '/books/get').expect(200)).body.data.book, [{ title: 'Another book' }]);
    await call('post', '/books/reject', alice, { title: 'Another book' }).expect(200);
    assert.deepEqual((await call('get', '/books/get').expect(200)).body.data.book, []);
    await call('post', '/books/reject/undo', alice, { title: 'Another book' }).expect(200);
    assert.equal((await call('get', '/books/get')).body.data.book.length, 1);
  } finally { search.search = original; }
});
test('empty and failing external searches are handled', async () => {
  const original = search.search;
  try {
    search.search = async () => [];
    assert.equal((await request(app).get('/books/get/by/genre/Unknown').expect(200)).body.data.book, null);
    assert.deepEqual((await request(app).get('/books/get/Unknown').expect(200)).body.data.book, []);
    search.search = async () => { throw new Error('upstream failure'); };
    await request(app).get('/books/get/by/genre/Unknown').expect(502);
    await call('get', '/books/get').expect(502);
    await request(app).get('/health').expect(200);
  } finally { search.search = original; }
});
test('remove cleans read status and returns fresh library', async () => {
  await call('post', '/users/set/myLibrary/alice1', alice, {}).expect(400);
  const saved = (await call('get', '/users/get/myLibrary/alice1')).body.myLibrary[0];
  assert.deepEqual((await call('post', '/users/set/myLibrary/alice1', alice, { removedBook: saved }).expect(200)).body.myLibrary, []);
  assert.deepEqual((await call('get', '/users/get/myReadBook/alice1')).body.myList, []);
});
test('password changes verify old password and allow login with new one', async () => {
  await call('put', '/users/update', alice, {}).expect(400);
  await call('put', '/users/update', alice, { oldPassword: 'wrong', newPassword: 'NewPassword123!', newPassword2: 'NewPassword123!' }).expect(400);
  await call('put', '/users/update', alice, { oldPassword: password, newPassword: 'NewPassword123!', newPassword2: 'NewPassword123!' }).expect(200);
  await request(app).post('/users/login').send({ username: 'alice1', password }).expect(401);
  await request(app).post('/users/login').send({ username: 'alice1', password: 'NewPassword123!' }).expect(200);
});
test('logout invalidates its session', async () => {
  await call('post', '/users/logout', alice, {}).expect(200);
  await call('get', '/users/get/alice1', alice).expect(401);
});
test('delete verifies password and invalidates access', async () => {
  await call('delete', '/users/delete', bob, { password: 'wrong' }).expect(400);
  await call('delete', '/users/delete', bob, { password }).expect(200);
  await call('get', '/users/get/bobby1', bob).expect(401);
  assert.equal(await User.countDocuments({ username: 'bobby1' }), 0);
});
