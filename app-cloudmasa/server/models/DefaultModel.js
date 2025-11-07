// server/models/DefaultModel.js
import mongoose from 'mongoose';

const defaultSchema = new mongoose.Schema({
  repo: String,
  folder: String,
}, { collection: 'default' });

const Default = mongoose.model('Default', defaultSchema);

export default Default;