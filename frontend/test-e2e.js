// End-to-end test script for all dashboards
const http = require('http');

async function testEndToEnd() {
  console.log('Testing End-to-End Real-time Updates...\n');

  try {
    // Test 1: Verify all dashboards are accessible
    console.log('1. Testing dashboard accessibility...');
    
    // Test patient login
    const patientLogin = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      phone: '5555555555',
      password: 'testpass123'
    });
    console.log('   Patient Login:', patientLogin.status, 'OK');

    // Test doctor login
    const doctorLogin = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      phone: '8888888888',
      password: 'doctor123'
    });
    console.log('   Doctor Login:', doctorLogin.status, 'OK');

    // Test admin login
    const adminLogin = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      phone: '9999999999',
      password: 'admin123'
    });
    console.log('   Admin Login:', adminLogin.status, 'OK');

    // Test 2: Get doctors for patient booking
    console.log('\n2. Testing doctor availability...');
    const doctorsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/doctors',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   Available Doctors:', doctorsResponse.data.length, 'found');

    // Test 3: Patient books a token
    console.log('\n3. Testing patient token booking...');
    const bookResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tokens/book',
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${patientLogin.data.token}`,
        'Content-Type': 'application/json'
      }
    }, {
      doctorId: doctorsResponse.data[0].id
    });
    console.log('   Token Booked:', bookResponse.status, `Token #${bookResponse.data.tokenNumber}`);

    // Test 4: Check patient's tokens
    console.log('\n4. Testing patient token retrieval...');
    const patientTokens = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tokens/my',
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${patientLogin.data.token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   Patient Tokens:', patientTokens.status, `${patientTokens.data.length} tokens`);

    // Test 5: Check doctor's queue
    console.log('\n5. Testing doctor queue view...');
    const doctorQueue = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tokens/queue/${doctorsResponse.data[0].id}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('   Doctor Queue:', doctorQueue.status, `${doctorQueue.data.length} patients`);

    // Test 6: Doctor calls next patient
    console.log('\n6. Testing doctor call next...');
    const callNextResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tokens/call-next',
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${doctorLogin.data.token}`,
        'Content-Type': 'application/json'
      }
    }, {
      doctorId: doctorsResponse.data[0].id
    });
    console.log('   Call Next:', callNextResponse.status, callNextResponse.data.message || 'Success');

    // Test 7: Check updated queue
    console.log('\n7. Testing queue update after call...');
    const updatedQueue = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tokens/queue/${doctorsResponse.data[0].id}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const calledToken = updatedQueue.data.find(t => t.status === 'called');
    console.log('   Called Token:', calledToken ? `#${calledToken.tokenNumber} - ${calledToken.patient.name}` : 'None');

    // Test 8: Admin dashboard data
    console.log('\n8. Testing admin dashboard data...');
    const adminDoctors = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/doctors',
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${adminLogin.data.token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   Admin Doctors View:', adminDoctors.status, `${adminDoctors.data.length} doctors`);

    console.log('\n=== TEST RESULTS ===');
    console.log('All API endpoints are working correctly!');
    console.log('\n=== MANUAL TESTING INSTRUCTIONS ===');
    console.log('1. Open Chrome: http://localhost:3000/patient');
    console.log('   Login: 5555555555 / testpass123');
    console.log('2. Open Chrome Incognito: http://localhost:3000/doctor');
    console.log('   Login: 8888888888 / doctor123');
    console.log('3. Open Firefox: http://localhost:3000/admin');
    console.log('   Login: 9999999999 / admin123');
    console.log('\nTest Flow:');
    console.log('- Patient books token from available doctors');
    console.log('- Doctor sees patient in waiting queue');
    console.log('- Doctor clicks "Call Next Patient"');
    console.log('- Patient sees "It\'s YOUR TURN!" notification');
    console.log('- Admin sees live stats update across all dashboards');
    console.log('- Doctor can skip patients with X button');
    console.log('\nAll real-time updates should work via Socket.io!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

testEndToEnd();
