// Test script to verify patient dashboard functionality
const http = require('http');

async function testPatientDashboard() {
  console.log('🧪 Testing Patient Dashboard Flow...\n');

  try {
    // Test 1: Login as patient
    console.log('1. Testing patient login...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      phone: '5555555555',
      password: 'testpass123'
    });
    console.log('✅ Patient Login:', loginResponse.status, loginResponse.data.user.name);

    const token = loginResponse.data.token;

    // Test 2: Get patient's tokens
    console.log('\n2. Testing get patient tokens...');
    const tokensResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tokens/my',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Patient Tokens:', tokensResponse.status, 'Count:', tokensResponse.data.length);

    // Test 3: Get available doctors
    console.log('\n3. Testing get available doctors...');
    const doctorsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/doctors',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Available Doctors:', doctorsResponse.status, 'Count:', doctorsResponse.data.length);

    // Test 4: Book a token (if we have doctors and no existing tokens)
    if (doctorsResponse.data.length > 0 && tokensResponse.data.length === 0) {
      console.log('\n4. Testing book token...');
      const bookResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/tokens/book',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, {
        doctorId: doctorsResponse.data[0].id
      });
      console.log('✅ Book Token:', bookResponse.status, bookResponse.data.tokenNumber);
    }

    // Test 5: Get queue for doctor
    if (doctorsResponse.data.length > 0) {
      console.log('\n5. Testing get queue for doctor...');
      const queueResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/tokens/queue/${doctorsResponse.data[0].id}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Doctor Queue:', queueResponse.status, 'Count:', queueResponse.data.length);
    }

    console.log('\n🎉 Patient dashboard tests completed successfully!');
    console.log('\n📱 You can now test the UI at: http://localhost:3000/patient');
    console.log('🔐 Use patient credentials: 5555555555 / testpass123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
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

testPatientDashboard();
