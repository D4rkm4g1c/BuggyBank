const mysql = require('mysql2');

// Test different connection configurations
const configs = [
  {
    name: 'No password',
    config: {
      host: 'localhost',
      user: 'root'
    }
  },
  {
    name: 'Null password',
    config: {
      host: 'localhost',
      user: 'root',
      password: null
    }
  },
  {
    name: 'Empty password',
    config: {
      host: 'localhost',
      user: 'root',
      password: ''
    }
  }
];

async function testConnection() {
  for (const config of configs) {
    console.log(`Testing: ${config.name}`);
    try {
      const connection = mysql.createConnection(config.config);
      await connection.promise().query('SELECT 1');
      console.log(`✅ ${config.name} - SUCCESS`);
      connection.end();
      return config.config; // Return the working config
    } catch (error) {
      console.log(`❌ ${config.name} - FAILED: ${error.message}`);
    }
  }
  return null;
}

testConnection().then(workingConfig => {
  if (workingConfig) {
    console.log('\nWorking configuration:');
    console.log(JSON.stringify(workingConfig, null, 2));
  } else {
    console.log('\nNo working configuration found');
  }
}); 