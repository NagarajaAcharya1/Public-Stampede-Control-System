require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);

// =============================================
// ENHANCED CORS CONFIGURATION
// =============================================
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
};

// =============================================
// SOCKET.IO CONFIGURATION
// =============================================
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// =============================================
// MIDDLEWARE SETUP
// =============================================
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout and logging
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  const timestamp = new Date().toISOString();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${clientIP}`);
  
  next();
});

// Pass Socket.IO instance to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =============================================
// DATABASE MODELS
// =============================================
const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true, default: 15 },
  currentOccupancy: { type: Number, default: 0 },
  totalEntered: { type: Number, default: 0 },
  totalExited: { type: Number, default: 0 },
  densityStatus: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Low' 
  },
  colorCode: { 
    type: String, 
    enum: ['green', 'yellow', 'orange', 'red'], 
    default: 'green' 
  },
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
  message: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Resolved'], 
    default: 'Active' 
  },
  deviceId: String,
  resolvedAt: Date
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Admin', 'Operator'], 
    default: 'Operator' 
  }
}, { timestamps: true });

const Zone = mongoose.model('Zone', zoneSchema);
const Alert = mongoose.model('Alert', alertSchema);
const User = mongoose.model('User', userSchema);

// =============================================
// UTILITY FUNCTIONS
// =============================================
function calculateDensityStatus(occupancy, capacity) {
  const percentage = (occupancy / capacity) * 100;
  
  if (percentage < 50) return { status: 'Low', color: 'green' };
  if (percentage < 75) return { status: 'Medium', color: 'yellow' };
  if (percentage < 95) return { status: 'High', color: 'orange' };
  return { status: 'Critical', color: 'red' };
}

async function updateZoneStats(zone) {
  const density = calculateDensityStatus(zone.currentOccupancy, zone.capacity);
  
  zone.densityStatus = density.status;
  zone.colorCode = density.color;
  zone.lastActivity = new Date();
  
  await zone.save();
  
  // Create alert if density is high or critical
  if ((density.status === 'High' || density.status === 'Critical')) {
    const existingAlert = await Alert.findOne({
      zoneId: zone._id,
      status: 'Active',
      severity: density.status
    });
    
    if (!existingAlert) {
      const alert = new Alert({
        zoneId: zone._id,
        message: `${density.status} density detected in ${zone.name} (${zone.currentOccupancy}/${zone.capacity})`,
        severity: density.status
      });
      
      await alert.save();
      
      // Emit alert to all clients
      io.emit('new-alert', {
        ...alert.toObject(),
        zone: zone.name
      });
    }
  }
  
  return zone;
}

// =============================================
// API ROUTES
// =============================================

// Health check
app.get('/', (req, res) => {
  const uptime = process.uptime();
  res.json({
    message: 'CrowdPulse Backend - Professional IoT System',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    version: '2.0.0',
    endpoints: {
      stats: '/api/stats',
      iot_entry: '/api/iot/entry',
      iot_exit: '/api/iot/exit',
      dashboard: '/api/dashboard'
    }
  });
});

// IoT Entry endpoint (ESP32)
app.post('/api/iot/entry', async (req, res) => {
  try {
    const { count = 1, deviceId } = req.body;
    
    let zone = await Zone.findOne({ name: 'Entry' });
    if (!zone) {
      zone = new Zone({ name: 'Entry', capacity: 15 });
    }
    
    zone.totalEntered += count;
    zone.currentOccupancy = Math.max(0, zone.totalEntered - zone.totalExited);
    
    await updateZoneStats(zone);
    
    // Real-time update to all clients
    io.emit('zone-update', {
      zone: zone.toObject(),
      event: 'entry',
      timestamp: new Date().toISOString(),
      deviceId
    });
    
    console.log(`👤 ENTRY: Count=${zone.currentOccupancy}, Total=${zone.totalEntered}`);
    
    res.status(200).json({
      success: true,
      currentOccupancy: zone.currentOccupancy,
      totalEntered: zone.totalEntered,
      densityStatus: zone.densityStatus
    });
    
  } catch (error) {
    console.error('Entry endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IoT Exit endpoint (ESP32)
app.post('/api/iot/exit', async (req, res) => {
  try {
    const { count = 1, deviceId } = req.body;
    
    let zone = await Zone.findOne({ name: 'Entry' });
    if (!zone) {
      zone = new Zone({ name: 'Entry', capacity: 15 });
    }
    
    zone.totalExited += count;
    zone.currentOccupancy = Math.max(0, zone.totalEntered - zone.totalExited);
    
    await updateZoneStats(zone);
    
    // Real-time update to all clients
    io.emit('zone-update', {
      zone: zone.toObject(),
      event: 'exit',
      timestamp: new Date().toISOString(),
      deviceId
    });
    
    console.log(`👤 EXIT: Count=${zone.currentOccupancy}, Total=${zone.totalExited}`);
    
    res.status(200).json({
      success: true,
      currentOccupancy: zone.currentOccupancy,
      totalExited: zone.totalExited,
      densityStatus: zone.densityStatus
    });
    
  } catch (error) {
    console.error('Exit endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const zone = await Zone.findOne({ name: 'Entry' });
    const activeAlerts = await Alert.countDocuments({ status: 'Active' });
    
    if (!zone) {
      return res.json({
        totalEntered: 0,
        totalExited: 0,
        currentStrength: 0,
        capacity: 15,
        densityStatus: 'Low',
        colorCode: 'green',
        activeAlerts: 0
      });
    }
    
    res.json({
      totalEntered: zone.totalEntered,
      totalExited: zone.totalExited,
      currentStrength: zone.currentOccupancy,
      capacity: zone.capacity,
      densityStatus: zone.densityStatus,
      colorCode: zone.colorCode,
      activeAlerts,
      lastActivity: zone.lastActivity
    });
    
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'crowdpulse_professional_iot_2024_secure_key',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role = 'Operator' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      password: hashedPassword,
      role
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const { currentUsername, newUsername, newPassword } = req.body;
    
    const user = await User.findOne({ username: currentUsername });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (newUsername) {
      const existingUser = await User.findOne({ username: newUsername });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      user.username = newUsername;
    }
    
    if (newPassword) {
      const bcrypt = require('bcrypt');
      user.password = await bcrypt.hash(newPassword, 10);
    }
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/analytics', async (req, res) => {
  try {
    const zone = await Zone.findOne({ name: 'Entry' });
    const totalAlerts = await Alert.countDocuments();
    const resolvedAlerts = await Alert.countDocuments({ status: 'Resolved' });
    const activeAlerts = await Alert.countDocuments({ status: 'Active' });
    
    if (!zone) {
      return res.json({
        totalEntered: 0,
        totalExited: 0,
        currentOccupancy: 0,
        capacity: 15,
        densityStatus: 'Low',
        colorCode: 'green',
        totalAlerts: 0,
        resolvedAlerts: 0,
        activeAlerts: 0,
        alertResolutionRate: 0
      });
    }
    
    const alertResolutionRate = totalAlerts > 0 ? Math.round((resolvedAlerts / totalAlerts) * 100) : 0;
    
    res.json({
      totalEntered: zone.totalEntered,
      totalExited: zone.totalExited,
      currentOccupancy: zone.currentOccupancy,
      capacity: zone.capacity,
      densityStatus: zone.densityStatus,
      colorCode: zone.colorCode,
      totalAlerts,
      resolvedAlerts,
      activeAlerts,
      alertResolutionRate,
      lastActivity: zone.lastActivity
    });
    
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/zones', async (req, res) => {
  try {
    const zones = await Zone.find().sort({ createdAt: -1 });
    res.json(zones);
  } catch (error) {
    console.error('Zones endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('zoneId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(alerts);
  } catch (error) {
    console.error('Alerts endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve alert
app.patch('/api/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'Resolved',
        resolvedAt: new Date()
      },
      { new: true }
    ).populate('zoneId', 'name');
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    // Emit to all clients
    io.emit('alert-resolved', alert);
    
    res.json(alert);
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear all alerts
app.delete('/api/alerts', async (req, res) => {
  try {
    await Alert.updateMany(
      { status: 'Active' },
      { 
        status: 'Resolved',
        resolvedAt: new Date()
      }
    );
    
    io.emit('alerts-cleared');
    
    res.json({ message: 'All alerts cleared' });
  } catch (error) {
    console.error('Clear alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset system
app.post('/api/system/reset', async (req, res) => {
  try {
    // Reset zone counters
    await Zone.updateMany({}, {
      currentOccupancy: 0,
      totalEntered: 0,
      totalExited: 0,
      densityStatus: 'Low',
      colorCode: 'green'
    });
    
    // Clear active alerts
    await Alert.updateMany(
      { status: 'Active' },
      { 
        status: 'Resolved',
        resolvedAt: new Date()
      }
    );
    
    // Emit reset event
    io.emit('system-reset');
    
    console.log('🔄 System reset completed');
    res.json({ message: 'System reset successfully' });
  } catch (error) {
    console.error('System reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// ERROR HANDLING
// =============================================
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /api/stats',
      'POST /api/iot/entry',
      'POST /api/iot/exit',
      'GET /api/zones',
      'GET /api/alerts'
    ]
  });
});

// =============================================
// SOCKET.IO CONNECTION HANDLING
// =============================================
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] Client connected: ${socket.id} from ${clientIP}`);
  
  // Send current stats on connection
  socket.emit('connection-established', {
    message: 'Connected to CrowdPulse real-time system',
    timestamp,
    socketId: socket.id
  });
  
  // Send current zone data
  Zone.findOne({ name: 'Entry' }).then(zone => {
    if (zone) {
      socket.emit('zone-update', {
        zone: zone.toObject(),
        event: 'initial',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id} - ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error ${socket.id}:`, error);
  });
});

// =============================================
// DATABASE CONNECTION
// =============================================
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    console.log('[DB] Starting in-memory MongoDB...');
    
    const mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'crowdpulse'
      }
    });
    
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('[DB] MongoDB connected successfully');
    
    await seedDatabase();
    
  } catch (err) {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Clear and create entry zone
    await Zone.deleteMany({});
    const entryZone = await Zone.create({
      name: 'Entry',
      capacity: 15,
      currentOccupancy: 0,
      totalEntered: 0,
      totalExited: 0,
      densityStatus: 'Low',
      colorCode: 'green'
    });
    
    console.log('[DB] Entry zone created with capacity:', entryZone.capacity);
    
    // Create admin user if needed
    const bcrypt = require('bcrypt');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const hashed = await bcrypt.hash('password', 10);
      await User.create({
        username: 'admin',
        password: hashed,
        role: 'Admin'
      });
      console.log('[DB] Admin user created (admin/password)');
    }
    
    console.log('[DB] Database seeding completed');
    
  } catch (err) {
    console.error('[DB] Seeding error:', err);
  }
};

// =============================================
// NETWORK UTILITIES
// =============================================
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// =============================================
// GRACEFUL SHUTDOWN
// =============================================
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[SERVER] Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('[SERVER] Process terminated');
    process.exit(0);
  });
});

// =============================================
// SERVER STARTUP
// =============================================
const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5000;
  const HOST = '0.0.0.0';
  
  server.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    const timestamp = new Date().toISOString();
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 CROWDPULSE BACKEND - PROFESSIONAL IoT SYSTEM');
    console.log('='.repeat(70));
    console.log(`📅 Started: ${timestamp}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`📱 Network: http://${localIP}:${PORT}`);
    console.log(`🔗 Health: http://${localIP}:${PORT}/`);
    console.log(`📊 Stats: http://${localIP}:${PORT}/api/stats`);
    console.log(`🤖 ESP32 Entry: POST http://${localIP}:${PORT}/api/iot/entry`);
    console.log(`🤖 ESP32 Exit: POST http://${localIP}:${PORT}/api/iot/exit`);
    console.log('='.repeat(70));
    console.log('✅ Multi-device support enabled');
    console.log('✅ Real-time WebSocket updates active');
    console.log('✅ ESP32 auto-discovery compatible');
    console.log('✅ Professional IoT monitoring ready');
    console.log('='.repeat(70) + '\n');
  });
};

// Initialize
startServer().catch(err => {
  console.error('[SERVER] Startup failed:', err);
  process.exit(1);
});

module.exports = { app, server, io };