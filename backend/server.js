const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load env vars first
dotenv.config();

// Connect to database
connectDB();

// Initialize Socket.IO
const http = require('http');
const socketIo = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attedanceRoutes');
const workerRoutes = require('./routes/workerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const advanceRoutes = require('./routes/advanceRoutes');
const salaryReportRoutes = require('./routes/salaryReportRoutes');

// Job routes
const jobRoutes = require('./routes/jobRoutes');

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'https://tvtasks.netlify.app',
      'https://ciphergate.sharurecreationclub.com' // Add your domain here
    ];
    const regex = /^http:\/\/.*\.localhost:3000$|^http:\/\/.*\.localhost:5173$/; // Allow subdomains of localhost

    if (!origin || allowedOrigins.includes(origin) || regex.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests globally
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/salary-report', salaryReportRoutes);

// Job routes
app.use('/api/jobs', jobRoutes);

// Route for checking API status
app.get('/', (req, res) => {
  res.json({ message: 'Task Tracker API is running' });
});

// Initialize schedulers and cron jobs
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULERS === 'true') {
  console.log('🚀 Starting production schedulers...');
  
  // Initialize other cron jobs if they exist
  const { startCronJobs } = require('./services/cronJobs');
  startCronJobs();
} else {
  console.log('⚠️ Schedulers disabled. Set NODE_ENV=production or ENABLE_SCHEDULERS=true to enable');
}

// Error handler (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5002;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: corsOptions
});

// Store connected clients by subdomain
const connectedClients = {};

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a room based on subdomain
  socket.on('join-subdomain', (subdomain) => {
    if (subdomain && subdomain !== 'main') {
      socket.join(`subdomain-${subdomain}`);
      console.log(`Client ${socket.id} joined subdomain room: ${subdomain}`);
      
      // Track connected clients by subdomain
      if (!connectedClients[subdomain]) {
        connectedClients[subdomain] = [];
      }
      connectedClients[subdomain].push(socket.id);
    }
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove client from tracking
    for (const subdomain in connectedClients) {
      const index = connectedClients[subdomain].indexOf(socket.id);
      if (index !== -1) {
        connectedClients[subdomain].splice(index, 1);
        break;
      }
    }
  });
});

// Export io instance for use in other modules
module.exports = { app, server, io };

// Listen on the specified port
server.listen(PORT, () => {
  console.log(`🌟 Server running on port ${PORT}`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️ Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);
});
