const User = require('../../models/user');
exports.asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
exports.isLoggedIn = exports.asyncRoute(async (req, res, next) => {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'user is not logged in' });
  const stored = await new Promise((resolve, reject) => req.sessionStore.get(token, (err, value) => err ? reject(err) : resolve(value)));
  if (!stored?.user?.username || !stored.cookie?.expires || new Date(stored.cookie.expires) <= new Date()) {
    return res.status(401).json({ error: 'user is not logged in' });
  }
  const user = await User.findOne({ username: stored.user.username });
  if (!user || stored.user.id !== String(user._id) || (stored.user.authVersion || 0) !== (user.authVersion || 0)) return res.status(401).json({ error: 'user is not logged in' });
  if (req.params.username && req.params.username !== user.username) return res.status(403).json({ error: 'You can only access your own account' });
  req.authSession = stored;
  req.user = user;
  req.authToken = token;
  next();
});
