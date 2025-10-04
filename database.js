// database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bookings.db');

// Create tables if they don’t exist
db.serialize(() => {
  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program TEXT,
      date TEXT,
      participants INTEGER,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      phone TEXT,
      specialRequirements TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Contacts table
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
