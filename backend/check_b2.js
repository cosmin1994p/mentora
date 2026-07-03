import b2Service from './src/services/b2Service.js';

console.log('B2_KEY_ID:', process.env.B2_KEY_ID ? '✓ SET' : '✗ NOT SET');
console.log('B2_APP_KEY:', process.env.B2_APP_KEY ? '✓ SET' : '✗ NOT SET');
console.log('B2_BUCKET_NAME:', process.env.B2_BUCKET_NAME ? '✓ SET' : '✗ NOT SET');
console.log('B2_ENDPOINT:', process.env.B2_ENDPOINT ? '✓ SET' : '✗ NOT SET');

console.log('\nB2 Service status:');
console.log('Enabled:', b2Service.enabled ? '✓ YES' : '✗ NO');
console.log('KeyId:', b2Service.keyId ? b2Service.keyId.substring(0, 20) + '...' : 'null');
console.log('BucketName:', b2Service.bucketName);
console.log('Endpoint:', b2Service.endpoint);

process.exit(0);
