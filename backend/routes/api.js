const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Zone = require('../models/Zone');
const Alert = require('../models/Alert');
const MissingPerson = require('../models/MissingPerson');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Logging helper
const logEvent = (type, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [DATA]`, JSON.stringify(data, null, 2));
  }
};

// Request validation middleware
const validateRequest = (requiredFields = []) => {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
        received: Object.keys(req.body)
      });
    }
    next();
  };
};

// Enhanced error handler
const handleError = (res, error, context = 'Operation') => {
  logEvent('ERROR', `${context} failed: ${error.message}`, { error: error.stack });
  res.status(500).json({
    error: `${context} failed`,
    message: error.message,
    timestamp: new Date().toISOString()
  });
};

// ============================================================================
// DASHBOARD ROUTE - REQUIRED
// ============================================================================
router.get('/dashboard', async (req, res) => {
  try {
    const zone = await Zone.findOne({ name: 'Entry' });
    const activeAlerts = await Alert.countDocuments({ status: 'Active' });
    const totalAlerts = await Alert.countDocuments();
    const recentAlerts = await Alert.find()
      .populate('zoneId')
      .sort({ createdAt: -1 })
      .limit(10);

    const dashboardData = {
      status: 'active',
      timestamp: new Date().toISOString(),
      occupancy: {
        totalEntered: zone?.totalEntered || 0,
        totalExited: zone?.totalExited || 0,
        currentStrength: zone?.currentOccupancy || 0,
        capacity: zone?.capacity || 15,
        densityStatus: zone?.densityStatus || 'Low',
        percentage: zone ? Math.round((zone.currentOccupancy / zone.capacity) * 100) : 0
      },
      alerts: {
        active: activeAlerts,
        total: totalAlerts,
        recent: recentAlerts
      },
      system: {
        uptime: process.uptime(),
        connectedClients: req.io ? req.io.engine.clientsCount : 0
      }
    };

    logEvent('DASHBOARD', 'Dashboard data requested', {
      currentStrength: dashboardData.occupancy.currentStrength,
      activeAlerts: dashboardData.alerts.active,
      clientIP: req.ip
    });

    res.json(dashboardData);
  } catch (err) {
    handleError(res, err, 'Dashboard data fetch');
  }
});

// ============================================================================
// ESP32 IOT ROUTES - ENHANCED WITH LOGGING
// ============================================================================

// ESP32 Entry Detection
router.post('/iot/entry', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { count } = req.body;
    const entryCount = count || 1;
    
    let zone = await Zone.findOne({ name: 'Entry' });
    if (!zone) {
      logEvent('ERROR', 'Entry zone not found in database');
      return res.status(404).json({ 
        error: 'Entry zone not found',
        message: 'Database may not be properly initialized'
      });
    }

    // Update zone data
    const previousOccupancy = zone.currentOccupancy;
    zone.currentOccupancy += entryCount;
    zone.totalEntered = (zone.totalEntered || 0) + entryCount;
    
    // Update density status
    updateZoneDensity(zone);
    await zone.save();

    // Check for alerts
    await checkThreshold(zone, req.io);

    // Emit real-time update
    if (req.io) {
      req.io.emit('zone-update', zone);
      logEvent('SOCKET', 'Zone update broadcasted to all clients');
    }

    const processingTime = Date.now() - startTime;
    
    logEvent('ENTRY', `Person entered - Count: ${entryCount}`, {
      previousOccupancy,
      newOccupancy: zone.currentOccupancy,
      totalEntered: zone.totalEntered,
      densityStatus: zone.densityStatus,
      processingTime: `${processingTime}ms`,
      clientIP: req.ip
    });

    res.json({
      success: true,
      message: 'Entry recorded successfully',
      data: {
        currentOccupancy: zone.currentOccupancy,
        totalEntered: zone.totalEntered,
        densityStatus: zone.densityStatus,
        capacity: zone.capacity,
        percentage: Math.round((zone.currentOccupancy / zone.capacity) * 100)
      },
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`
    });

  } catch (err) {
    logEvent('ERROR', 'Entry processing failed', { 
      error: err.message, 
      requestBody: req.body,
      clientIP: req.ip
    });
    handleError(res, err, 'Entry processing');
  }
});

// ESP32 Exit Detection
router.post('/iot/exit', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { count } = req.body;
    const exitCount = count || 1;
    
    let zone = await Zone.findOne({ name: 'Entry' });
    if (!zone) {
      logEvent('ERROR', 'Entry zone not found in database');
      return res.status(404).json({ 
        error: 'Entry zone not found',
        message: 'Database may not be properly initialized'
      });
    }

    // Update zone data
    const previousOccupancy = zone.currentOccupancy;
    zone.currentOccupancy = Math.max(0, zone.currentOccupancy - exitCount);
    zone.totalExited = (zone.totalExited || 0) + exitCount;
    
    // Update density status
    updateZoneDensity(zone);
    await zone.save();

    // Emit real-time update
    if (req.io) {
      req.io.emit('zone-update', zone);
      logEvent('SOCKET', 'Zone update broadcasted to all clients');
    }

    const processingTime = Date.now() - startTime;
    
    logEvent('EXIT', `Person exited - Count: ${exitCount}`, {
      previousOccupancy,
      newOccupancy: zone.currentOccupancy,
      totalExited: zone.totalExited,
      densityStatus: zone.densityStatus,
      processingTime: `${processingTime}ms`,
      clientIP: req.ip
    });

    res.json({
      success: true,
      message: 'Exit recorded successfully',
      data: {
        currentOccupancy: zone.currentOccupancy,
        totalExited: zone.totalExited,
        densityStatus: zone.densityStatus,
        capacity: zone.capacity,
        percentage: Math.round((zone.currentOccupancy / zone.capacity) * 100)
      },
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}ms`
    });

  } catch (err) {
    logEvent('ERROR', 'Exit processing failed', { 
      error: err.message, 
      requestBody: req.body,
      clientIP: req.ip
    });
    handleError(res, err, 'Exit processing');
  }
});

// ============================================================================
// DASHBOARD STATS - ENHANCED
// ============================================================================
router.get('/stats', async (req, res) => {
  try {
    const zone = await Zone.findOne({ name: 'Entry' });
    const activeAlerts = await Alert.countDocuments({ status: 'Active' });
    
    const stats = {
      totalEntered: zone?.totalEntered || 0,
      totalExited: zone?.totalExited || 0,
      currentStrength: zone?.currentOccupancy || 0,
      capacity: zone?.capacity || 15,
      densityStatus: zone?.densityStatus || 'Low',
      activeAlerts,
      timestamp: new Date().toISOString(),
      percentage: zone ? Math.round((zone.currentOccupancy / zone.capacity) * 100) : 0
    };

    logEvent('STATS', 'Stats requested', {
      currentStrength: stats.currentStrength,
      activeAlerts: stats.activeAlerts,
      clientIP: req.ip
    });

    res.json(stats);
  } catch (err) {
    handleError(res, err, 'Stats fetch');
  }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================
router.post('/auth/login', validateRequest(['username', 'password']), async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      logEvent('AUTH', `Login failed - User not found: ${username}`, { clientIP: req.ip });
      return res.status(404).json({ message: 'User not found' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logEvent('AUTH', `Login failed - Invalid password: ${username}`, { clientIP: req.ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback-secret', 
      { expiresIn: '1d' }
    );
    
    logEvent('AUTH', `Login successful: ${username}`, { role: user.role, clientIP: req.ip });
    
    res.json({ 
      token, 
      user: { username: user.username, role: user.role },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    handleError(res, err, 'Login');
  }
});

router.post('/auth/register', validateRequest(['username', 'password']), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, role: role || 'Operator' });
    await user.save();
    
    logEvent('AUTH', `User registered: ${username}`, { role: user.role, clientIP: req.ip });
    res.json({ message: 'User created successfully', timestamp: new Date().toISOString() });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    handleError(res, err, 'Registration');
  }
});

// ============================================================================
// ZONE MANAGEMENT
// ============================================================================
router.get('/zones', async (req, res) => {
  try {
    const zones = await Zone.find();
    logEvent('ZONES', 'Zones list requested', { count: zones.length, clientIP: req.ip });
    res.json(zones);
  } catch (err) {
    handleError(res, err, 'Zones fetch');
  }
});

// ============================================================================
// ALERTS MANAGEMENT
// ============================================================================
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('zoneId')
      .sort({ createdAt: -1 })
      .limit(50);
    
    logEvent('ALERTS', 'Alerts requested', { count: alerts.length, clientIP: req.ip });
    res.json(alerts);
  } catch (err) {
    handleError(res, err, 'Alerts fetch');
  }
});

router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id, 
      { status: 'Resolved' }, 
      { new: true }
    ).populate('zoneId');
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    
    if (req.io) {
      req.io.emit('alert-resolved', alert);
    }
    
    logEvent('ALERTS', `Alert resolved: ${req.params.id}`, { clientIP: req.ip });
    res.json(alert);
  } catch (err) {
    handleError(res, err, 'Alert resolution');
  }
});

router.delete('/alerts', async (req, res) => {
  try {
    const result = await Alert.deleteMany({});
    logEvent('ALERTS', `All alerts cleared - Count: ${result.deletedCount}`, { clientIP: req.ip });
    res.json({ message: 'All alerts cleared', deletedCount: result.deletedCount });
  } catch (err) {
    handleError(res, err, 'Alerts clear');
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================
router.get('/analytics', async (req, res) => {
  try {
    const zone = await Zone.findOne({ name: 'Entry' });
    const totalAlerts = await Alert.countDocuments();
    const resolvedAlerts = await Alert.countDocuments({ status: 'Resolved' });
    const missingCount = await MissingPerson.countDocuments({ status: 'Missing' });
    const foundCount = await MissingPerson.countDocuments({ status: 'Found' });
    
    const analytics = {
      totalEntered: zone?.totalEntered || 0,
      totalExited: zone?.totalExited || 0,
      currentOccupancy: zone?.currentOccupancy || 0,
      capacity: zone?.capacity || 15,
      densityStatus: zone?.densityStatus || 'Low',
      totalAlerts,
      resolvedAlerts,
      missingCount,
      foundCount,
      timestamp: new Date().toISOString()
    };
    
    logEvent('ANALYTICS', 'Analytics requested', { clientIP: req.ip });
    res.json(analytics);
  } catch (err) {
    handleError(res, err, 'Analytics fetch');
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function updateZoneDensity(zone) {
  const ratio = zone.currentOccupancy / zone.capacity;
  
  if (ratio >= 0.95) {
    zone.densityStatus = 'Critical';
    zone.colorCode = 'red';
  } else if (ratio >= 0.75) {
    zone.densityStatus = 'High';
    zone.colorCode = 'orange';
  } else if (ratio >= 0.5) {
    zone.densityStatus = 'Medium';
    zone.colorCode = 'yellow';
  } else {
    zone.densityStatus = 'Low';
    zone.colorCode = 'green';
  }
  
  logEvent('DENSITY', `Density updated: ${zone.densityStatus}`, {
    occupancy: zone.currentOccupancy,
    capacity: zone.capacity,
    ratio: Math.round(ratio * 100) + '%'
  });
}

async function checkThreshold(zone, io) {
  try {
    if (zone.densityStatus === 'Critical' || zone.densityStatus === 'High') {
      const recent = await Alert.findOne({ 
        zoneId: zone._id, 
        status: 'Active',
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });
      
      if (!recent) {
        const alert = new Alert({
          zoneId: zone._id,
          message: `${zone.densityStatus} crowd density — ${zone.currentOccupancy} people inside (${Math.round((zone.currentOccupancy / zone.capacity) * 100)}% capacity)`,
          severity: zone.densityStatus === 'Critical' ? 'Critical' : 'High'
        });
        
        await alert.save();
        const populated = await Alert.findById(alert._id).populate('zoneId');
        
        if (io) {
          io.emit('new-alert', populated);
        }
        
        logEvent('ALERT', `New ${zone.densityStatus} alert created`, {
          occupancy: zone.currentOccupancy,
          capacity: zone.capacity,
          alertId: alert._id
        });
      }
    }
  } catch (err) {
    logEvent('ERROR', 'Threshold check failed', { error: err.message });
  }
}

module.exports = router;