const cloudinary = require('cloudinary').v2;

// Replace with your actual Cloudinary credentials
const config = {
  cloud_name: 'your-cloud-name',
  api_key: 'your-api-key',
  api_secret: 'your-api-secret'
};

cloudinary.config(config);

async function checkStorage() {
  try {
    // Get account details
    const account = await cloudinary.api.account();
    console.log('Account Details:', {
      cloud_name: account.cloud_name,
      created_at: account.created_at,
      plan: account.plan
    });

    // Get usage statistics
    const usage = await cloudinary.api.usage();
    console.log('\nUsage Statistics:');
    console.log('Storage used:', usage.storage?.used || 'Not available');
    console.log('Storage limit:', usage.storage?.limit || 'Not available');
    console.log('Bandwidth used:', usage.bandwidth?.used || 'Not available');
    console.log('Bandwidth limit:', usage.bandwidth?.limit || 'Not available');
    
    // Get resources count
    const resources = await cloudinary.api.resources({ max_results: 1 });
    console.log('\nResources:', {
      total: resources.total_count,
      first_resource: resources.resources[0]?.public_id || 'No resources found'
    });

  } catch (error) {
    console.error('Error checking storage:', error.message);
    console.log('\nMake sure you have the correct credentials in the script.');
  }
}

checkStorage();