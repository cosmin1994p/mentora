/**
 * Test script to verify courses are returned with HLS URLs
 */

async function testCoursesAPI() {
  try {
    console.log('🧪 Testing /api/courses endpoint...\n');

    const response = await fetch('http://localhost:8080/api/courses');
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', data);
      return;
    }

    console.log(`✅ Received ${data.count} courses\n`);

    // Find test courses
    const testCourses = data.data.filter(c => c.title.includes('Test') || c.title.includes('Full HD'));
    
    if (testCourses.length === 0) {
      console.log('⚠️  No test courses found. Showing first 3 courses:\n');
      data.data.slice(0, 3).forEach(course => {
        console.log(`📚 "${course.title}"`);
        console.log(`   ID: ${course.id}`);
        console.log(`   hlsUrl: ${course.hlsUrl || 'NOT SET'}`);
        console.log(`   videoUrl: ${course.videoUrl ? `${course.videoUrl.substring(0, 50)}...` : 'NOT SET'}`);
        console.log('');
      });
    } else {
      console.log('✅ Found test courses!\n');
      testCourses.forEach(course => {
        console.log(`📚 "${course.title}"`);
        console.log(`   ID: ${course.id}`);
        console.log(`   hlsUrl: ${course.hlsUrl || 'NOT SET'}`);
        console.log(`   videoUrl: ${course.videoUrl ? `${course.videoUrl.substring(0, 80)}...` : 'NOT SET'}`);
        console.log(`   Enrolled: ${course.enrolled}`);
        console.log('');
      });
    }

    // Check if HLS URLs are in response
    const coursesWithHLS = data.data.filter(c => c.hlsUrl);
    console.log(`\n📊 Summary:`);
    console.log(`   Total courses: ${data.count}`);
    console.log(`   Courses with hlsUrl: ${coursesWithHLS.length}`);
    console.log(`   Courses with videoUrl: ${data.data.filter(c => c.videoUrl).length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCoursesAPI();
