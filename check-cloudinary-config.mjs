// Check Cloudinary configuration
import cloudinary from 'cloudinary'

console.log('🔍 Checking Cloudinary Configuration...\n')

// Check if we have credentials
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.log('❌ Cloudinary credentials not found in environment variables')
  console.log('Please add these to your .env file:')
  console.log('CLOUDINARY_CLOUD_NAME=your-cloud-name')
  console.log('CLOUDINARY_API_KEY=your-api-key')
  console.log('CLOUDINARY_API_SECRET=your-api-secret')
  process.exit(1)
}

console.log('✅ Cloudinary credentials found in environment variables')
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME)
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set')
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

console.log('\n📤 Testing Cloudinary connection...')

try {
  // Test basic API call
  const account = await cloudinary.api.account()
  console.log('✅ Successfully connected to Cloudinary!')
  console.log('   Account Plan:', account.plan)
  console.log('   Created:', account.created_at)
  
  // Get usage information
  const usage = await cloudinary.api.usage()
  console.log('\n💾 Storage Usage:')
  if (usage.storage) {
    console.log('   Used:', usage.storage.used || 'Not available')
    console.log('   Limit:', usage.storage.limit || '25GB (Free tier)')
  }
  
  if (usage.bandwidth) {
    console.log('   Bandwidth Used:', usage.bandwidth.used || 'Not available')
    console.log('   Bandwidth Limit:', usage.bandwidth.limit || '100GB (Free tier)')
  }
  
  console.log('\n🎉 Cloudinary is properly configured!')
  console.log('\n📋 Ready to proceed with file uploads!')
  
} catch (error) {
  console.error('❌ Failed to connect to Cloudinary:', error.message)
  console.log('\n🔧 Troubleshooting tips:')
  console.log('1. Double-check your Cloudinary credentials')
  console.log('2. Ensure your Cloudinary account is activated')
  console.log('3. Check your internet connection')
  console.log('4. Verify your Cloudinary project is in the correct region')
}