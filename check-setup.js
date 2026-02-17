#!/usr/bin/env node

/**
 * Setup Checker for Social Media Automation
 * Run this to verify your environment is configured correctly
 */

require('dotenv').config({ path: './backend/.env' });

const checks = [];

console.log('\n🔍 Checking Social Media Automation Setup...\n');
console.log('='.repeat(60));

// 1. Check Node.js version
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.split('.')[0].slice(1));
checks.push({
  name: 'Node.js Version',
  status: nodeMajor >= 18 ? 'PASS' : 'FAIL',
  message: nodeMajor >= 18
    ? `✅ ${nodeVersion} (>= 18 required)`
    : `❌ ${nodeVersion} (Need >= 18.0.0)`,
  critical: true
});

// 2. Check required environment variables
const requiredEnvVars = [
  { key: 'DATABASE_URL', critical: true },
  { key: 'JWT_SECRET', critical: true },
  { key: 'FRONTEND_URL', critical: true },
  { key: 'YOUTUBE_CLIENT_ID', critical: false, name: 'YouTube Client ID' },
  { key: 'YOUTUBE_CLIENT_SECRET', critical: false, name: 'YouTube Client Secret' },
  { key: 'FACEBOOK_APP_ID', critical: false, name: 'Facebook App ID' },
  { key: 'FACEBOOK_APP_SECRET', critical: false, name: 'Facebook App Secret' },
];

requiredEnvVars.forEach(({ key, critical, name }) => {
  const value = process.env[key];
  const isSet = value && value.trim() !== '';

  checks.push({
    name: name || key,
    status: isSet ? 'PASS' : (critical ? 'FAIL' : 'WARN'),
    message: isSet
      ? `✅ Set (${value.substring(0, 20)}...)`
      : (critical ? '❌ Not set (REQUIRED)' : '⚠️  Not set (OAuth won\'t work)'),
    critical: critical && !isSet
  });
});

// 3. Check redirect URIs are correct
const redirectURIs = [
  { key: 'YOUTUBE_REDIRECT_URI', expected: 'http://localhost:3000/api/oauth/youtube/callback' },
  { key: 'FACEBOOK_REDIRECT_URI', expected: 'http://localhost:3000/api/oauth/facebook/callback' },
];

redirectURIs.forEach(({ key, expected }) => {
  const value = process.env[key];
  const isCorrect = value === expected;

  checks.push({
    name: `${key}`,
    status: isCorrect ? 'PASS' : 'WARN',
    message: isCorrect
      ? '✅ Correct'
      : `⚠️  Expected: ${expected}\n     Got: ${value}`,
    critical: false
  });
});

// 4. Check if ports are available
const net = require('net');

function checkPort(port, name) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve({ port, name, available: false, inUse: true });
      } else {
        resolve({ port, name, available: false, error: err.message });
      }
    });

    server.once('listening', () => {
      server.close();
      resolve({ port, name, available: true });
    });

    server.listen(port);
  });
}

// 5. Check services
const exec = require('child_process').exec;

function checkCommand(command, name) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ name, available: false, message: `❌ Not installed or not running` });
      } else {
        resolve({ name, available: true, message: `✅ Available: ${stdout.trim().split('\n')[0]}` });
      }
    });
  });
}

// Run async checks
(async () => {
  // Check ports
  const portChecks = await Promise.all([
    checkPort(3000, 'Backend Port (3000)'),
    checkPort(3001, 'Frontend Port (3001)'),
    checkPort(5432, 'PostgreSQL Port (5432)'),
  ]);

  portChecks.forEach(({ name, available, inUse, error }) => {
    if (available) {
      checks.push({
        name,
        status: 'PASS',
        message: '✅ Available',
        critical: false
      });
    } else if (inUse) {
      checks.push({
        name,
        status: 'INFO',
        message: '🔵 Port in use (app might be running)',
        critical: false
      });
    } else {
      checks.push({
        name,
        status: 'WARN',
        message: `⚠️  ${error}`,
        critical: false
      });
    }
  });

  // Check services
  const serviceChecks = await Promise.all([
    checkCommand('psql --version', 'PostgreSQL'),
    checkCommand('redis-cli --version', 'Redis'),
    checkCommand('ffmpeg -version', 'FFmpeg'),
  ]);

  serviceChecks.forEach(({ name, available, message }) => {
    checks.push({
      name,
      status: available ? 'PASS' : 'WARN',
      message,
      critical: name === 'PostgreSQL' && !available
    });
  });

  // Print results
  console.log('\n📊 Results:\n');

  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const warnings = checks.filter(c => c.status === 'WARN').length;
  const info = checks.filter(c => c.status === 'INFO').length;

  checks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅'
                : check.status === 'FAIL' ? '❌'
                : check.status === 'WARN' ? '⚠️ '
                : '🔵';

    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}`);
    console.log();
  });

  console.log('='.repeat(60));
  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings, ${info} info\n`);

  // Check for critical failures
  const criticalFailures = checks.filter(c => c.critical);

  if (criticalFailures.length > 0) {
    console.log('❌ CRITICAL ISSUES FOUND:\n');
    criticalFailures.forEach(c => {
      console.log(`   • ${c.name}: ${c.message}`);
    });
    console.log('\n⚠️  Fix critical issues before proceeding\n');
    process.exit(1);
  }

  // Check OAuth credentials
  const hasYouTube = process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET;
  const hasFacebook = process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET;

  if (!hasYouTube && !hasFacebook) {
    console.log('⚠️  NO OAUTH CREDENTIALS SET\n');
    console.log('   YouTube and Facebook connections will NOT work.');
    console.log('   You need to:\n');
    console.log('   1. Get YouTube API credentials from Google Cloud Console');
    console.log('   2. Get Facebook API credentials from Meta for Developers');
    console.log('   3. Add them to backend/.env');
    console.log('\n   📖 See TROUBLESHOOTING.md for detailed instructions\n');
  } else if (!hasYouTube) {
    console.log('⚠️  YouTube credentials not set');
    console.log('   YouTube connections will NOT work\n');
  } else if (!hasFacebook) {
    console.log('⚠️  Facebook credentials not set');
    console.log('   Facebook connections will NOT work\n');
  } else {
    console.log('✅ OAuth credentials are configured!');
    console.log('   You should be able to connect YouTube and Facebook\n');
  }

  // Next steps
  console.log('📋 Next Steps:\n');

  if (!hasYouTube || !hasFacebook) {
    console.log('   1. Read TROUBLESHOOTING.md for setup instructions');
    console.log('   2. Get API credentials from Google/Meta');
    console.log('   3. Update backend/.env file');
    console.log('   4. Restart backend: cd backend && npm run dev');
  }

  console.log('   5. Start backend: cd backend && npm run dev');
  console.log('   6. Start frontend: cd frontend && npm run dev');
  console.log('   7. Visit: http://localhost:3001/dashboard/accounts');
  console.log('   8. Try connecting YouTube/Facebook\n');

  console.log('🆘 Need help? Check:');
  console.log('   • TROUBLESHOOTING.md - Detailed setup guide');
  console.log('   • YOUTUBE_FACEBOOK_INTEGRATION_GUIDE.md - Step-by-step');
  console.log('   • INTEGRATION_COMPLETE.md - Full documentation\n');

})();
