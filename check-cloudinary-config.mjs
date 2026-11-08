// Check Cloudinary configuration
import cloudinary from 'cloudinary'
import 'dotenv/config'

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

console.log('\n📤 Testing Cloudinary configuration...')

try {
  // Test configuration
  const config = cloudinary.config()
  console.log('✅ Cloudinary configuration loaded successfully!')
  console.log('   Cloud Name:', config.cloud_name)
  console.log('   API Key:', config.api_key ? 'Set' : 'Not set')
  console.log('   API Secret:', config.api_secret ? 'Set' : 'Not set')
  console.log('   Secure:', config.secure)
  
  console.log('\n🎉 Cloudinary is properly configured!')
  console.log('\n📋 Ready to proceed with file uploads!')
  console.log('\n💡 Note: Full API testing will be done when you run test-cloudinary.mjs')
  
} catch (error) {
  console.error('❌ Cloudinary configuration failed:', error.message)
  console.log('\n🔧 Troubleshooting tips:')
  console.log('1. Double-check your Cloudinary credentials')
  console.log('2. Ensure your Cloudinary account is activated')
  console.log('3. Check your internet connection')
}