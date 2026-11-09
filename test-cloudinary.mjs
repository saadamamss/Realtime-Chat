// Simple Cloudinary integration test
import cloudinary from 'cloudinary'
import fs from 'fs'
import 'dotenv/config'

console.log('🧪 Testing Cloudinary Integration...\n')

// Check if we have credentials
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.log('❌ Cloudinary credentials not found in environment variables')
  console.log('Please add these to your .env file:')
  console.log('CLOUDINARY_CLOUD_NAME=your-cloud-name')
  console.log('CLOUDINARY_API_KEY=your-api-key')
  console.log('CLOUDINARY_API_SECRET=your-api-secret')
  process.exit(1)
}

console.log('✅ Cloudinary credentials found')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

console.log('📤 Testing basic Cloudinary connection...')

try {
  // Test basic API call
  const ping = await cloudinary.api.ping()
  console.log('✅ Connected to Cloudinary!')
  console.log('   Response:', ping.message || 'OK')
  
  // Create a test file
  const testContent = 'This is a test file for Cloudinary integration'
  const testFile = './test-cloudinary-file.txt'
  fs.writeFileSync(testFile, testContent)
  
  console.log('\n📄 Created test file')
  
  // Test file upload
  console.log('📤 Testing file upload...')
  
  const result = await cloudinary.uploader.upload(testFile, {
    folder: 'chat-app-test',
    public_id: 'integration-test'
  })
  
  console.log('✅ File upload successful!')
  console.log('🔗 File URL:', result.secure_url)
  console.log('📋 File info:')
  console.log('   - Public ID:', result.public_id)
  console.log('   - Format:', result.format)
  console.log('   - Size:', result.bytes + ' bytes')
  
  // Clean up
  fs.unlinkSync(testFile)
  console.log('🧹 Test file cleaned up')
  
  // Delete the uploaded file
  await cloudinary.uploader.destroy(result.public_id)
  console.log('🗑️ Test file deleted from Cloudinary')
  
  console.log('\n🎉 Cloudinary integration test completed successfully!')
  console.log('\n📋 Next steps:')
  console.log('1. Create Cloudinary upload preset "chat-app-upload" in your dashboard')
  console.log('2. Set the preset to unsigned mode for client-side uploads')
  console.log('3. Update your frontend to use the new MessageInputCloudinary component')
  console.log('4. Test the complete file upload flow in your application')
  
} catch (error) {
  console.error('❌ Cloudinary integration test failed:', error.message)
  console.log('\n🔧 Troubleshooting tips:')
  console.log('1. Check your Cloudinary credentials in .env file')
  console.log('2. Ensure your Cloudinary account has upload permissions')
  console.log('3. Check your internet connection')
  console.log('4. Verify your Cloudinary project is in the correct region')
  
  // Clean up test file if it exists
  if (fs.existsSync('./test-cloudinary-file.txt')) {
    fs.unlinkSync('./test-cloudinary-file.txt')
  }
}