const router = require('express').Router();
const c = require('../controllers/userController');
const { isLoggedIn, asyncRoute: run } = require('./middleware/auth');
router.post('/create', run(c.createAccount));
router.post('/login', run(c.login));
router.get('/get', isLoggedIn, run(c.getUsers));
router.get('/get/:username', isLoggedIn, run(c.getByUsername));
router.post('/logout', isLoggedIn, run(c.logout));
router.put('/update', isLoggedIn, run(c.changePassword));
router.delete('/delete', isLoggedIn, run(c.deleteAccount));
for (const [path, get, set] of [
  ['myLibrary', 'viewMyLibrary', 'setMyLibrary'],
  ['preferences', 'getPreferences', 'setPreferences'],
  ['myReadBook', 'getMyReadBooks', 'markBookAsRead'],
  ['myUnReadBook', 'getMyUnReadBooks', 'markBookAsUnRead']
]) {
  router.get(`/get/${path}/:username`, isLoggedIn, run(c[get]));
  router.post(`/set/${path}/:username`, isLoggedIn, run(c[set]));
}
module.exports = router;
