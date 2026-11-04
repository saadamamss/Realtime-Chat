import { CloudinaryService } from './server/utils/cloudinary.js'
import fs from 'fs'
import path from 'path'

// Test Cloudinary integration
async function testCloudinaryIntegration() {
  console.log('🧪 Testing Cloudinary Integration...\n')
  
  try {
    // Check if we have credentials
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('❌ Cloudinary credentials not found in environment variables')
      console.log('Please add these to your .env file:')
      console.log('CLOUDINARY_CLOUD_NAME=your-cloud-name')
      console.log('CLOUDINARY_API_KEY=your-api-key')
      console.log('CLOUDINARY_API_SECRET=your-api-secret')
      return
    }
    
    console.log('✅ Cloudinary credentials found')
    
    // Create Cloudinary service instance
    const cloudinaryService = CloudinaryService.getInstance()
    
    // Create a test file
    const testContent = 'This is a test file for Cloudinary integration'
    const testFile = './test-cloudinary-file.txt'
    fs.writeFileSync(testFile, testContent)
    
    console.log('📄 Created test file')
    
    // Read test file as buffer
    const fileBuffer = fs.readFileSync(testFile)
    const userId = 'test-user-123'
    const filename = 'test-file.txt'
    
    console.log('📤 Testing file upload...')
    
    // Test file upload
    const uploadResult = await cloudinaryService.uploadFile(fileBuffer, filename, userId)
    console.log('✅ File upload successful!')
    console.log('🔗 File URL:', uploadResult)
    
    // Extract public ID from URL
    const url = new URL(uploadResult)
    const pathParts = url.pathname.split('/')
    const publicId = pathParts[pathParts.length - 1].split('.')[0]
    
    console.log('📋 Testing file info retrieval...')
    
    // Test file info retrieval
    const fileInfo = await cloudinaryService.getFileInfo(publicId)
    console.log('✅ File info retrieved:')
    console.log('   - Public ID:', fileInfo.public_id)
    console.log('   - Format:', fileInfo.format)
    console.log('   - Size:', fileInfo.bytes + ' bytes')
    
    console.log('🗑️ Testing file deletion...')
    
    // Test file deletion
    await cloudinaryService.deleteFile(publicId)
    console.log('✅ File deleted successfully')
    
    // Clean up
    fs.unlinkSync(testFile)
    console.log('🧹 Test file cleaned up')
    
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
  }
}

// Run the test
testCloudinaryIntegration()