const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configuration - replace with your actual credentials
const config = {
  cloud_name: 'your-cloud-name',
  api_key: 'your-api-key',
  api_secret: 'your-api-secret'
};

cloudinary.config(config);

async function testUpload() {
  try {
    // Create a simple test file
    const testContent = 'Test content for Cloudinary upload';
    const testFile = './test-file.txt';
    fs.writeFileSync(testFile, testContent);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(testFile, {
      folder: 'chat-app-test',
      public_id: 'test-upload'
    });

    console.log('✅ Upload successful!');
    console.log('File URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    console.log('Resource type:', result.resource_type);
    console.log('File size:', result.bytes);

    // Clean up
    fs.unlinkSync(testFile);
    
    // Delete the uploaded file
    await cloudinary.uploader.destroy(result.public_id);
    console.log('🗑️ Test file deleted');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.log('\nMake sure you have the correct credentials.');
    console.log('You can find them in your Cloudinary dashboard under Account > API Keys.');
  }
}

testUpload();