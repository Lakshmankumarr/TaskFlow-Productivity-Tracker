/* ===================================
   TASKFLOW BACKEND SERVER
   Authentication API with SQLite Database
=================================== */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

/* ===================================
   MIDDLEWARE
=================================== */

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

/* ===================================
   DATABASE SETUP
=================================== */

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'taskflow.db');

// Create data directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Users table error:', err);
        else console.log('✅ Users table ready');
    });

    // Tasks table
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Tasks table error:', err);
        else console.log('✅ Tasks table ready');
    });

    // Refresh tokens table
    db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Refresh tokens table error:', err);
        else console.log('✅ Refresh tokens table ready');
    });
});

/* ===================================
   IMPORT ROUTES
=================================== */

const authRoutes = require('./routes/auth-routes');
const taskRoutes = require('./routes/task-routes');

/* ===================================
   API ROUTES
=================================== */

app.use('/api/auth', authRoutes(db));
app.use('/api/tasks', taskRoutes(db));

/* ===================================
   HEALTH CHECK
=================================== */

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'TaskFlow server is running',
        timestamp: new Date().toISOString()
    });
});

/* ===================================
   ERROR HANDLING
=================================== */

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

/* ===================================
   START SERVER
=================================== */

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════╗
    ║    🚀 TaskFlow Server Running      ║
    ║    Port: ${PORT}                      ║
    ║    Environment: ${process.env.NODE_ENV || 'development'}        ║
    ║    Database: SQLite               ║
    ╚════════════════════════════════════╝
    `);
});

/* ===================================
   GRACEFUL SHUTDOWN
=================================== */

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Database close error:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

module.exports = app;
