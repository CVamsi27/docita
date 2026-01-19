#!/usr/bin/env node

/**
 * Test script for smart authentication flow
 * Tests the email check endpoint and verifies the flow works correctly
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function testEmailCheck(email) {
  console.log(`\n🔍 Testing email: ${email}`);
  
  try {
    const response = await fetch(`${API_URL}/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   ✅ Email check successful`);
    console.log(`   📧 Email exists: ${data.exists ? 'YES' : 'NO'}`);
    console.log(`   → Should show: ${data.exists ? 'LOGIN form' : 'SIGNUP form'}`);
    
    return data.exists;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return null;
  }
}

async function testLogin(email, password) {
  console.log(`\n🔐 Testing login for: ${email}`);
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    console.log(`   ✅ Login successful`);
    console.log(`   👤 User: ${data.user.name}`);
    console.log(`   🏥 Clinic ID: ${data.user.clinicId || 'None'}`);
    console.log(`   🔑 Token received: ${data.access_token ? 'YES' : 'NO'}`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Smart Authentication Flow Test Suite\n');
  console.log('=' .repeat(50));

  // Test 1: Check existing user email
  console.log('\n📋 Test 1: Existing User Detection');
  await testEmailCheck('doctor@docita.work');

  // Test 2: Check non-existing user email
  console.log('\n📋 Test 2: New User Detection');
  await testEmailCheck('newuser@test.com');

  // Test 3: Test login with existing user
  console.log('\n📋 Test 3: Login Flow');
  await testLogin('doctor@docita.work', 'Doctor@123');

  // Test 4: Test invalid credentials
  console.log('\n📋 Test 4: Invalid Credentials');
  await testLogin('doctor@docita.work', 'wrongpassword');

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Test suite completed!\n');
  console.log('📝 Next steps:');
  console.log('   1. Visit http://localhost:3000/login');
  console.log('   2. Try entering "doctor@docita.work" → Should show login form');
  console.log('   3. Try entering "newuser@test.com" → Should show signup form');
  console.log('   4. Test the back button to change email\n');
}

runTests().catch(console.error);
