# 🎯 Next Steps - Frontend API Integration Guide

## What's Been Done ✅

1. **MongoDB Integration**: Complete
   - Backend connected to MongoDB Atlas
   - All user data persists in database
   - JWT authentication working
   - API service layer created

2. **Frontend Authentication**: Complete
   - AuthModal connects to API
   - Tokens saved and restored
   - Logout clears authentication
   - Automatic token injection in requests

3. **Type Safety**: Complete
   - Zero TypeScript errors
   - Full type support for all API methods
   - Build succeeds without warnings

---

## What's Needed Next 🔄

The core infrastructure is done. Now we need to replace localStorage with API calls in these components:

### Priority 1: Course Management (High Impact)

#### 1. **CourseGrid.tsx** - Fetch from API
```typescript
// OLD: Load from localStorage
const courses = JSON.parse(localStorage.getItem('courses'));

// NEW: Fetch from API
const courses = await apiService.courses.getAll();
```

**Changes:**
- Replace localStorage fetch with `apiService.courses.getAll()`
- Display courses from MongoDB
- Show "Loading..." while fetching

#### 2. **CourseDetail.tsx** - API Integration
```typescript
// OLD: localStorage enrollment
localStorage.setItem('enrolledCourses', JSON.stringify([...enrolled, courseId]));

// NEW: API enrollment
await apiService.courses.enroll(courseId);
```

**Changes:**
- Enroll button calls `apiService.courses.enroll(courseId)`
- Complete button calls `apiService.courses.complete(courseId)`
- Track enrollment status from API

#### 3. **AdminPanel.tsx** - Upload via API
```typescript
// OLD: Save to localStorage
localStorage.setItem('courses', JSON.stringify([...courses, newCourse]));

// NEW: Upload via API
const response = await apiService.admin.createCourse(formData);
```

**Changes:**
- File upload calls `apiService.admin.createCourse(formData)`
- Use FormData for file upload
- Videos stored in GridFS automatically
- Return to course list on success

---

### Priority 2: Reels Management (Medium Impact)

#### 4. **ReelsSection.tsx** - Fetch from API
```typescript
// OLD: Load from localStorage
const reels = JSON.parse(localStorage.getItem('reels'));

// NEW: Fetch from API
const reels = await apiService.reels.getAll();
```

**Changes:**
- Fetch reels from `apiService.reels.getAll()`
- Display reels from MongoDB
- Update on like/unlike

#### 5. **ReelViewer.tsx** - Like/Unlike via API
```typescript
// OLD: Update localStorage
localStorage.setItem('likedReels', JSON.stringify([...liked, reelId]));

// NEW: API call
await apiService.reels.like(reelId);
```

**Changes:**
- Like button calls `apiService.reels.like(reelId)`
- Unlike button calls `apiService.reels.unlike(reelId)`
- Update UI after API response

---

### Priority 3: User Preferences (Medium Impact)

#### 6. **MoodModal.tsx** - Update API
```typescript
// OLD: Save to localStorage profile
profile.dailyMood = { mood, energy };

// NEW: Call API
await apiService.auth.updateEmotion(mood, energy);
```

**Changes:**
- After mood selection, call `apiService.auth.updateEmotion(emotion, energyLevel)`
- Update user.currentEmotion in MongoDB
- Trigger recommendation refresh

---

### Priority 4: Recommendations (High Impact)

#### 7. **App.tsx** - Get Recommendations from API
```typescript
// OLD: Generate locally
const recommendations = generateMLRecommendations(userProfile);

// NEW: From API
const recommendations = await apiService.courses.getRecommendations(
  userProfile.dailyMood.mood,
  userProfile.dailyMood.energy
);
```

**Changes:**
- Call API with current emotion/energy
- Display MongoDB-backed recommendations
- Cache results locally for performance

---

## Implementation Strategy

### Phase 1: Easy Wins (Start Here)
1. **CourseGrid** - Just fetch from API (no storage needed)
2. **ReelsSection** - Same as CourseGrid
3. **MoodModal** - Call updateEmotion API

Estimated: 2-3 hours

### Phase 2: Enrollment Tracking
1. **CourseDetail** - Connect enroll/complete buttons
2. **App.tsx** - Track user's enrolled/completed courses
3. Update UI to show progress

Estimated: 2-3 hours

### Phase 3: Admin Features
1. **AdminPanel** - Upload courses with files
2. **ReelCreator** - Generate reels from videos
3. Test file storage in GridFS

Estimated: 3-4 hours

### Phase 4: Recommendations
1. **Get Recommendations** - Call API with mood
2. **Cache Results** - Store in state, not localStorage
3. **Update on Mood Change** - Refresh when emotion changes

Estimated: 2-3 hours

---

## Code Templates to Use

### Fetching Data
```typescript
import { apiService } from '@/utils/api';
import { useState, useEffect } from 'react';

export function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await apiService.courses.getAll();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{/* Render data */}</div>;
}
```

### User Actions
```typescript
async function handleAction(id: string) {
  try {
    setLoading(true);
    const response = await apiService.courses.enroll(id);
    // Update UI based on response
    setEnrolledCourses([...enrolledCourses, id]);
    showSuccess('Enrolled successfully!');
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}
```

### Admin File Upload
```typescript
async function handleUpload(courseData: {
  title: string;
  description: string;
  videoFile: File;
  thumbnailFile: File;
}) {
  try {
    const formData = new FormData();
    formData.append('title', courseData.title);
    formData.append('description', courseData.description);
    formData.append('video', courseData.videoFile);
    formData.append('thumbnail', courseData.thumbnailFile);
    
    const response = await apiService.admin.createCourse(formData);
    showSuccess('Course created!');
  } catch (error) {
    showError(error.message);
  }
}
```

---

## Checklist for Each Component

### CourseGrid.tsx
- [ ] Import apiService
- [ ] Replace localStorage.getItem('courses')
- [ ] Add useEffect to fetch courses
- [ ] Add loading and error states
- [ ] Display courses from API
- [ ] Update on component mount

### CourseDetail.tsx
- [ ] Import apiService
- [ ] Connect "Enroll" button to apiService.courses.enroll()
- [ ] Connect "Complete" button to apiService.courses.complete()
- [ ] Show success/error messages
- [ ] Update UI after API call

### AdminPanel.tsx
- [ ] Import apiService
- [ ] Replace form submission with API call
- [ ] Use FormData for file upload
- [ ] Call apiService.admin.createCourse(formData)
- [ ] Show upload progress
- [ ] Refresh course list after upload

### ReelsSection.tsx
- [ ] Import apiService
- [ ] Replace localStorage.getItem('reels')
- [ ] Fetch from apiService.reels.getAll()
- [ ] Display reels from API
- [ ] Update on mount

### ReelViewer.tsx
- [ ] Import apiService
- [ ] Connect like button to apiService.reels.like()
- [ ] Connect unlike button to apiService.reels.unlike()
- [ ] Update like count after API call
- [ ] Show success/error messages

### MoodModal.tsx
- [ ] Import apiService
- [ ] Call apiService.auth.updateEmotion() on mood selection
- [ ] Save result to user state
- [ ] Trigger recommendation refresh

### App.tsx (Recommendations)
- [ ] Get emotion and energy from user state
- [ ] Call apiService.courses.getRecommendations()
- [ ] Display recommended courses
- [ ] Refresh when user mood changes
- [ ] Cache results locally

---

## Important Notes

1. **Always use try-catch** for API calls
2. **Show loading state** while fetching
3. **Handle errors gracefully** with user messages
4. **Token is automatic** - no need to add headers
5. **Remove localStorage** references for dynamic data
6. **Keep localStorage** for user session token (already done)
7. **Test each component** after changes
8. **Use browser DevTools Network tab** to verify API calls

---

## Testing Your Changes

### 1. Test Login/Logout
- Sign up → user created in MongoDB ✅
- Login → token in localStorage ✅
- Reload page → stay logged in ✅
- Logout → token cleared ✅

### 2. Test Data Loading
- CourseGrid → loads from API ✅
- ReelsSection → loads from API ✅
- Enrollment → updates in MongoDB ✅

### 3. Test Admin
- Upload course → stored in GridFS ✅
- Thumbnail → stored in GridFS ✅
- Video → stored in GridFS ✅

### 4. Test User Actions
- Enroll button → adds to enrolledCourses ✅
- Complete button → adds to completedCourses ✅
- Like reel → adds to likedReels ✅
- Update mood → triggers API ✅

---

## Common Issues & Solutions

### Issue: "Authorization Failed"
**Cause:** Token not being sent
**Solution:** Check localStorage.getItem('authToken') exists

### Issue: "API returns 404"
**Cause:** Endpoint doesn't exist or wrong path
**Solution:** Check API_URL in api.ts, verify backend is running

### Issue: "CORS Error"
**Cause:** Frontend and backend not aligned
**Solution:** Ensure backend CORS includes http://localhost:3000

### Issue: "File upload fails"
**Cause:** FormData not being sent correctly
**Solution:** Let browser set Content-Type, don't override headers

### Issue: "Data not persisting"
**Cause:** Using localStorage instead of API
**Solution:** Remove localStorage calls, use API methods instead

---

## Performance Considerations

### Optimize with Caching
```typescript
const [cachedCourses, setCachedCourses] = useState(null);

useEffect(() => {
  if (cachedCourses) {
    setCourses(cachedCourses);
  } else {
    apiService.courses.getAll().then(data => {
      setCourses(data);
      setCachedCourses(data);
    });
  }
}, []);
```

### Debounce API Calls
```typescript
import { useCallback } from 'react';

const debouncedSearch = useCallback(
  debounce((query: string) => {
    apiService.courses.search(query);
  }, 500),
  []
);
```

### Lazy Load Reels
```typescript
// Load only visible reels
const [visibleReels, setVisibleReels] = useState([]);

const observer = new IntersectionObserver((entries) => {
  // Load more when scrolling
});
```

---

## Success Metrics

After implementation, you should see:

✅ All courses loading from MongoDB
✅ User enrollments tracked in database
✅ Completion history visible
✅ Reels loading from API
✅ Like/unlike working
✅ Admin uploads creating courses
✅ Videos stored in GridFS
✅ Recommendations based on mood
✅ User can log out and log back in
✅ Data persists across sessions

---

## Questions During Implementation?

Refer to:
- **API Documentation:** `API_QUICK_REFERENCE.md`
- **System State:** `SYSTEM_STATE_REPORT.md`
- **API Service:** `src/utils/api.ts` (has comments)
- **Backend Routes:** `backend/src/routes/` (see all endpoints)

---

## Estimated Timeline

- **Phase 1 (Easy Wins):** 2-3 hours
- **Phase 2 (Enrollment):** 2-3 hours
- **Phase 3 (Admin):** 3-4 hours
- **Phase 4 (Recommendations):** 2-3 hours

**Total:** 9-13 hours for full integration

---

**Next Step:** Start with CourseGrid.tsx - it's the easiest!

```typescript
// CourseGrid.tsx - Start here
import { apiService } from '@/utils/api';
import { useEffect, useState } from 'react';

export function CourseGrid() {
  const [courses, setCourses] = useState([]);
  
  useEffect(() => {
    apiService.courses.getAll().then(setCourses);
  }, []);
  
  return (
    <div className="grid">
      {courses.map(course => (
        <CourseCard key={course._id} course={course} />
      ))}
    </div>
  );
}
```

Good luck! 🚀
