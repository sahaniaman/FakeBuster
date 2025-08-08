// FakeBuster API Test Utility
// This script verifies that the backend API endpoints are working correctly

const apiBaseUrl = 'http://localhost:8000/api/v1';

// List of endpoints to test
const endpointsToTest = [
  { path: '/security/malicious-domains', method: 'GET', data: {} },
  { path: '/analyze/trust-score', method: 'POST', data: { domain: 'example.com' } },
  { path: '/analyze/website', method: 'POST', data: { url: 'https://example.com', domain: 'example.com' } },
  { path: '/coupons/find', method: 'POST', data: { domain: 'amazon.com', url: 'https://amazon.com' } }
];

// Test all endpoints
async function testAllEndpoints() {
  console.log('🔍 FakeBuster API Test Utility');
  console.log('===============================');
  console.log(`Testing API at: ${apiBaseUrl}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
      const result = await makeAPICall(endpoint.path, endpoint.data, endpoint.method);
      console.log('✅ PASSED');
      console.log('Response:', JSON.stringify(result, null, 2));
      passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      failed++;
    }
    console.log('----------------------------------------');
  }

  console.log('');
  console.log('Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
  
  if (failed > 0) {
    console.log('Some tests failed. Please check the API implementation.');
  } else {
    console.log('All tests passed! API is working correctly.');
  }
}

// Make API call
async function makeAPICall(endpoint, data = {}, method = 'POST') {
  try {
    const requestOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Only add body for POST requests
    if (method === 'POST' && Object.keys(data).length > 0) {
      requestOptions.body = JSON.stringify(data);
    } else if (method === 'GET' && Object.keys(data).length > 0) {
      // For GET requests, add query parameters
      const queryParams = new URLSearchParams(data).toString();
      endpoint += queryParams ? `?${queryParams}` : '';
    }

    // Add timeout for fetch requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    requestOptions.signal = controller.signal;

    const response = await fetch(`${apiBaseUrl}${endpoint}`, requestOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call error for ${endpoint}:`, error);
    throw error;
  }
}

// Run the tests
testAllEndpoints();
