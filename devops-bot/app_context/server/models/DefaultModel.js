const mongoose = require('mongoose');

const defaultSchema = new mongoose.Schema({
  repo: String,
  folder: String,
}, { collection: 'default' });

const Default = mongoose.model('Default', defaultSchema);

module.exports = Default;