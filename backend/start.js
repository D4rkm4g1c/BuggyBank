const fs = require('fs');
const path = require('path');

// Initialize database and seed data on startup
console.log('🏦 Starting BuggyBank...');

// Ensure required directories exist
const dirs = ['logs', 'uploads'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Initialize database
console.log('📊 Initializing database...');
require('./database/init');

// Wait a moment then seed
setTimeout(() => {
  console.log('🌱 Seeding database...');
  require('./database/seed');
  
  setTimeout(() => {
    console.log('🚀 Starting server...');
    require('./server');
  }, 1000);
}, 1000); 