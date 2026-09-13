const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  value: { type: Number, min: 1, max: 5, required: true }
});
schema.index({ user: 1, book: 1 }, { unique: true });
module.exports = mongoose.model('Rating', schema);
