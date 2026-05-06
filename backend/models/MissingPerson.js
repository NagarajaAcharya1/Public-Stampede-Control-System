const mongoose = require('mongoose');

const missingPersonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  description: { type: String },
  lastSeenZone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  status: { type: String, enum: ['Missing', 'Found'], default: 'Missing' },
}, { timestamps: true });

module.exports = mongoose.model('MissingPerson', missingPersonSchema);
