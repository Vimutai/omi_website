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

// Initialize Express app
const app = express();

// ===== SECURITY & PERFORMANCE CONFIGURATION =====
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

// CORS configuration
app.use(cors({
  origin: [
    'https://bestie.co.ke',
    'http://bestie.co.ke',
    'https://www.bestie.co.ke',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// Rate limiting - adjusted for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 100, // Higher limit for production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// ===== ENVIRONMENT VARIABLES WITH VALIDATION =====
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const webhookUrl = process.env.WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbydzRV0e-FgFj30vMq-0ZgrcHaAeL0JUCkl7Ssn4WqwMjPlFku-3RJSs9c5LnjXOR_zyQ/exec';
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!emailUser || !emailPass) {
  console.warn('⚠️  EMAIL_USER or EMAIL_PASS environment variables not set.');
  console.log('💡 Please set these in your Hostinger control panel:');
  console.log('   - EMAIL_USER=info@bestie.co.ke');
  console.log('   - EMAIL_PASS=your_gmail_app_password');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== MIDDLEWARE SETUP =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving with cache control
const staticOptions = {
  maxAge: NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/styles', express.static(path.join(__dirname, 'styles'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'js'), staticOptions));
app.use('/images', express.static(path.join(__dirname, 'images'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, 'assets'), staticOptions));

// Request logger with more details
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')?.substring(0, 50)}...`);
  next();
});

// ===== EMAIL CONFIGURATION =====
let transporter;

try {
  if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    transporter.verify((error) => {
      if (error) {
        console.error('❌ Email transporter configuration error:', error);
      } else {
        console.log('✅ Email transporter is ready');
      }
    });
  } else {
    console.warn('⚠️ Email functionality disabled - missing environment variables');
  }
} catch (error) {
  console.error('❌ Email configuration failed:', error);
}


// ===== ROUTES =====

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: NODE_ENV,
    emailConfigured: !!(emailUser && emailPass)
  });
});

// Basic routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/tickets.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tickets.html'));
});

// Test route
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    domain: 'bestie.co.ke',
    emailConfigured: !!(emailUser && emailPass)
  });
});

// Test email route
app.get('/test-email', async (req, res) => {
  if (!transporter) {
    return res.status(503).json({ 
      success: false, 
      error: 'Email service not configured. Check EMAIL_USER and EMAIL_PASS environment variables.',
      instructions: 'Set EMAIL_USER=info@bestie.co.ke and EMAIL_PASS=your_app_password in Hostinger control panel'
    });
  }

  try {
    console.log('📧 Testing email configuration');
    
    const mailOptions = {
      from: `"BESTIE CO.KE" <${emailUser}>`,
      to: emailUser,
      subject: 'Test Email from BESTIE Server',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email - BESTIE Server</h2>
          <p>This is a test email sent from your BESTIE server.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Environment:</strong> ${NODE_ENV}</p>
            <p><strong>Domain:</strong> bestie.co.ke</p>
            <p><strong>Email User:</strong> ${emailUser}</p>
          </div>
          <p>If you receive this, email configuration is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">BESTIE Server - ${new Date().getFullYear()}</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully:', info.messageId);
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: info.messageId,
      environment: NODE_ENV
    });
  } catch (error) {
    console.error('❌ Email test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code,
      environment: NODE_ENV
    });
  }
});

// Debug route for booking
app.get('/debug-booking', async (req, res) => {
  console.log('🔍 Testing Booking Connection to Google Sheets');
  
  const testData = {
    type: 'booking',
    program: 'Debug Test Program',
    firstName: 'Debug',
    lastName: 'User', 
    email: 'debug@test.com',
    date: new Date().toISOString().split('T')[0],
    participants: 2,
    phone: '+254712345678',
    specialRequirements: 'Debug test from BESTIE server',
    timestamp: new Date().toISOString(),
    source: 'bestie.co.ke'
  };

  try {
    console.log('📤 Sending to Google Sheets:', JSON.stringify(testData, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'BESTIE-Server/1.0'
      },
      body: JSON.stringify(testData),
      redirect: 'follow',
      timeout: 10000
    });

    console.log('📊 Google Sheets Response Status:', response.status);
    console.log('📊 Google Sheets Response OK:', response.ok);
    
    const responseText = await response.text();
    console.log('📊 Google Sheets Response Body:', responseText);

    res.json({ 
      success: response.ok,
      status: response.status, 
      statusText: response.statusText,
      response: responseText, 
      dataSent: testData,
      environment: NODE_ENV
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      environment: NODE_ENV
    });
  }
});

// Debug route for contact
app.get('/debug-contact', async (req, res) => {
  console.log('🔍 Testing Contact Connection to Google Sheets');
  
  const testData = {
    type: 'contact',
    name: 'Debug Contact User',
    email: 'contact@test.com', 
    subject: 'Debug Subject from BESTIE',
    message: 'This is a test contact message from the BESTIE server debug endpoint.',
    timestamp: new Date().toISOString(),
    source: 'bestie.co.ke'
  };

  try {
    console.log('📤 Sending to Google Sheets:', JSON.stringify(testData, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'BESTIE-Server/1.0'
      },
      body: JSON.stringify(testData),
      redirect: 'follow',
      timeout: 10000
    });

    console.log('📊 Google Sheets Response Status:', response.status);
    const responseText = await response.text();
    console.log('📊 Google Sheets Response Body:', responseText);

    res.json({ 
      success: response.ok,
      status: response.status, 
      response: responseText, 
      dataSent: testData,
      environment: NODE_ENV
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      environment: NODE_ENV
    });
  }
});

// OPTIMIZED Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const startTime = Date.now();
  const contactId = `contact_${Date.now()}`;
  
  console.log(`📧 Contact form submitted [${contactId}]`);
  
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required: name, email, subject, message' 
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid email address' 
      });
    }

    const sheetsData = {
      type: 'contact',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      contactId: contactId,
      source: 'bestie.co.ke'
    };

    // PARALLEL PROCESSING - Send to Sheets and Email simultaneously
    const promises = [];

    // Google Sheets promise
    promises.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'BESTIE-Server/1.0'
        },
        body: JSON.stringify(sheetsData),
        redirect: 'follow',
        timeout: 10000
      })
      .then(response => response.text())
      .then(responseText => {
        console.log(`✅ Sheets updated for ${contactId}`);
        return { sheets: { success: true, response: responseText } };
      })
      .catch(error => {
        console.log(`⚠️ Sheets failed for ${contactId}:`, error.message);
        return { sheets: { success: false, error: error.message } };
      })
    );

    // Email promise (only if transporter is configured)
    if (transporter) {
      promises.push(
        transporter.sendMail({
          from: `"BESTIE" <${emailUser}>`,
          to: emailUser,
          replyTo: email,
          subject: `Contact Form: ${name}`,
          text: `
CONTACT FORM SUBMISSION

From: ${name}
Email: ${email}
Subject: ${subject}
Contact ID: ${contactId}

Message:
${message}

Received: ${new Date().toLocaleString()}
IP: ${req.ip}
          `
        })
        .then(info => {
          console.log(`✅ Email sent for ${contactId}:`, info.messageId);
          return { email: { success: true, messageId: info.messageId } };
        })
        .catch(error => {
          console.log(`⚠️ Email failed for ${contactId}:`, error.message);
          return { email: { success: false, error: error.message } };
        })
      );
    }

    const results = await Promise.allSettled(promises);
    const processingTime = Date.now() - startTime;

    console.log(`✅ Contact ${contactId} processed in ${processingTime}ms`);
    
    // Immediate response - don't wait for external services
    res.json({ 
      success: true, 
      contactId: contactId,
      processingTime: `${processingTime}ms`,
      message: 'Thank you for your message! We will get back to you soon.',
      timestamp: new Date().toISOString(),
      emailSent: !!transporter
    });

  } catch (err) {
    console.error(`❌ Contact error [${contactId}]:`, err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error processing your request',
      contactId: contactId
    });
  }
});

// OPTIMIZED Booking form endpoint
app.post('/book', async (req, res) => {
  const startTime = Date.now();
  const bookingId = `book_${Date.now()}`;
  
  console.log(`📅 Booking form submitted [${bookingId}]`);
  
  try {
    const { program, date, participants, firstName, lastName, email, phone, specialRequirements } = req.body;

    // Validation
    if (!program || !date || !firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: program, date, firstName, lastName, email' 
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid email address' 
      });
    }

    const participantsNum = Math.max(1, Number(participants) || 1);

    const sheetsData = {
      type: 'booking',
      program: program.trim(),
      date: date,
      participants: participantsNum,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || 'Not provided').trim(),
      specialRequirements: (specialRequirements || 'None').trim(),
      timestamp: new Date().toISOString(),
      bookingId: bookingId,
      source: 'bestie.co.ke'
    };

    // PARALLEL PROCESSING - Send to Sheets and Email simultaneously
    const promises = [];

    // Google Sheets promise
    promises.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'BESTIE-Server/1.0'
        },
        body: JSON.stringify(sheetsData),
        redirect: 'follow',
        timeout: 10000
      })
      .then(response => response.text())
      .then(responseText => {
        console.log(`✅ Sheets updated for ${bookingId}`);
        return { sheets: { success: true, response: responseText } };
      })
      .catch(error => {
        console.log(`⚠️ Sheets failed for ${bookingId}:`, error.message);
        return { sheets: { success: false, error: error.message } };
      })
    );

    // Email promise (only if transporter is configured)
    if (transporter) {
      promises.push(
        transporter.sendMail({
          from: `"BESTIE" <${emailUser}>`,
          to: emailUser,
          replyTo: email,
          subject: `Booking Request: ${program}`,
          text: `
BOOKING REQUEST

Booking ID: ${bookingId}
Program: ${program}
Date: ${new Date(date).toLocaleDateString()}
Participants: ${participantsNum}

Client Information:
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone || 'Not provided'}

${specialRequirements && specialRequirements !== 'None' ? `
Special Requirements:
${specialRequirements}
` : ''}

Received: ${new Date().toLocaleString()}
IP: ${req.ip}
          `
        })
        .then(info => {
          console.log(`✅ Booking email sent for ${bookingId}:`, info.messageId);
          return { email: { success: true, messageId: info.messageId } };
        })
        .catch(error => {
          console.log(`⚠️ Booking email failed for ${bookingId}:`, error.message);
          return { email: { success: false, error: error.message } };
        })
      );
    }

    const results = await Promise.allSettled(promises);
    const processingTime = Date.now() - startTime;

    console.log(`✅ Booking ${bookingId} processed in ${processingTime}ms`);
    
    // Immediate response
    res.json({ 
      success: true, 
      bookingId: bookingId,
      processingTime: `${processingTime}ms`,
      message: 'Booking received successfully! We will confirm your reservation shortly.',
      timestamp: new Date().toISOString(),
      details: {
        program: program,
        date: date,
        participants: participantsNum,
        name: `${firstName} ${lastName}`
      },
      emailSent: !!transporter
    });

  } catch (err) {
    console.error(`❌ Booking error [${bookingId}]:`, err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error processing your booking',
      bookingId: bookingId
    });
  }
});

// Check if Web App URL is accessible
app.get('/check-url', async (req, res) => {
  try {
    console.log('🔍 Checking Web App URL accessibility');
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      redirect: 'follow',
      timeout: 10000
    });

    console.log('📊 URL Check Status:', response.status);
    console.log('📊 URL Check OK:', response.ok);
    
    const responseText = await response.text();
    console.log('📊 URL Check Response (first 200 chars):', responseText.substring(0, 200));

    res.json({
      success: response.ok,
      status: response.status,
      accessible: response.ok,
      message: 'Web App URL check completed',
      environment: NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ URL check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      environment: NODE_ENV 
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Global error handler:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 BESTIE Server running in ${NODE_ENV} mode
📍 Port: ${PORT}
🌐 Domain: bestie.co.ke
📧 Email: ${emailUser || 'Not configured'}
✅ Health: http://localhost:${PORT}/health
📊 Test: http://localhost:${PORT}/test
📧 Test email: http://localhost:${PORT}/test-email
🧪 Booking test: http://localhost:${PORT}/debug-booking
📧 Contact test: http://localhost:${PORT}/debug-contact
🔗 URL check: http://localhost:${PORT}/check-url
📨 Contacts API: POST http://localhost:${PORT}/api/contact
📅 Bookings API: POST http://localhost:${PORT}/book
  `);
  
  // Show configuration status
  if (!emailUser || !emailPass) {
    console.log('\n⚠️  EMAIL NOT CONFIGURED:');
    console.log('   Set these environment variables in Hostinger:');
    console.log('   - EMAIL_USER=info@bestie.co.ke');
    console.log('   - EMAIL_PASS=your_gmail_app_password');
  } else {
    console.log('✅ Email service: CONFIGURED');
  }
});

console.log('✅ BESTIE Server setup complete!');