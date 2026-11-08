// Simple Cloudinary test
import cloudinary from 'cloudinary'
import fs from 'fs'
import 'dotenv/config'

console.log('🧪 Testing Cloudinary Integration...\n')

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

console.log('📤 Testing Cloudinary configuration...')

try {
  // Test configuration
  const config = cloudinary.config()
  console.log('✅ Configuration loaded successfully!')
  console.log('   Cloud Name:', config.cloud_name)
  
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
  console.log('\n📋 Ready to proceed with your chat app integration!')
  
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