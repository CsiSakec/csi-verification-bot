// Test script for local Discord bot development
// This simulates Discord interactions for testing

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Mock Discord interaction data
const createInteraction = (type, commandName, options = [], userId = '123456789', guildId = '987654321') => {
  return {
    type: type,
    data: {
      name: commandName,
      options: options
    },
    member: {
      user: {
        id: userId
      }
    },
    guild_id: guildId
  };
};

const createModalSubmission = (customId, email, userId = '123456789', guildId = '987654321') => {
  return {
    type: 5, // MODAL_SUBMIT
    data: {
      custom_id: customId,
      components: [
        {
          components: [
            {
              value: email
            }
          ]
        }
      ]
    },
    member: {
      user: {
        id: userId
      }
    },
    guild_id: guildId
  };
};

// Test functions
async function testPing() {
  console.log('\n🏓 Testing ping command...');
  try {
    const interaction = createInteraction(2, 'vping'); // APPLICATION_COMMAND
    const response = await axios.post(`${BASE_URL}/api/discord`, interaction);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testStatus() {
  console.log('\n📊 Testing status command...');
  try {
    const interaction = createInteraction(2, 'vstatus');
    const response = await axios.post(`${BASE_URL}/api/discord`, interaction);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testAddDomain() {
  console.log('\n➕ Testing add domain command...');
  try {
    const interaction = createInteraction(2, 'domainadd', [
      { name: 'domain', value: 'test.com' }
    ]);
    const response = await axios.post(`${BASE_URL}/api/discord`, interaction);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testVerifyStart() {
  console.log('\n📧 Testing verify command (should return modal)...');
  try {
    const interaction = createInteraction(2, 'verify');
    const response = await axios.post(`${BASE_URL}/api/discord`, interaction);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testEmailSubmission() {
  console.log('\n📝 Testing email submission (modal)...');
  try {
    const modalData = createModalSubmission('email_verification_modal', 'test@test.com');
    const response = await axios.post(`${BASE_URL}/api/discord`, modalData);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testVerifyCode() {
  console.log('\n🔢 Testing verify code command...');
  try {
    const interaction = createInteraction(2, 'verifycode', [
      { name: 'code', value: '123456' }
    ]);
    const response = await axios.post(`${BASE_URL}/api/discord`, interaction);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testEmailAPI() {
  console.log('\n📮 Testing email API...');
  try {
    const response = await axios.post(`${BASE_URL}/test-email`, {
      email: 'test@example.com'
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testHealth() {
  console.log('\n🔍 Testing health endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Discord Bot Local Tests');
  console.log('====================================');

  await testHealth();
  await testPing();
  await testStatus();
  await testAddDomain();
  await testVerifyStart();
  await testEmailSubmission();
  await testVerifyCode();
  await testEmailAPI();

  console.log('\n✅ All tests completed!');
  console.log('\n💡 Tips:');
  console.log('1. Make sure your .env file has the correct SMTP settings');
  console.log('2. Add a domain first before testing email verification');
  console.log('3. Check the server logs for detailed information');
  console.log('4. The verification code is shown in the email response for testing');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPing,
  testStatus,
  testAddDomain,
  testVerifyStart,
  testEmailSubmission,
  testVerifyCode,
  testEmailAPI,
  testHealth,
  runTests
};
