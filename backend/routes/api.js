const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Zone = require('../models/Zone');
const Alert = require('../models/Alert');
const MissingPerson = require('../models/MissingPerson');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// --- Auth Routes ---
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid config' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role: role || 'Operator' });
    await user.save();
    res.json({ message: 'User created' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Username already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/auth/profile', async (req, res) => {
  const { oldUsername, newUsername, newPassword } = req.body;
  try {
    const user = await User.findOne({ username: oldUsername });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (newUsername) user.username = newUsername;
    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
    }
    await user.save();
    res.json({ message: 'Profile updated successfully', user: { username: user.username, role: user.role } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Username already taken' });
    res.status(500).json({ error: err.message });
  }
});

// --- Zone Routes ---
router.get('/zones', async (req, res) => {
  const zones = await Zone.find();
  res.json(zones);
});

router.post('/zones', async (req, res) => {
  const zone = new Zone(req.body);
  await zone.save();
  // emit to socket will happen via helper or simply client fetches again on new zone
  res.json(zone);
});

router.delete('/zones/:id', async (req, res) => {
  try {
    await Zone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Entry sensor → increment people inside
router.post('/iot/entry', async (req, res) => {
  const { count } = req.body;
  try {
    let zone = await Zone.findOne({ name: 'Entry' });
    if (!zone) return res.status(404).json({ error: 'Entry zone not found' });

    const n = count || 1;
    zone.currentOccupancy += n;
    zone.totalEntered = (zone.totalEntered || 0) + n;
    updateZoneDensity(zone);
    await zone.save();
    await checkThreshold(zone, req.io);
    req.io.emit('zone-update', zone);
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exit sensor → decrement people inside
router.post('/iot/exit', async (req, res) => {
  const { count } = req.body;
  try {
    let zone = await Zone.findOne({ name: 'Entry' });
    if (!zone) return res.status(404).json({ error: 'Entry zone not found' });

    const n = count || 1;
    zone.currentOccupancy = Math.max(0, zone.currentOccupancy - n);
    zone.totalExited = (zone.totalExited || 0) + n;
    updateZoneDensity(zone);
    await zone.save();
    req.io.emit('zone-update', zone);
    res.json(zone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Alerts ---
router.get('/alerts', async (req, res) => {
  const alerts = await Alert.find().populate('zoneId').sort({ createdAt: -1 }).limit(50);
  res.json(alerts);
});
router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { status: 'Resolved' }, { new: true }).populate('zoneId');
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    req.io.emit('alert-resolved', alert);
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/alerts', async (req, res) => {
  try {
    await Alert.deleteMany({});
    res.json({ message: 'All alerts cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Missing Persons ---
router.get('/missing-persons', async (req, res) => {
  const persons = await MissingPerson.find().populate('lastSeenZone').sort({ createdAt: -1 });
  res.json(persons);
});
router.post('/missing-persons', async (req, res) => {
  const person = new MissingPerson(req.body);
  await person.save();
  res.json(person);
});
router.patch('/missing-persons/:id/found', async (req, res) => {
  try {
    const person = await MissingPerson.findByIdAndUpdate(req.params.id, { status: 'Found' }, { new: true }).populate('lastSeenZone');
    if (!person) return res.status(404).json({ message: 'Not found' });
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Analytics ---
router.get('/analytics', async (req, res) => {
  try {
    const zone = await Zone.findOne({ name: 'Entry' });
    const totalAlerts = await Alert.countDocuments();
    const resolvedAlerts = await Alert.countDocuments({ status: 'Resolved' });
    const missingCount = await MissingPerson.countDocuments({ status: 'Missing' });
    const foundCount = await MissingPerson.countDocuments({ status: 'Found' });
    res.json({
      totalEntered: zone?.totalEntered || 0,
      totalExited: zone?.totalExited || 0,
      currentOccupancy: zone?.currentOccupancy || 0,
      capacity: zone?.capacity || 0,
      densityStatus: zone?.densityStatus || 'Low',
      totalAlerts,
      resolvedAlerts,
      missingCount,
      foundCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Dashboard Stats ---
router.get('/stats', async (req, res) => {
  const zone = await Zone.findOne({ name: 'Entry' });
  const activeAlerts = await Alert.countDocuments({ status: 'Active' });
  res.json({
    totalEntered:    zone ? zone.totalEntered    : 0,
    totalExited:     zone ? zone.totalExited     : 0,
    currentStrength: zone ? zone.currentOccupancy : 0,
    capacity:        zone ? zone.capacity         : 0,
    densityStatus:   zone ? zone.densityStatus    : 'Low',
    activeAlerts
  });
});

// Helper Functions
function updateZoneDensity(zone) {
  const ratio = zone.currentOccupancy / zone.capacity;
  if (ratio >= 0.95) {
    zone.densityStatus = 'Critical';
    zone.colorCode = 'red';
  } else if (ratio >= 0.75) {
    zone.densityStatus = 'High';
    zone.colorCode = 'orange'; // or yellow
  } else if (ratio >= 0.5) {
    zone.densityStatus = 'Medium';
    zone.colorCode = 'yellow';
  } else {
    zone.densityStatus = 'Low';
    zone.colorCode = 'green';
  }
}

async function checkThreshold(zone, io) {
  if (zone.densityStatus === 'Critical' || zone.densityStatus === 'High') {
    const recent = await Alert.findOne({ zoneId: zone._id, status: 'Active' });
    if (!recent) {
      const alert = new Alert({
        zoneId: zone._id,
        message: `${zone.densityStatus} crowd density — ${zone.currentOccupancy} people inside`,
        severity: zone.densityStatus === 'Critical' ? 'Critical' : 'High'
      });
      await alert.save();
      const populated = await Alert.findById(alert._id).populate('zoneId');
      io.emit('new-alert', populated);
    }
  }
}

module.exports = router;
