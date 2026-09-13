require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');

// Importing the app never opens a database connection or a listening socket.
function createApp({ store, secret = process.env.SESSION_SECRET } = {}) {
  if (!secret) throw new Error('SESSION_SECRET is required');
  const app = express();
  app.disable('x-powered-by');
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(session({
    secret, store, resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000 }
  }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/users', require('./routes/userRoutes'));
  app.use('/books', require('./routes/bookRoutes'));
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, req, res, next) => {
    const status = err.status || (err.code === 11000 ? 409 : err.name === 'CastError' || err.name === 'ValidationError' ? 400 : 500);
    if (status === 500) console.error(err.message);
    res.status(status).json({ error: status === 500 ? 'An unexpected server error occurred' : err.code === 11000 ? 'Username or email already exists' : err.message });
  });
  return app;
}
module.exports = { createApp };
