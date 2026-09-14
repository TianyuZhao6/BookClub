require('dotenv').config();
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { createApp } = require('./app');

async function start() {
  if (!process.env.MONGODB_URI || !process.env.SESSION_SECRET) throw new Error('Set MONGODB_URI and SESSION_SECRET in backend/.env (see .env.example)');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([require('./models/user').init(), require('./models/book').init(), require('./models/rating').init()]);
  const store = new MongoDBStore({ uri: process.env.MONGODB_URI, collection: 'sessions' });
  store.on('error', err => console.error('Session store:', err.message));
  const app = createApp({ store });
  const port = process.env.PORT || 3001;
  const server = app.listen(port, () => console.log(`BookClub API listening on port ${port}`));
  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    await store.client.close();
  });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
start().catch(err => { console.error(err.message); process.exitCode = 1; });
