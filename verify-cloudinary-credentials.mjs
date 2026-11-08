// Verify Cloudinary credentials format
import cloudinary from 'cloudinary'
import 'dotenv/config'

console.log('🔍 Verifying Cloudinary Credentials...\n')

// Show current credentials
console.log('Current credentials in .env file:')
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME)
console.log('API Key:', process.env.CLOUDINARY_API_KEY)
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set')

console.log('\n💡 Expected Cloud Name format:')
console.log('- Should be short (e.g., "myapp", "chatapp", "your-username")')
console.log('- NOT a long UUID like the one you have')
console.log('- Check your Cloudinary dashboard for the correct cloud name')

console.log('\n📋 How to find your correct Cloud Name:')
console.log('1. Go to https://cloudinary.com/console')
console.log('2. Look at the URL or dashboard header')
console.log('3. It should be something like "your-project-name" or "your-username"')
console.log('4. NOT the UUID format in your current credentials')

console.log('\n🔄 Once you have the correct cloud name:')
console.log('1. Update your .env file with the correct cloud name')
console.log('2. Run this verification script again')
console.log('3. Then run the full integration test')

// Try to configure with current credentials
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  
  const config = cloudinary.config()
  console.log('\n✅ Configuration loaded (but cloud name may be incorrect)')
  
} catch (error) {
  console.log('\n❌ Configuration failed:', error.message)
}