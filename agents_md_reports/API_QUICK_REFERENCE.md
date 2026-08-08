# 🚀 API Service Quick Reference

## Import the Service

```typescript
import { apiService } from '@/utils/api';
```

## Authentication Methods

### Register a New User
```typescript
const response = await apiService.auth.register(
  'johndoe',                    // username
  'john@example.com',          // email
  'password123',               // password
  'happy',                     // emotion (optional)
  'high'                       // energyLevel (optional)
);
// Returns: { token, user }
```

### Login
```typescript
const response = await apiService.auth.login(
  'john@example.com',          // email
  'password123',               // password
  'happy',                     // emotion (optional)
  'high'                       // energyLevel (optional)
);
// Returns: { token, user }
localStorage.setItem('authToken', response.token);
```

### Get Current User Profile
```typescript
const user = await apiService.auth.getCurrentUser();
// Returns: Complete user object from MongoDB
```

### Update User Mood/Energy
```typescript
const response = await apiService.auth.updateEmotion(
  'happy',     // emotion
  'high'       // energyLevel
);
// Returns: Updated user object
```

### Get User Activity Log
```typescript
const activities = await apiService.auth.getActivity();
// Returns: Array of activity records from MongoDB
```

---

## Course Methods

### Get All Courses
```typescript
const courses = await apiService.courses.getAll();
// Returns: Array of all courses from MongoDB
```

### Get Specific Course
```typescript
const course = await apiService.courses.getById('course-id-123');
// Returns: Single course object with details
```

### Enroll in Course
```typescript
const response = await apiService.courses.enroll('course-id-123');
// Returns: { message, user }
// Updates user.enrolledCourses in MongoDB
```

### Mark Course as Complete
```typescript
const response = await apiService.courses.complete('course-id-123');
// Returns: { message, user }
// Updates user.completedCourses in MongoDB
```

### Get Personalized Recommendations
```typescript
const recommendations = await apiService.courses.getRecommendations(
  'happy',  // emotion (optional)
  'high'    // energyLevel (optional)
);
// Returns: Array of recommended courses
// Based on mood, energy, interests, and history
```

---

## Reel Methods

### Get All Reels
```typescript
const reels = await apiService.reels.getAll();
// Returns: Array of all reels from MongoDB
```

### Get Specific Reel
```typescript
const reel = await apiService.reels.getById('reel-id-123');
// Returns: Single reel object
```

### Like a Reel
```typescript
const response = await apiService.reels.like('reel-id-123');
// Returns: { message, reel }
// Adds reel to user.likedReels in MongoDB
```

### Unlike a Reel
```typescript
const response = await apiService.reels.unlike('reel-id-123');
// Returns: { message, reel }
// Removes reel from user.likedReels in MongoDB
```

### Get Reel Recommendations
```typescript
const recommendations = await apiService.reels.getRecommendations(
  'happy',  // emotion (optional)
  'high'    // energyLevel (optional)
);
// Returns: Array of recommended reels
```

---

## User Profile Methods

### Get Full Profile
```typescript
const profile = await apiService.user.getProfile();
// Returns: { user, enrolledCourses, completedCourses, likedReels }
```

### Update Profile
```typescript
const response = await apiService.user.updateProfile({
  bio: 'New bio text',
  name: 'New Name',
  avatar: 'avatar-url'
});
// Returns: Updated user object
```

### Get Enrolled Courses
```typescript
const enrolledCourses = await apiService.user.getEnrolledCourses();
// Returns: Array of courses user is taking
```

### Get Completed Courses
```typescript
const completedCourses = await apiService.user.getCompletedCourses();
// Returns: Array of courses user finished
```

### Get Liked Reels
```typescript
const likedReels = await apiService.user.getLikedReels();
// Returns: Array of reels user liked
```

---

## Admin Methods

### Create New Course
```typescript
const formData = new FormData();
formData.append('title', 'React Mastery');
formData.append('description', 'Learn React from scratch');
formData.append('instructor', 'John Doe');
formData.append('category', 'Programming');
formData.append('tags', JSON.stringify(['react', 'javascript']));
formData.append('video', videoFile);      // File object
formData.append('thumbnail', thumbFile);  // File object

const response = await apiService.admin.createCourse(formData);
// Returns: Created course object with GridFS file IDs
```

### Update Existing Course
```typescript
const formData = new FormData();
formData.append('title', 'Updated Title');
formData.append('description', 'Updated description');
// Other fields...

const response = await apiService.admin.updateCourse('course-id-123', formData);
// Returns: Updated course object
```

### Delete Course
```typescript
const response = await apiService.admin.deleteCourse('course-id-123');
// Returns: { message, deletedCount }
```

### Create Reels from Video
```typescript
const formData = new FormData();
formData.append('courseId', 'course-id-123');
formData.append('videoId', 'gridfs-file-id');
formData.append('clips', JSON.stringify([
  { startTime: 0, duration: 15 },    // 15 second clip
  { startTime: 30, duration: 30 },   // 30 second clip
  { startTime: 100, duration: 60 }   // 60 second clip
]));

const response = await apiService.admin.createReel(formData);
// Returns: Array of created reel objects
// Uses FFmpeg to cut video segments, stores in GridFS
```

### Delete Reel
```typescript
const response = await apiService.admin.deleteReel('reel-id-123');
// Returns: { message, deletedCount }
```

---

## Error Handling

All methods throw errors with messages. Use try-catch:

```typescript
try {
  const user = await apiService.auth.login(email, password);
  console.log('Logged in:', user);
} catch (error) {
  console.error('Login failed:', error.message);
  // error.message could be:
  // "Invalid credentials"
  // "User not found"
  // "API Error: 500"
  // etc.
}
```

---

## Authentication Token

The service automatically handles JWT tokens:

```typescript
// 1. Save token after login
localStorage.setItem('authToken', response.token);

// 2. Token automatically included in all requests
// Authorization: Bearer <token>

// 3. Clear token on logout
localStorage.removeItem('authToken');
```

If no token exists, unauthenticated endpoints still work (like getAll courses).

---

## Usage Examples

### Complete Login Flow
```typescript
import { apiService } from '@/utils/api';

async function handleLogin(email: string, password: string) {
  try {
    const response = await apiService.auth.login(email, password, 'happy', 'high');
    
    // Save token for future requests
    localStorage.setItem('authToken', response.token);
    
    // Update app state
    setUser(response.user);
    setIsAuthenticated(true);
    
  } catch (error) {
    setError(error.message);
  }
}
```

### Enroll and Complete Course
```typescript
// Enroll
async function enrollCourse(courseId: string) {
  try {
    await apiService.courses.enroll(courseId);
    setEnrolledCourses([...enrolledCourses, courseId]);
  } catch (error) {
    console.error('Enrollment failed:', error.message);
  }
}

// Complete later
async function completeCourse(courseId: string) {
  try {
    await apiService.courses.complete(courseId);
    setCompletedCourses([...completedCourses, courseId]);
  } catch (error) {
    console.error('Completion failed:', error.message);
  }
}
```

### Get Personalized Recommendations
```typescript
async function loadRecommendations() {
  try {
    // Get user's current mood from state
    const emotion = userProfile.currentEmotion || 'happy';
    const energyLevel = userProfile.currentEnergyLevel || 'medium';
    
    // Fetch recommendations
    const courses = await apiService.courses.getRecommendations(emotion, energyLevel);
    const reels = await apiService.reels.getRecommendations(emotion, energyLevel);
    
    setRecommendedCourses(courses);
    setRecommendedReels(reels);
    
  } catch (error) {
    console.error('Failed to load recommendations:', error.message);
  }
}
```

### Admin - Upload Course
```typescript
async function uploadCourse(courseData) {
  try {
    const formData = new FormData();
    formData.append('title', courseData.title);
    formData.append('description', courseData.description);
    formData.append('instructor', courseData.instructor);
    formData.append('category', courseData.category);
    formData.append('tags', JSON.stringify(courseData.tags));
    formData.append('video', courseData.videoFile);
    formData.append('thumbnail', courseData.thumbnailFile);
    
    const response = await apiService.admin.createCourse(formData);
    console.log('Course created:', response);
    
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}
```

---

## Data Structures

### User Object
```typescript
{
  _id: ObjectId,
  username: string,
  email: string,
  password: string (hashed),
  role: 'user' | 'admin',
  enrolledCourses: ObjectId[],
  completedCourses: ObjectId[],
  currentEmotion: string,
  currentEnergyLevel: string,
  likedReels: ObjectId[],
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Course Object
```typescript
{
  _id: ObjectId,
  title: string,
  description: string,
  instructor: string,
  category: string,
  tags: string[],
  thumbnailId: ObjectId (GridFS),
  videos: [{
    fileId: ObjectId (GridFS),
    title: string,
    duration: number
  }],
  reels: ObjectId[],
  emotionAffinity: {
    [emotion]: number
  },
  rating: number,
  enrollmentCount: number,
  createdAt: Date
}
```

### Reel Object
```typescript
{
  _id: ObjectId,
  title: string,
  videoId: ObjectId (GridFS),
  sourceCourse: ObjectId,
  duration: 15 | 30 | 60,
  type: '15s' | '30s' | '60s',
  tags: string[],
  views: number,
  likes: number,
  createdBy: ObjectId,
  createdAt: Date
}
```

---

## Performance Tips

1. **Cache Results**: Store API responses locally to reduce requests
2. **Debounce**: Use debouncing for recommendation calls
3. **Lazy Load**: Load reels/courses only when needed
4. **Batch Updates**: Update multiple fields in one call
5. **Background Jobs**: Use background tasks for heavy operations

---

**API Service Location:** `src/utils/api.ts`
**Database:** MongoDB Atlas - masterclass
**Auth:** JWT Bearer tokens
**Status:** ✅ Production Ready
