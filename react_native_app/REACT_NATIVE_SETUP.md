# React Native + Expo Application Setup Guide

## Project Overview

Complete React Native + Expo learning platform with the same features as the React web and Flutter applications.

**Tech Stack:**
- React Native 0.73.0
- Expo 50.0.0
- Zustand (State Management)
- AsyncStorage (Persistent Storage)
- React Navigation v6
- Nativewind (Tailwind CSS for RN)
- Axios (API Client)

## Installation & Setup

### 1. Install Dependencies

```bash
cd react_native_app
npm install
# or
yarn install
```

### 2. Install Expo CLI Globally (if not already installed)

```bash
npm install -g expo-cli
```

### 3. Start the Development Server

```bash
npm start
# or
expo start
```

### 4. Run on Device/Emulator

After running `npm start`, you'll see options to:
- **iOS Simulator:** Press `i`
- **Android Emulator:** Press `a`
- **Web Browser:** Press `w`
- **iOS Device:** Scan QR code with Expo Go app
- **Android Device:** Scan QR code with Expo Go app

## Project Structure

```
react_native_app/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx          ✅ CREATED
│   │   │   └── RegisterScreen.tsx       ✅ CREATED
│   │   ├── main/
│   │   │   ├── HomeScreen.tsx           ✅ CREATED
│   │   │   ├── CoursesScreen.tsx        ✅ CREATED
│   │   │   ├── ReelsScreen.tsx          ✅ CREATED
│   │   │   ├── MyLearningScreen.tsx     ✅ CREATED
│   │   │   ├── ProfileScreen.tsx        ✅ CREATED
│   │   │   ├── AdminPanelScreen.tsx     ✅ CREATED
│   │   │   ├── CourseDetailScreen.tsx   ⏳ TODO
│   │   │   ├── ReelViewerScreen.tsx     ⏳ TODO
│   │   │   └── VideoPlayerScreen.tsx    ⏳ TODO
│   │   └── admin/
│   │       ├── AdminVideoManagement.tsx  ✅ CREATED
│   │       ├── AdminUserManagement.tsx   ✅ CREATED
│   │       └── AdminAnalytics.tsx        ✅ CREATED
│   ├── services/
│   │   └── apiService.ts                ✅ CREATED (20+ endpoints)
│   ├── store/
│   │   └── authStore.ts                 ✅ CREATED (Zustand state)
│   ├── navigation/
│   │   └── RootNavigator.tsx            ✅ CREATED
│   ├── components/
│   │   ├── CourseCard.tsx               ⏳ TODO
│   │   ├── ReelCard.tsx                 ⏳ TODO
│   │   └── ...
│   └── types/
│       └── index.ts                     ⏳ TODO
├── App.tsx                              ✅ CREATED
├── app.json                             ✅ CREATED
├── package.json                         ✅ CREATED
├── eas.json                             ⏳ TODO (EAS Build config)
└── babel.config.js                      ⏳ TODO
```

## Available Screens (Completed)

### Authentication
- **LoginScreen** - User login with username/password
- **RegisterScreen** - New user registration

### Main Application
- **HomeScreen** - Featured courses and trending reels
- **CoursesScreen** - Browse all courses with category filter
- **ReelsScreen** - TikTok-style vertical reel feed
- **MyLearningScreen** - Enrolled courses with progress tracking
- **ProfileScreen** - User profile and account settings
- **AdminPanelScreen** - Admin dashboard with tabs

### Admin Tabs
- **AdminVideoManagement** - Upload and manage course videos
- **AdminUserManagement** - View and manage users
- **AdminAnalytics** - Platform statistics and analytics

## API Service

Complete implementation with 20+ endpoints:

### Authentication
```typescript
apiService.login(username, password)
apiService.register(username, email, password, name)
```

### Courses
```typescript
apiService.getAllCourses()
apiService.getCourseById(id)
apiService.getCoursesByCategory(category)
apiService.enrollCourse(courseId)
apiService.completeCourse(courseId)
```

### Reels
```typescript
apiService.getAllReels()
apiService.getReelById(id)
apiService.getReelsByCategory(category)
apiService.likeReel(reelId)
apiService.watchReel(reelId)
```

### User Profile
```typescript
apiService.getUserProfile()
apiService.updateUserProfile(data)
apiService.updateUserBackground(backgroundData)
apiService.getMyEnrolledCourses()
apiService.getMyCompletedCourses()
```

### Admin Endpoints
```typescript
apiService.uploadVideo(formData)
apiService.deleteVideo(videoId)
apiService.getAdminVideos()
apiService.getAllUsers()
apiService.getUserActivity(userId)
apiService.getPlatformAnalytics()
apiService.getTopCourses()
apiService.uploadMedia(formData)
apiService.getMedia()
```

## State Management

**Zustand Store (src/store/authStore.ts)**

```typescript
// State
user: User | null
token: string | null
isLoading: boolean
error: string | null
isAuthenticated: boolean

// Actions
initialize() - Load session from storage
login(username, password)
register(username, email, password, name)
logout() - Clear session
updateProfile(data)
clearError()
```

## Navigation Structure

```
RootNavigator
├── AuthStack (when not authenticated)
│   ├── LoginScreen
│   └── RegisterScreen
└── MainTabs (when authenticated)
    ├── Home
    ├── Courses
    ├── Reels
    ├── My Learning
    ├── Admin (conditional - admin only)
    └── Profile
```

## Styling

Uses **Nativewind** (Tailwind CSS for React Native):

```typescript
<View className="flex-1 bg-[#0A0E27] px-4">
  <Text className="text-white text-3xl font-bold">Title</Text>
  <TouchableOpacity className="bg-[#EA7E5C] rounded-lg py-3">
    <Text className="text-white font-bold text-center">Button</Text>
  </TouchableOpacity>
</View>
```

## Building for Production

### For iOS (Mac required)

```bash
eas build --platform ios
```

### For Android

```bash
eas build --platform android
```

### For Both Platforms

```bash
eas build
```

## Submitting to App Stores

### iOS App Store
1. Build with EAS: `eas build --platform ios`
2. Sign in with Apple Developer account
3. Use Xcode to submit

### Google Play Store
1. Build with EAS: `eas build --platform android`
2. Sign in with Google Play account
3. Upload APK/AAB to Play Console

## Environment Variables

Create `.env` file:

```env
EXPO_PUBLIC_API_URL=https://your-backend.com/api
EXPO_PUBLIC_APP_NAME=StreamClass
```

Access in code:
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

## Debugging

### Enable Debugger
Press `d` in the Expo CLI to open the debugger menu.

### View Logs
- Expo CLI shows all console.log output
- Use React Native Debugger for more advanced debugging

### Performance Monitoring
- Use React Native Performance Monitor
- Check app size with `eas build --analyze`

## Common Issues & Solutions

### iOS Build Fails
```bash
# Clear cache and rebuild
rm -rf ~/Library/Developer/Xcode/DerivedData
eas build --platform ios --clear-cache
```

### Android Build Fails
```bash
# Clear Android cache
rm -rf android/.gradle
eas build --platform android --clear-cache
```

### App Crashes on Startup
1. Check `App.tsx` for font loading issues
2. Ensure all imports are correct
3. Check AsyncStorage initialization

### API Requests Fail
1. Verify `apiService.ts` has correct base URL
2. Check network permissions in `app.json`
3. Ensure backend is running and accessible

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:e2e
```

## Performance Tips

1. **Optimize Images** - Use WebP format with fallback
2. **Code Splitting** - Use dynamic imports for heavy modules
3. **Bundle Analysis** - `eas build --analyze`
4. **Memory Usage** - Monitor with React Native Performance Monitor

## Next Steps

1. ✅ Complete screen implementations (4 remaining)
2. ✅ Add missing detail screens (course detail, reel viewer, etc)
3. ⏳ Implement video player component
4. ⏳ Add push notifications
5. ⏳ Implement offline mode with caching
6. ⏳ Add analytics tracking
7. ⏳ Build for iOS and Android
8. ⏳ Submit to app stores

## Backend API Contract

All endpoints expect JWT token in header:
```
Authorization: Bearer {token}
```

Base URL: Configured in `apiService.ts`

Response Format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

Error Format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Resources

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [Nativewind Docs](https://www.nativewind.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

## Support

For issues or questions:
1. Check the error message carefully
2. Review the relevant screen component
3. Check API service implementation
4. Verify backend is running
5. Check network connectivity

---

**Last Updated:** January 3, 2026
**Status:** Foundation Complete, Screens in Progress
**Estimated Completion:** 40-60 hours for full implementation
