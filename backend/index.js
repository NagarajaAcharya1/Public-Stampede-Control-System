require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', apiRoutes);

// Socket connection
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Database connection
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('In-Memory MongoDB connected successfully');
    
    // Seed some initial data if empty (for testing)
    const seedData = async () => {
      const Zone = require('./models/Zone');
      const User = require('./models/User');
      const bcrypt = require('bcrypt');

      // Clear all existing zone data and reset with only Entry zone (single source of truth)
      await Zone.deleteMany({});
      await Zone.insertMany([
        { name: 'Entry', capacity: 15 }
      ]);
      console.log('Zones reset: Entry zone only.');

      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const hashed = await bcrypt.hash('password', 10);
        await User.create({ username: 'admin', password: hashed, role: 'Admin' });
        console.log('Database seeded with admin user.');
      }
    };
    await seedData();
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};
connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (accessible on local network)`);
});
