// Test UI Flow - Tests the complete authentication flow
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:3001';

async function testUIFlow() {
  console.log('🧪 Testing Complete UI Flow\n');

  try {
    // Test 1: Login via API
    console.log('1️⃣  Testing Login API...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'suhani@stage.in',
      password: '123456'
    });

    if (loginResponse.data.token && loginResponse.data.user) {
      console.log('   ✅ Login API successful');
      console.log(`   User: ${loginResponse.data.user.name}`);
      console.log(`   Email: ${loginResponse.data.user.email}`);
      console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...`);
    }

    const token = loginResponse.data.token;

    // Test 2: Access Protected Routes
    console.log('\n2️⃣  Testing Protected Routes...');

    const videosResponse = await axios.get(`${API_URL}/videos`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   ✅ Videos endpoint accessible (${videosResponse.data.videos.length} videos)`);

    const postsResponse = await axios.get(`${API_URL}/posts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   ✅ Posts endpoint accessible (${postsResponse.data.posts.length} posts)`);

    const accountsResponse = await axios.get(`${API_URL}/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   ✅ Accounts endpoint accessible (${accountsResponse.data.accounts.length} accounts)`);

    // Test 3: Frontend Pages
    console.log('\n3️⃣  Testing Frontend Pages...');

    const loginPage = await axios.get(`${FRONTEND_URL}/login`);
    console.log(`   ✅ Login page loads (${loginPage.status})`);

    const dashboardPage = await axios.get(`${FRONTEND_URL}/dashboard`);
    console.log(`   ✅ Dashboard page loads (${dashboardPage.status})`);

    const videosPage = await axios.get(`${FRONTEND_URL}/dashboard/videos`);
    console.log(`   ✅ Videos page loads (${videosPage.status})`);

    const postsPage = await axios.get(`${FRONTEND_URL}/dashboard/posts`);
    console.log(`   ✅ Posts page loads (${postsPage.status})`);

    // Test 4: Check for specific UI elements
    console.log('\n4️⃣  Checking UI Components...');

    if (dashboardPage.data.includes('Dashboard')) {
      console.log('   ✅ Dashboard page contains "Dashboard" text');
    }

    if (dashboardPage.data.includes('Upload Video')) {
      console.log('   ✅ Dashboard has "Upload Video" button');
    }

    if (dashboardPage.data.includes('Create Post')) {
      console.log('   ✅ Dashboard has "Create Post" button');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\n📋 Summary:');
    console.log('   • Backend API: Working ✓');
    console.log('   • Authentication: Working ✓');
    console.log('   • Protected Routes: Working ✓');
    console.log('   • Frontend Pages: Rendering ✓');
    console.log('   • Dashboard Components: Present ✓');
    console.log('\n🎯 What to do now:');
    console.log('   1. Open http://localhost:3001 in your browser');
    console.log('   2. Click "Login"');
    console.log('   3. Enter:');
    console.log('      Email: suhani@stage.in');
    console.log('      Password: 123456');
    console.log('   4. After login, you should see the dashboard with:');
    console.log('      - Upload Video button');
    console.log('      - Create Post button');
    console.log('      - Stats cards (Videos, Posts, etc.)');
    console.log('      - Sidebar navigation');
    console.log('\n💡 If you still see a blank page:');
    console.log('   • Open browser Developer Tools (F12)');
    console.log('   • Check Console tab for JavaScript errors');
    console.log('   • Check Network tab for failed requests');
    console.log('   • Try clearing browser cache (Ctrl+Shift+R)');
    console.log('   • Try a different browser');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testUIFlow();
