const http = require('http');

// Helper function to make HTTP requests
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

async function testAPI() {
  console.log('🧪 Testing WaitLess API...\n');

  try {
    // Test 1: Root endpoint
    console.log('1. Testing root endpoint...');
    const rootResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET'
    });
    console.log('✅ Root:', rootResponse.status, rootResponse.data);

    // Test 2: Register a new user
    console.log('\n2. Testing user registration...');
    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      phone: '5555555555',
      name: 'Test User',
      password: 'testpass123',
      role: 'patient'
    });
    console.log('✅ Register:', registerResponse.status, registerResponse.data);

    const token = registerResponse.data.token;

    // Test 3: Get hospitals
    console.log('\n3. Testing hospitals endpoint...');
    const hospitalsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hospitals',
      method: 'GET'
    });
    console.log('✅ Hospitals:', hospitalsResponse.status, 'Count:', hospitalsResponse.data.length);

    // Test 4: Get doctors
    console.log('\n4. Testing doctors endpoint...');
    const doctorsResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/doctors',
      method: 'GET'
    });
    console.log('✅ Doctors:', doctorsResponse.status, 'Count:', doctorsResponse.data.length);

    // Test 5: Book a token (with auth)
    if (token && doctorsResponse.data.length > 0) {
      console.log('\n5. Testing token booking...');
      const bookResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/tokens/book',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, {
        doctorId: doctorsResponse.data[0].id
      });
      console.log('✅ Book Token:', bookResponse.status, bookResponse.data);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
