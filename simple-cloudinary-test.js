// Simple Cloudinary test script
const cloudinary = require('cloudinary').v2;

// Try to get account information without credentials first
console.log('Testing Cloudinary connection...');

// This will work if you have environment variables set
try {
  const config = cloudinary.config();
  console.log('Cloudinary config found:', {
    cloud_name: config.cloud_name || 'Not set',
    api_key: config.api_key ? 'Set' : 'Not set',
    api_secret: config.api_secret ? 'Set' : 'Not set'
  });
} catch (error) {
  console.log('No environment variables found');
}

// Let's try a different approach - create a simple upload test
console.log('\n📋 To test Cloudinary, you need these credentials:');
console.log('1. Cloud Name');
console.log('2. API Key'); 
console.log('3. API Secret');

console.log('\n🔍 Where to find them:');
console.log('1. Go to https://cloudinary.com/console');
console.log('2. Click on your account name/profile');
console.log('3. Look for "API Keys" or "Account Settings"');
console.log('4. Copy your cloud_name, api_key, and api_secret');

console.log('\n💡 Or check your email:');
console.log('Look for the Cloudinary welcome email when you signed up');

console.log('\n📝 Once you have the credentials, run this:');
console.log('node simple-cloudinary-test.js');