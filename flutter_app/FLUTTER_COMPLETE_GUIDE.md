# StreamClass Flutter App - Complete Setup Guide

## 📱 Project Overview

StreamClass Flutter is a complete mobile implementation of the advanced online learning platform with:

- ✅ Complete authentication system
- ✅ Course management (enroll, watch, complete)
- ✅ Reel video platform (like, share, watch)
- ✅ User profile management with background data
- ✅ Admin dashboard (6 tabs)
- ✅ Real-time analytics and reporting
- ✅ MongoDB integration
- ✅ Responsive design (mobile-first)

---

## 🏗️ Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                          # App entry point
│   ├── config/
│   │   ├── theme.dart                     # Theme & colors (glassmorphism)
│   │   ├── constants.dart                 # App constants
│   │   └── routes.dart                    # Route management
│   ├── models/
│   │   ├── models.dart                    # All data models
│   │   └── models.g.dart                  # Generated serialization
│   ├── services/
│   │   ├── api_service.dart               # API client (20+ endpoints)
│   │   ├── storage_service.dart           # Local storage (SharedPrefs, Hive)
│   │   └── notification_service.dart      # Push notifications
│   ├── providers/
│   │   ├── auth_provider.dart             # Authentication state (Riverpod)
│   │   ├── course_provider.dart           # Courses data
│   │   ├── reel_provider.dart             # Reels data
│   │   ├── admin_provider.dart            # Admin panel state
│   │   └── theme_provider.dart            # Theme switching
│   ├── screens/
│   │   ├── splash_screen.dart             # Splash/Loading
│   │   ├── auth/
│   │   │   ├── login_screen.dart          # Login page
│   │   │   ├── register_screen.dart       # Registration page
│   │   │   └── forgot_password_screen.dart
│   │   ├── main/
│   │   │   ├── home_screen.dart           # Home with recommendations
│   │   │   ├── courses_screen.dart        # All courses with filters
│   │   │   ├── reels_screen.dart          # Reels feed (vertical scroll)
│   │   │   ├── my_learning_screen.dart    # My courses & progress
│   │   │   └── profile_screen.dart        # User profile
│   │   ├── details/
│   │   │   ├── course_detail_screen.dart  # Course info & lessons
│   │   │   ├── video_player_screen.dart   # Video playback
│   │   │   └── reel_player_screen.dart    # Full-screen reel
│   │   └── admin/
│   │       ├── admin_panel_screen.dart    # Admin 6 tabs
│   │       ├── admin_videos_tab.dart      # Video management
│   │       ├── admin_users_tab.dart       # User management
│   │       ├── admin_analytics_tab.dart   # Analytics dashboard
│   │       ├── admin_media_tab.dart       # Media upload
│   │       ├── admin_courses_tab.dart     # Course management
│   │       └── admin_reels_tab.dart       # Reel management
│   ├── widgets/
│   │   ├── course_card.dart               # Course UI component
│   │   ├── reel_card.dart                 # Reel UI component
│   │   ├── user_card.dart                 # User profile card
│   │   ├── stats_card.dart                # Statistics card
│   │   ├── custom_app_bar.dart            # Header with search
│   │   ├── bottom_nav.dart                # Bottom navigation
│   │   ├── video_thumbnail.dart           # Video with play button
│   │   └── loading_shimmer.dart           # Skeleton loading
│   └── utils/
│       ├── validators.dart                # Form validation
│       ├── formatters.dart                # Data formatting
│       ├── extensions.dart                # String/Date extensions
│       └── helpers.dart                   # Utility functions
├── assets/
│   ├── images/                            # Course/reel thumbnails
│   ├── logos/                             # App logo
│   ├── icons/                             # Custom icons
│   └── animations/                        # Lottie animations
├── pubspec.yaml                           # Dependencies
├── analysis_options.yaml                  # Linting rules
└── README.md                              # Documentation
```

---

## 🚀 Setup Instructions

### 1. Prerequisites
```bash
# Install Flutter SDK
# Download from https://flutter.dev/docs/get-started/install

# Verify installation
flutter --version
```

### 2. Create Flutter Project
```bash
# Clone or create new project
flutter create streamclass --org com.streamclass

cd streamclass
```

### 3. Add Dependencies
```bash
# All dependencies in pubspec.yaml
flutter pub get
```

### 4. Generate Models
```bash
# Generate serialization code for models
flutter pub run build_runner build

# Watch mode for development
flutter pub run build_runner watch
```

### 5. Run the App
```bash
# iOS
flutter run -d ios

# Android
flutter run -d android

# Web
flutter run -d chrome

# Specific device
flutter devices
flutter run -d <device-id>
```

---

## 🔐 Authentication Flow

### Login Screen (lib/screens/auth/login_screen.dart)
```dart
// Features:
// - Email/username field
// - Password field with show/hide toggle
// - "Remember me" checkbox
// - "Forgot password?" link
// - Login button with loading state
// - "Create account" link
// - Form validation

class LoginScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authNotifier = ref.read(authProvider.notifier);
    final isLoading = ref.watch(authProvider).isLoading;
    
    // Implementation...
  }
}
```

### Registration Screen (lib/screens/auth/register_screen.dart)
```dart
// Features:
// - Name field
// - Email field
// - Username field
// - Password field with strength indicator
// - Confirm password field
// - Terms of service checkbox
// - Register button
// - Form validation
// - Auto-login after registration
```

### Auth Guards
```dart
// Only authenticated users can access:
// - Home
// - Courses
// - Reels
// - My Learning
// - Profile

// Only admins can access:
// - Admin Panel (6 tabs)

// Routes automatically redirect:
// - Unauthenticated → Login
// - Authenticated non-admin accessing /admin → Home
```

---

## 📚 Main Features

### 1. Home Screen
```dart
// Components:
// - Header with search & notifications
// - Recommended courses carousel
// - Featured reels carousel
// - Categories horizontal list
// - "Continue watching" section
// - Trending content
// - Pull-to-refresh
```

### 2. Courses Screen
```dart
// Features:
// - Grid/List view toggle
// - Filter by category
// - Search functionality
// - Sort by: newest, popular, rating, price
// - Course cards showing:
//   - Thumbnail image
//   - Title
//   - Instructor name & photo
//   - Rating & reviews count
//   - Price
//   - "Enroll" button
// - Infinite scrolling/pagination
```

### 3. Course Detail Screen
```dart
// Sections:
// - Course banner & info
// - Instructor profile
// - Course stats (enrollments, rating, reviews)
// - Course description
// - What you'll learn (bullet points)
// - Requirements
// - Lessons list with:
//   - Lesson title
//   - Duration
//   - Completion status
//   - Lock icon (if not enrolled)
// - "Enroll now" button (if not enrolled)
// - "Go to lesson" button (if enrolled)
// - Reviews section
// - Related courses carousel
```

### 4. Video Player Screen
```dart
// Features:
// - Full-screen video player (Chewie)
// - Landscape support
// - Quality selector (SD/HD/4K)
// - Playback speed control
// - Progress tracking
// - Next lesson button
// - Lesson notes
// - Video description
// - Comments section
```

### 5. Reels Screen (TikTok-style)
```dart
// Features:
// - Vertical full-screen scroll
// - Auto-play on visible
// - Pause on scroll
// - Like button (with animation)
// - Share button
// - Comment button (opens sheet)
// - Creator info with follow button
// - Sound/music info
// - Watch tracking (analytics)
// - Swipe left for next, right for previous
```

### 6. My Learning Screen
```dart
// Tabs:
// 1. Enrolled Courses
//    - Course cards with progress bar
//    - Resume learning button
//    - Completion percentage
// 2. Completed Courses
//    - Certificates download
//    - Re-watch option
// 3. Bookmarked Content
// 4. Downloads
//    - Offline video playback
```

### 7. Profile Screen
```dart
// Sections:
// - User avatar with edit
// - Name & email
// - Bio/About section
// - Background data (if filled):
//   - Domain
//   - Education level & field
//   - Job title & company
//   - Location
// - Statistics:
//   - Courses enrolled
//   - Courses completed
//   - Engagement score
// - Settings (theme, language, notifications)
// - Edit profile button
// - Change password button
// - Account security
// - Logout button
```

---

## 👨‍💼 Admin Panel (6 Tabs)

### 1. Courses Tab
```dart
// Features:
// - Create new course
// - Course list with search
// - Edit course details
// - Delete course
// - Course statistics (enrollments, completion rate)
// - Bulk actions
```

### 2. Reels Tab
```dart
// Features:
// - Upload reel
// - Reel list with thumbnails
// - Edit reel metadata
// - Delete reel
// - Reel statistics (views, likes, shares)
// - Publishing status
```

### 3. Videos Tab
```dart
// Features:
// - Upload video (title, type, quality)
// - Video grid with:
//   - Thumbnail
//   - Status badge (draft/published/archived)
//   - Quality badge (SD/HD/4K)
//   - Views & likes count
//   - Actions: Edit, Delete
// - Filter by type & status
// - Search functionality
// - Video metadata display
```

### 4. Media Tab
```dart
// Features:
// - Upload media (photos, stories)
// - Media gallery
// - Media management (edit, delete)
// - Storage usage stats
// - Bulk upload
// - Organize into folders
```

### 5. Users Tab
```dart
// Features:
// - Users list with search & filters
// - Filter by: all, active, inactive
// - User detail modal showing:
//   - Name, email, avatar
//   - Enrolled/Completed courses
//   - Engagement score
//   - Background info:
//     - Domain, Education, Profession
//     - Location
//   - Activity history:
//     - Course enrolled, completed
//     - Reel watched
//     - Quizzes taken
//   - Last active date
// - User statistics
// - Bulk actions
```

### 6. Analytics Tab
```dart
// Features:
// - KPI Cards:
//   - Total Users
//   - Active Users (today)
//   - Total Enrollments
//   - Average Engagement Score
// - Charts:
//   - Bar chart: Top 10 courses
//   - Pie chart: Tag distribution
//   - Line chart: User growth trend
// - Period selector: Daily, Weekly, Monthly
// - Detailed metrics:
//   - Completion rate %
//   - User retention %
//   - Course performance
// - Export options:
//   - Download as PDF
//   - Download as CSV
//   - Share report link
// - Filters:
//   - Date range
//   - Category
//   - Course
```

---

## 📊 State Management (Riverpod)

### Auth Provider
```dart
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiServiceProvider));
});

// Usage in widgets
final isAuthenticated = ref.watch(isAuthenticatedProvider);
final currentUser = ref.watch(currentUserProvider);
final isAdmin = ref.watch(isAdminProvider);
```

### Course Provider
```dart
final coursesProvider = FutureProvider<List<Course>>((ref) async {
  return ref.watch(apiServiceProvider).getAllCourses();
});

final courseByCategoryProvider = FutureProvider
    .family<List<Course>, String>((ref, category) async {
  return ref.watch(apiServiceProvider).getCoursesByCategory(category);
});
```

### Admin Provider
```dart
final adminUsersProvider = FutureProvider<List<User>>((ref) async {
  return ref.watch(apiServiceProvider).getAllUsers();
});

final platformAnalyticsProvider = FutureProvider<PlatformAnalytics>((ref) async {
  return ref.watch(apiServiceProvider).getPlatformAnalytics();
});
```

---

## 🎨 UI Components & Theme

### Glassmorphism Design
```dart
// All components use glassmorphic effect:
// - Frosted glass cards
// - Blur backgrounds
// - Semi-transparent surfaces
// - Custom shadows & borders

Container(
  decoration: AppTheme.glassmorphism,
  child: // content
);
```

### Color Scheme
```dart
// Primary: #EA7E5C (Orange)
// Accent: #1DB8EA (Blue)
// Background: #0A0E27 (Dark)
// Surface: #141B2F (Dark grey)
// Success: #10B981 (Green)
// Error: #EF4444 (Red)
```

### Typography
```dart
// Font families:
// - Poppins (headings, UI)
// - Inter (body text)

// Font weights:
// - Bold (700) - titles
// - SemiBold (600) - subtitles
// - Regular (400) - body text
```

---

## 🔌 API Integration

### All 20+ Endpoints
```dart
// Auth
apiService.login(username, password)
apiService.register(username, email, password, name)
apiService.logout()

// Courses
apiService.getAllCourses()
apiService.getCourseById(courseId)
apiService.getCoursesByCategory(category)
apiService.enrollCourse(courseId)
apiService.completeCourse(courseId)

// Reels
apiService.getAllReels()
apiService.getReelsByCategory(category)
apiService.likeReel(reelId)
apiService.watchReel(reelId)

// User
apiService.getUserProfile()
apiService.updateUserProfile(data)
apiService.updateUserBackground(backgroundData)
apiService.getMyEnrolledCourses()
apiService.getMyCompletedCourses()

// Admin: Videos
apiService.uploadVideo(title, type, quality, path)
apiService.deleteVideo(videoId)
apiService.getAdminVideos(type, status)

// Admin: Users
apiService.getAllUsers(filter)
apiService.getUserActivity(userId)
apiService.getUserCourseHistory(userId)
apiService.getUserEngagementMetrics(userId)
apiService.getUserBackground(userId)

// Admin: Analytics
apiService.getPlatformAnalytics(period)
apiService.getTopCourses(limit)
apiService.getTopTags(limit)
apiService.getStatisticsReport(period)

// Admin: Media
apiService.uploadMedia(type, filePath)
apiService.getMedia(type)
apiService.deleteMedia(mediaId)
```

---

## 💾 Local Storage

### SharedPreferences
```dart
// Stores:
// - Authentication token
// - User preferences
// - App settings
// - Cache data
```

### Hive (Optional)
```dart
// For larger data caching:
// - Course list cache
// - User data cache
// - Reel cache
// - Offline support
```

---

## 🎬 Video & Media Handling

### Video Player (Chewie)
```dart
// Features:
// - HLS/MP4 streaming
// - Quality selection
// - Playback speed control
// - Full-screen mode
// - Progress tracking
// - Skip forward/backward
```

### Image Loading
```dart
// Uses cached_network_image for:
// - Thumbnail caching
// - Fade-in animations
// - Placeholder support
// - Error handling
```

### Media Upload
```dart
// Features:
// - Image picker
// - Video picker
// - File validation
// - Progress tracking
// - Resumable uploads
// - Compression options
```

---

## 📱 Responsive Design

### Breakpoints
```dart
// Mobile: < 600px
// Tablet: 600px - 1024px
// Desktop: > 1024px

// All screens are mobile-first
// Responsive layout using LayoutBuilder
```

### Platform Support
```dart
// ✅ iOS (iOS 12+)
// ✅ Android (SDK 21+)
// ✅ Web (Chrome, Firefox, Safari)
// ✅ Windows/macOS (future)
```

---

## 🧪 Testing (Future)

### Unit Tests
```bash
flutter test
```

### Widget Tests
```bash
flutter test test/widgets/
```

### Integration Tests
```bash
flutter drive
```

---

## 📦 Build & Deployment

### iOS
```bash
# Build iOS app
flutter build ios --release

# Upload to TestFlight/App Store
```

### Android
```bash
# Build APK
flutter build apk --release

# Build AppBundle for Play Store
flutter build appbundle --release

# Upload to Google Play
```

### Web
```bash
# Build web app
flutter build web --release

# Deploy to hosting (Firebase, Vercel, etc.)
```

---

## 🔐 Security

### API Security
```dart
// - All requests use HTTPS
// - JWT token authentication
// - Token stored securely (Keychain/Keystore)
// - Auto-refresh tokens
// - Request signing
```

### User Data
```dart
// - Sensitive data encrypted
// - Clear cache on logout
// - No sensitive info in logs
// - Secure password storage
```

---

## 📋 Features Checklist

**Authentication:**
- [x] Login screen
- [x] Registration screen
- [x] Password reset
- [x] Remember me
- [x] Form validation
- [x] Error handling

**Courses:**
- [x] Browse all courses
- [x] Filter by category
- [x] Search courses
- [x] Course detail page
- [x] Enroll in course
- [x] Track progress
- [x] Mark as complete
- [x] Rate & review

**Reels:**
- [x] Vertical feed (TikTok-style)
- [x] Like/Unlike
- [x] Share reel
- [x] View comments
- [x] Creator profile
- [x] Watch tracking

**Profile:**
- [x] View profile
- [x] Edit profile
- [x] Upload avatar
- [x] Add background info
- [x] View statistics
- [x] My learning history

**Admin Panel:**
- [x] Video management
- [x] User management
- [x] Analytics dashboard
- [x] Media upload
- [x] Course management
- [x] Reel management

**General:**
- [x] Bottom navigation
- [x] Search functionality
- [x] Notifications
- [x] Offline support (caching)
- [x] Dark theme
- [x] Responsive design
- [x] Error handling
- [x] Loading states

---

## 🆘 Troubleshooting

### Build Issues
```bash
# Clean build
flutter clean
flutter pub get
flutter pub run build_runner build

# Check dependencies
flutter doctor -v
```

### API Connection
```bash
# Check backend is running on localhost:5000
# Update baseUrl in api_service.dart if needed
# Enable Android/iOS networking
```

### Video Playback
```bash
# Install video_player plugin
# Add permissions for video access
```

---

## 📞 Support & Documentation

- **Flutter Docs**: https://flutter.dev/docs
- **Riverpod**: https://riverpod.dev
- **Dio**: https://pub.dev/packages/dio
- **Chewie**: https://pub.dev/packages/chewie

---

## 📄 License

StreamClass © 2024 - All Rights Reserved

---

**Last Updated:** January 3, 2026  
**Version:** 1.0.0  
**Status:** ✅ Complete Implementation Guide
