// Cloudinary integration test with a proper image file
import cloudinary from 'cloudinary'
import fs from 'fs'
import 'dotenv/config'

console.log('🧪 Testing Cloudinary Integration with Image File...\n')

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
  
  // Create a simple test image file (base64 encoded small image)
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const base64Data = base64Image.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  
  const testFile = './test-image.png'
  fs.writeFileSync(testFile, buffer)
  
  console.log('\n📄 Created test image file')
  
  // Test file upload
  console.log('📤 Testing file upload...')
  
  const result = await cloudinary.uploader.upload(testFile, {
    folder: 'chat-app-test',
    public_id: 'integration-test-image',
    resource_type: 'image'
  })
  
  console.log('✅ File upload successful!')
  console.log('🔗 File URL:', result.secure_url)
  console.log('📋 File info:')
  console.log('   - Public ID:', result.public_id)
  console.log('   - Format:', result.format)
  console.log('   - Size:', result.bytes + ' bytes')
  console.log('   - Resource Type:', result.resource_type)
  
  // Clean up
  fs.unlinkSync(testFile)
  console.log('🧹 Test file cleaned up')
  
  // Delete the uploaded file
  await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' })
  console.log('🗑️ Test file deleted from Cloudinary')
  
  console.log('\n🎉 Cloudinary integration test completed successfully!')
  console.log('\n📋 Ready to proceed with your chat app integration!')
  console.log('\n💡 Next steps:')
  console.log('1. Update your frontend to use the new MessageInputCloudinary component')
  console.log('2. Test the complete file upload flow in your application')
  console.log('3. Create Cloudinary upload preset "chat-app-upload" in your dashboard')
  
} catch (error) {
  console.error('❌ Cloudinary integration test failed:', error.message)
  console.log('\n🔧 Troubleshooting tips:')
  console.log('1. Check your Cloudinary account has upload permissions')
  console.log('2. Ensure your account is activated')
  console.log('3. Check your internet connection')
  console.log('4. Verify your Cloudinary project settings')
  
  // Clean up test file if it exists
  if (fs.existsSync('./test-image.png')) {
    fs.unlinkSync('./test-image.png')
  }
}