require('dotenv').config();
const express = require('express');
const http = require('http');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const app = express();

// Database and route imports
const db = require('./models/db');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const walletRoutes = require('./routes/walletRoutes');
const profileRoutes = require('./routes/profileRoutes');

if(process.env.LOCAL_WSS==1) {
  const createWebSocketServer = require('./helper/backend/src/services/wsServer');
  createWebSocketServer.createWebSocketServer(8080);
}
// Initialize session store
const sessionStore = new MySQLStore({}, db);

// WebSocket setup

// Passport configuration
require('./config/passport');
//const webSocket = require("./helper/exchange/index.js");

// Middleware setup
app.use(cookieParser());

// Session configuration (MUST come before passport and csrf)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));
 
// Passport initialization (after session)
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection (after session and passport)
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Make CSRF token available to views
app.use((req, res, next) => {
  res.locals._csrf = req.csrfToken();
  next();
});

// Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));

// Flash messages
app.use(flash());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// XSRF-TOKEN for AJAX requests
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});

// Global user variable
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});
/*
app.use((req, res, next) => {
  console.log('--- CSRF DEBUG ---');
  console.log('Session ID:', req.sessionID);
  console.log('CSRF Token:', req.csrfToken());
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);
  next();
});

// Debug middleware
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  next();
});
*/
// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/home.html'));
});

app.use('/', authRoutes);
app.use('/', walletRoutes);
app.use('/', profileRoutes);
app.use('/dashboard', dashboardRoutes);

// Google auth debug
app.use('/auth/google*', (req, res, next) => {
  console.log('Google auth route hit:', req.originalUrl);
  console.log('Session:', req.session);
  console.log('Query params:', req.query);
  next();
});

// Error handling
app.use((err, req, res, next) => {
  if (err.name === 'AuthenticationError') {
    return passport.handleError(err, req, res, next);
  }
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('Invalid CSRF token');
    return res.status(403).send('CSRF token validation failed');
  }
  next(err);
});

// Process error handlers
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// Test GET route to view token
app.get('/csrf-test', (req, res) => {
  res.json({
    token: req.csrfToken(),
    cookies: req.cookies
  });
});

// Test POST route to verify
app.post('/csrf-test', (req, res) => {
  res.json({ success: true });
});
app.use((req, res, next) => {
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error')
  };
  next();
});

// Server start
app.listen(process.env.SERVER_PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://127.0.0.1:${process.env.SERVER_PORT}`);
});
