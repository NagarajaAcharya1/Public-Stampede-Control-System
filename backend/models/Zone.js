const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  currentOccupancy: { type: Number, default: 0 },
  totalEntered: { type: Number, default: 0 },
  totalExited: { type: Number, default: 0 },
  densityStatus: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  colorCode: { type: String, default: 'green' }
}, { timestamps: true });

module.exports = mongoose.model('Zone', zoneSchema);
