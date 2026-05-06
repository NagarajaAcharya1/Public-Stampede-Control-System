const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  message: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'High' },
  status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
