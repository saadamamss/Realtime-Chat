import cloudinary from 'cloudinary';

// Configuration - you'll need to set these
const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
};

cloudinary.config(config);

async function checkStorage() {
  try {
    console.log('🔍 Checking Cloudinary storage...');
    
    // Get account details
    const account = await cloudinary.api.account();
    console.log('📋 Account Details:');
    console.log('  Cloud Name:', account.cloud_name);
    console.log('  Plan:', account.plan);
    console.log('  Created:', account.created_at);

    // Get usage statistics
    const usage = await cloudinary.api.usage();
    console.log('\n💾 Storage Usage:');
    console.log('  Used:', usage.storage?.used || 'Not available');
    console.log('  Limit:', usage.storage?.limit || '25GB (Free tier)');
    console.log('  Available:', usage.storage?.limit ? (usage.storage.limit - usage.storage.used) + 'GB' : '25GB remaining');

    console.log('\n📡 Bandwidth Usage:');
    console.log('  Used:', usage.bandwidth?.used || 'Not available');
    console.log('  Limit:', usage.bandwidth?.limit || '100GB (Free tier)');

    // Get resources count
    const resources = await cloudinary.api.resources({ max_results: 1 });
    console.log('\n📁 Resources:');
    console.log('  Total files:', resources.total_count);
    console.log('  First file:', resources.resources[0]?.public_id || 'No files uploaded');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Make sure you have the correct credentials:');
    console.log('  1. Go to https://cloudinary.com/console');
    console.log('  2. Click on your account name');
    console.log('  3. Look for "API Keys"');
    console.log('  4. Set these environment variables:');
    console.log('     CLOUDINARY_CLOUD_NAME=your-cloud-name');
    console.log('     CLOUDINARY_API_KEY=your-api-key');
    console.log('     CLOUDINARY_API_SECRET=your-api-secret');
  }
}

checkStorage();