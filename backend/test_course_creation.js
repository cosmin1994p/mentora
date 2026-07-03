/**
 * Test course creation flow
 */
const BASE_URL = 'http://localhost:8080';

async function testCourseCreation() {
  try {
    console.log('🧪 Testing course creation...\n');

    // Get auth token (admin login)
    const loginRes = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admintudy',
        password: 'admintudy'
      })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }

    const token = loginData.token;
    console.log('✅ Admin login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Create a test course
    const formData = new FormData();
    formData.append('title', '🧪 Test Upload Course');
    formData.append('instructor', 'Test Instructor');
    formData.append('description', 'Test course created at ' + new Date().toISOString());
    formData.append('category', 'Testing');
    formData.append('tags', JSON.stringify(['test', 'upload']));
    formData.append('duration', '45');
    formData.append('lessons', JSON.stringify([]));
    formData.append('quizQuestions', JSON.stringify([]));
    formData.append('infoContent', 'Test info');

    const courseRes = await fetch(`${BASE_URL}/api/admin/courses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const courseData = await courseRes.json();
    
    console.log(`\n📝 Course Creation Response: ${courseRes.status}`);
    console.log(`   ${JSON.stringify(courseData, null, 2)}`);

    if (!courseRes.ok) {
      console.error(`❌ Course creation failed:`);
      console.error(courseData);
      return;
    }

    console.log(`\n✅ Course created successfully!`);
    console.log(`   ID: ${courseData.id}`);
    console.log(`   Title: ${courseData.title}`);
    console.log(`   Has hlsUrl: ${!!courseData.hlsUrl}`);
    console.log(`   Has hlsReady: ${courseData.hlsReady !== undefined}`);
    console.log(`   hlsUrl value: ${courseData.hlsUrl || 'null'}`);
    console.log(`   hlsReady value: ${courseData.hlsReady}`);

    // Check if ID is valid
    const isValidObjectId = /^[a-f0-9]{24}$/i.test(courseData.id);
    console.log(`\n🔍 ID Validation:`);
    console.log(`   Is valid MongoDB ObjectId: ${isValidObjectId}`);
    if (!isValidObjectId) {
      console.warn(`   ⚠️  ID does not look like a MongoDB ObjectId!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCourseCreation();
