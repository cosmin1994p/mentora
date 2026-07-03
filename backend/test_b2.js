import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

(async () => {
  const __envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env');
  dotenv.config({ path: __envFile });

  // Dynamic import AFTER dotenv.config()
  const { default: b2Service } = await import('./src/services/b2Service.js');

  console.log('Testing B2 Configuration:\n');
  console.log('B2_KEY_ID:', process.env.B2_KEY_ID ? process.env.B2_KEY_ID.substring(0, 15) + '...' : '❌ NOT SET');
  console.log('B2_APP_KEY:', process.env.B2_APP_KEY ? process.env.B2_APP_KEY.substring(0, 15) + '...' : '❌ NOT SET');
  console.log('B2_BUCKET_NAME:', process.env.B2_BUCKET_NAME || '❌ NOT SET');
  console.log('B2_ENDPOINT:', process.env.B2_ENDPOINT || '❌ NOT SET');
  console.log('B2_REGION:', process.env.B2_REGION || '❌ NOT SET');
  console.log('B2_CDN_URL:', process.env.B2_CDN_URL || '(optional)');

  console.log('\nB2Service Status:');
  console.log('Enabled:', b2Service.enabled ? '✓ YES' : '❌ NO');
  console.log('KeyId set:', b2Service.keyId ? '✓ YES' : '❌ NO');
  console.log('AppKey set:', b2Service.appKey ? '✓ YES' : '❌ NO');
  console.log('BucketName:', b2Service.bucketName);
  console.log('Endpoint:', b2Service.endpoint);

  // Test upload
  if (b2Service.enabled) {
    console.log('\nTesting B2 upload...');
    const testBuffer = Buffer.from('test content');
    try {
      const result = await b2Service.uploadFile(testBuffer, 'test/test-file.txt', 'text/plain');
      console.log('✓ B2 upload successful!');
      console.log('URL:', result.url);
      process.exit(0);
    } catch (error) {
      console.log('❌ B2 upload failed:');
      console.log('Error:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n❌ B2 not enabled - check credentials');
    process.exit(1);
  }
})();
