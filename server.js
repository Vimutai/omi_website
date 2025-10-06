// =========================
// BESTIE SERVER - Optimized for Railway
// =========================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// ===== ENVIRONMENT VARIABLES =====
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const webhookUrl = process.env.WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbydzRV0e-FgFj30vMq-0ZgrcHaAeL0JUCkl7Ssn4WqwMjPlFku-3RJSs9c5LnjXOR_zyQ/exec';
const PUBLIC_URL = process.env.PUBLIC_URL || `https://omi_website.up.railway.app`;

// ===== EXPRESS APP SETUP =====
const app = express();

// Security & performance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: [
    'https://bestie.co.ke',
    'http://bestie.co.ke',
    'https://www.bestie.co.ke',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    PUBLIC_URL
  ],
  credentials: true
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: NODE_ENV === 'production' ? 200 : 100,
  message: { error: 'Too many requests. Try again later.', retryAfter: 900 },
  standardHeaders: true,
  legacyHeaders: false
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static files
const staticOptions = { maxAge: NODE_ENV === 'production' ? '1d' : 0, etag: true, lastModified: true };
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/styles', express.static(path.join(__dirname, 'styles'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'js'), staticOptions));
app.use('/images', express.static(path.join(__dirname, 'images'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));

// Request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url} - IP: ${req.ip} - UA: ${req.get('User-Agent')?.substring(0,50)}...`);
  next();
});

// ===== EMAIL SETUP =====
let transporter;
if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true', // false for 587
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false }
  });

  transporter.verify((error, success) => {
    if (error) console.error('❌ Email transporter error:', error);
    else console.log('✅ Email transporter ready');
  });
} else {
  console.warn('⚠️ Email disabled - missing EMAIL_USER or EMAIL_PASS');
}

// ===== ROUTES =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: NODE_ENV,
    emailConfigured: !!transporter
  });
});

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/tickets.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tickets.html')));

// Test
app.get('/test', (req, res) => res.json({ message: 'Server works!', environment: NODE_ENV, emailConfigured: !!transporter }));

// Test email
app.get('/test-email', async (req, res) => {
  if (!transporter) return res.status(503).json({ success: false, error: 'Email not configured' });

  try {
    const info = await transporter.sendMail({
      from: `"BESTIE" <${emailUser}>`,
      to: emailUser,
      subject: 'Test Email from BESTIE Server',
      html: `<p>Test email sent from BESTIE server at ${new Date().toISOString()}</p>`
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Debug Booking
app.get('/debug-booking', async (req, res) => {
  const testData = { type:'booking', program:'Debug', firstName:'Debug', lastName:'User', email:'debug@test.com', date:new Date().toISOString().split('T')[0], participants:1, phone:'+254712345678', specialRequirements:'Debug test', timestamp:new Date().toISOString(), source:'bestie.co.ke' };
  try {
    const response = await fetch(webhookUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(testData) });
    const responseText = await response.text();
    res.json({ success: response.ok, status: response.status, response: responseText });
  } catch(err) {
    res.status(500).json({ success:false, error: err.message });
  }
});

// Debug Contact
app.get('/debug-contact', async (req, res) => {
  const testData = { type:'contact', name:'Debug Contact', email:'contact@test.com', subject:'Debug', message:'Debug message', timestamp:new Date().toISOString(), source:'bestie.co.ke' };
  try {
    const response = await fetch(webhookUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(testData) });
    const responseText = await response.text();
    res.json({ success: response.ok, status: response.status, response: responseText });
  } catch(err) {
    res.status(500).json({ success:false, error: err.message });
  }
});

// Contact endpoint
app.post('/api/contact', async (req,res) => {
  const contactId = `contact_${Date.now()}`;
  try {
    const { name, email, subject, message } = req.body;
    if (!name||!email||!subject||!message) return res.status(400).json({ success:false, error:'Missing fields' });

    const sheetsData = { type:'contact', name, email, subject, message, timestamp:new Date().toISOString(), contactId, source:'bestie.co.ke' };
    
    const promises = [fetch(webhookUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sheetsData) })];

    if (transporter) {
      promises.push(transporter.sendMail({ from:`BESTIE <${emailUser}>`, to:emailUser, replyTo:email, subject:`Contact Form: ${name}`, text:JSON.stringify(sheetsData,null,2) }));
    }

    await Promise.allSettled(promises);
    res.json({ success:true, contactId });
  } catch(err) { res.status(500).json({ success:false, error: err.message, contactId }); }
});

// Booking endpoint
app.post('/book', async (req,res) => {
  const bookingId = `book_${Date.now()}`;
  try {
    const { program, date, participants, firstName, lastName, email, phone, specialRequirements } = req.body;
    if (!program || !date || !firstName || !lastName || !email) return res.status(400).json({ success:false, error:'Missing required fields' });

    const sheetsData = { type:'booking', program, date, participants:Number(participants)||1, firstName, lastName, email, phone:phone||'Not provided', specialRequirements:specialRequirements||'None', timestamp:new Date().toISOString(), bookingId, source:'bestie.co.ke' };

    const promises = [fetch(webhookUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(sheetsData) })];

    if (transporter) {
      promises.push(transporter.sendMail({ from:`BESTIE <${emailUser}>`, to:emailUser, replyTo:email, subject:`Booking Request: ${program}`, text:JSON.stringify(sheetsData,null,2) }));
    }

    await Promise.allSettled(promises);
    res.json({ success:true, bookingId });
  } catch(err) { res.status(500).json({ success:false, error: err.message, bookingId }); }
});

// Check Web App URL
app.get('/check-url', async (req,res) => {
  try {
    const response = await fetch(webhookUrl);
    res.json({ success: response.ok, status: response.status });
  } catch(err) { res.status(500).json({ success:false, error: err.message }); }
});

// 404 handler
app.use('*', (req,res) => res.status(404).json({ success:false, error:'Route not found', path:req.originalUrl }));

// Global error handler
app.use((err, req,res,next) => res.status(500).json({ success:false, error:'Internal server error', details:err.message }));

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 BESTIE Server running in ${NODE_ENV} mode
📍 Port: ${PORT}
🌐 Public URL: ${PUBLIC_URL}
📧 Email: ${emailUser || 'Not configured'}
✅ Health: ${PUBLIC_URL}/health
📊 Test: ${PUBLIC_URL}/test
📧 Test email: ${PUBLIC_URL}/test-email
🧪 Booking test: ${PUBLIC_URL}/debug-booking
📧 Contact test: ${PUBLIC_URL}/debug-contact
🔗 URL check: ${PUBLIC_URL}/check-url
📨 Contacts API: POST ${PUBLIC_URL}/api/contact
📅 Bookings API: POST ${PUBLIC_URL}/book
  `);
});
