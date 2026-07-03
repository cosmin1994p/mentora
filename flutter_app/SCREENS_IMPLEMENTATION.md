# Flutter App - Screen Implementation Guide

## 📱 All Screens to Implement

This guide shows the implementation structure for all Flutter screens.

---

## 🏠 Home Screen (`lib/screens/main/home_screen.dart`)

```dart
class HomeScreen extends ConsumerWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'StreamClass',
        onSearchPressed: () {},
        onNotificationsPressed: () {},
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Hero Section with featured course
            HeroCarousel(
              courses: ref.watch(featuredCoursesProvider),
            ),
            
            // Recommended For You
            SectionHeader(title: 'Recommended For You'),
            CourseCarousel(
              courses: ref.watch(recommendedCoursesProvider),
            ),
            
            // Trending Reels
            SectionHeader(title: 'Trending Now'),
            ReelCarousel(
              reels: ref.watch(trendingReelsProvider),
            ),
            
            // Categories
            SectionHeader(title: 'Categories'),
            CategoriesGrid(
              categories: ref.watch(categoriesProvider),
            ),
            
            // Continue Watching
            SectionHeader(title: 'Continue Watching'),
            ContinueWatchingCarousel(
              courses: ref.watch(continueWatchingProvider),
            ),
          ],
        ),
      ),
    );
  }
}
```

### Features
- Pull-to-refresh
- Featured course carousel
- Recommended courses (AI-powered)
- Trending reels
- Category quick access
- Continue watching section
- Search integration
- Notifications badge

---

## 📚 Courses Screen (`lib/screens/main/courses_screen.dart`)

```dart
class CoursesScreen extends ConsumerStatefulWidget {
  const CoursesScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends ConsumerState<CoursesScreen> {
  String? _selectedCategory;
  String _sortBy = 'newest';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courses = ref.watch(coursesByCategoryProvider(_selectedCategory));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courses'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search courses...',
                    prefixIcon: const Icon(Icons.search),
                  ),
                  onChanged: (query) => setState(() => _searchQuery = query),
                ),
              ),
              
              // Category Filter
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All'),
                      selected: _selectedCategory == null,
                      onSelected: (_) => setState(() => _selectedCategory = null),
                    ),
                    // Add category chips dynamically
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: courses.when(
        data: (courseList) => GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.7,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: courseList.length,
          itemBuilder: (context, index) => CourseCard(
            course: courseList[index],
            onTap: () {
              Navigator.of(context).pushNamed(
                '/course-detail',
                arguments: courseList[index].id,
              );
            },
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
```

### Features
- Grid/List view toggle
- Search functionality
- Category filters
- Sort options (newest, popular, rating, price)
- Infinite scrolling
- Course cards with enrollment button
- Loading states
- Error handling

---

## 🎬 Reels Screen (`lib/screens/main/reels_screen.dart`)

```dart
class ReelsScreen extends ConsumerWidget {
  const ReelsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reels = ref.watch(reelsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reels'),
        elevation: 0,
      ),
      body: reels.when(
        data: (reelList) => PageView.builder(
          scrollDirection: Axis.vertical,
          itemCount: reelList.length,
          itemBuilder: (context, index) => ReelViewerScreen(
            reel: reelList[index],
            onLike: () => ref.read(apiServiceProvider).likeReel(reelList[index].id),
            onWatch: () => ref.read(apiServiceProvider).watchReel(reelList[index].id),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }
}

class ReelViewerScreen extends ConsumerWidget {
  final Reel reel;
  final VoidCallback onLike;
  final VoidCallback onWatch;

  const ReelViewerScreen({
    required this.reel,
    required this.onLike,
    required this.onWatch,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Stack(
      children: [
        // Video Player
        CachedNetworkImage(
          imageUrl: reel.thumbnailUrl,
          fit: BoxFit.cover,
        ),
        
        // Play Button Overlay
        Center(
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.play_arrow, color: Colors.white, size: 40),
          ),
        ),
        
        // Creator Info (Bottom Left)
        Positioned(
          bottom: 60,
          left: 16,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                reel.creator,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                reel.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        
        // Actions (Right Side)
        Positioned(
          right: 16,
          bottom: 60,
          child: Column(
            children: [
              ActionButton(
                icon: Icons.favorite,
                count: reel.likes,
                onPressed: onLike,
              ),
              const SizedBox(height: 24),
              ActionButton(
                icon: Icons.comment,
                count: 0,
                onPressed: () {},
              ),
              const SizedBox(height: 24),
              ActionButton(
                icon: Icons.share,
                count: reel.shares,
                onPressed: () {},
              ),
            ],
          ),
        ),
      ],
    );
  }
}
```

### Features
- Full-screen vertical scroll (TikTok-style)
- Auto-play on visible
- Like button with animation
- Comment button
- Share functionality
- Creator profile info
- Watch tracking
- Sound/music info
- Swipe gestures

---

## 📖 My Learning Screen (`lib/screens/main/my_learning_screen.dart`)

```dart
class MyLearningScreen extends ConsumerStatefulWidget {
  const MyLearningScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MyLearningScreen> createState() => _MyLearningScreenState();
}

class _MyLearningScreenState extends ConsumerState<MyLearningScreen> with TickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Learning'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Enrolled'),
            Tab(text: 'Completed'),
            Tab(text: 'Bookmarked'),
            Tab(text: 'Downloads'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Enrolled Tab
          ref.watch(myEnrolledCoursesProvider).when(
            data: (courses) => ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: courses.length,
              itemBuilder: (context, index) => CourseProgressCard(
                course: courses[index],
              ),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(child: Text('Error: $error')),
          ),
          
          // Completed Tab
          ref.watch(myCompletedCoursesProvider).when(
            data: (courses) => GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.7,
              ),
              itemCount: courses.length,
              itemBuilder: (context, index) => CompletedCourseCard(
                course: courses[index],
              ),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(child: Text('Error: $error')),
          ),
          
          // Bookmarked Tab (placeholder)
          const Center(child: Text('No bookmarks yet')),
          
          // Downloads Tab (placeholder)
          const Center(child: Text('No downloads yet')),
        ],
      ),
    );
  }
}
```

### Features
- 4 tabs: Enrolled, Completed, Bookmarked, Downloads
- Progress tracking with progress bars
- Resume learning button
- Certificate download button
- Re-watch completed courses
- Bookmark management
- Offline downloads
- Filter & sort options

---

## 👤 Profile Screen (`lib/screens/main/profile_screen.dart`)

```dart
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isAdmin = ref.watch(isAdminProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {},
          ),
        ],
      ),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Avatar & Info
                  Center(
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 60,
                          backgroundImage: NetworkImage(user.avatar),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          user.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          style: TextStyle(
                            color: Colors.grey[400],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.2),
                            border: Border.all(color: AppTheme.primaryColor),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            isAdmin ? 'Admin' : 'Student',
                            style: const TextStyle(
                              color: AppTheme.primaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Statistics
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      StatItem(
                        label: 'Enrolled',
                        value: user.enrolledCourses.length.toString(),
                      ),
                      StatItem(
                        label: 'Completed',
                        value: user.completedCourses.length.toString(),
                      ),
                      StatItem(
                        label: 'Engagement',
                        value: '${user.background?.profession?.experienceYears ?? 0}%',
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Background Info
                  if (user.background != null) ...[
                    SectionHeader(title: 'Background'),
                    BackgroundInfoCard(background: user.background!),
                    const SizedBox(height: 24),
                  ],

                  // Bio
                  SectionHeader(title: 'About'),
                  Text(
                    user.bio,
                    style: TextStyle(
                      color: Colors.grey[300],
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Action Buttons
                  ElevatedButton(
                    onPressed: () {},
                    child: const Text('Edit Profile'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () {},
                    child: const Text('Change Password'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () {},
                    child: const Text('Settings'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () {
                      ref.read(authProvider.notifier).logout();
                      Navigator.of(context).pushReplacementNamed('/login');
                    },
                    child: const Text('Logout'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.errorColor,
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
```

### Features
- User avatar with edit option
- User statistics
- Background information display
- Bio/About section
- Edit profile
- Change password
- Account settings
- Logout button

---

## 👨‍💼 Admin Panel Screen (`lib/screens/admin/admin_panel_screen.dart`)

```dart
class AdminPanelScreen extends ConsumerStatefulWidget {
  const AdminPanelScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends ConsumerState<AdminPanelScreen> with TickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Courses'),
            Tab(text: 'Reels'),
            Tab(text: 'Videos'),
            Tab(text: 'Media'),
            Tab(text: 'Users'),
            Tab(text: 'Analytics'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          const AdminCoursesTab(),
          const AdminReelsTab(),
          const AdminVideosTab(),
          const AdminMediaTab(),
          const AdminUsersTab(),
          const AdminAnalyticsTab(),
        ],
      ),
    );
  }
}
```

### Admin Tabs

#### 1. Courses Tab (`lib/screens/admin/admin_courses_tab.dart`)
- Create/Edit/Delete courses
- Course list with search
- Course statistics

#### 2. Reels Tab (`lib/screens/admin/admin_reels_tab.dart`)
- Upload reels
- Reel management
- Statistics (views, likes, shares)

#### 3. Videos Tab (`lib/screens/admin/admin_videos_tab.dart`)
- Upload videos (title, type, quality)
- Video grid/list
- Status management (draft/published/archived)
- Filter & search

#### 4. Media Tab (`lib/screens/admin/admin_media_tab.dart`)
- Upload photos & stories
- Media gallery
- File management
- Storage statistics

#### 5. Users Tab (`lib/screens/admin/admin_users_tab.dart`)
- User list with search
- Filter (all/active/inactive)
- User details modal
- Activity tracking
- Background info display

#### 6. Analytics Tab (`lib/screens/admin/admin_analytics_tab.dart`)
- KPI cards (users, engagement, enrollments)
- Charts (top courses, tags distribution)
- Period selector
- Export options (PDF, CSV)

---

## 🎬 Course Detail Screen (`lib/screens/details/course_detail_screen.dart`)

```dart
class CourseDetailScreen extends ConsumerWidget {
  final String courseId;

  const CourseDetailScreen({
    required this.courseId,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courseAsync = ref.watch(courseByIdProvider(courseId));

    return Scaffold(
      body: courseAsync.when(
        data: (course) => CustomScrollView(
          slivers: [
            // App Bar with course image
            SliverAppBar(
              expandedHeight: 200,
              flexibleSpace: FlexibleSpaceBar(
                background: CachedNetworkImage(
                  imageUrl: course.image,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            
            // Course Info
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      course.title,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    // Instructor
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundImage: NetworkImage(course.instructorImage),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(course.instructor),
                            Text(
                              '${course.enrollments} students',
                              style: TextStyle(color: Colors.grey[400]),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    // Rating & Price
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 20),
                            const SizedBox(width: 4),
                            Text('${course.rating}'),
                            const SizedBox(width: 8),
                            Text('(${course.reviews} reviews)'),
                          ],
                        ),
                        Text(
                          '\$${course.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // Enroll Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          ref.read(apiServiceProvider).enrollCourse(courseId);
                        },
                        child: const Text('Enroll Now'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Sections
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // About
                    SectionHeader(title: 'About'),
                    Text(course.description),
                    const SizedBox(height: 24),
                    
                    // What you'll learn
                    SectionHeader(title: 'What you\'ll learn'),
                    // List of learning points
                    
                    // Lessons
                    SectionHeader(title: 'Lessons (${course.totalLessons})'),
                    // Lessons list
                  ],
                ),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
```

---

## 📝 Additional Screens to Implement

1. **Video Player Screen** - Full video playback with controls
2. **Reel Player Screen** - Full-screen reel playback
3. **Edit Profile Screen** - Update user information
4. **Settings Screen** - Theme, language, notifications
5. **Notifications Screen** - View all notifications
6. **Search Results Screen** - Display search results

---

## 🔧 Utility Widgets

Create reusable widgets in `lib/widgets/`:

- `CourseCard` - Course display card
- `ReelCard` - Reel display card
- `UserCard` - User profile card
- `StatsCard` - Statistics display
- `CustomAppBar` - Header with search & notifications
- `BottomNav` - Bottom navigation bar
- `LoadingShimmer` - Skeleton loading
- `ActionButton` - Custom button for reels (like, comment, share)
- `SectionHeader` - Section title with action
- `CourseProgressCard` - Progress tracking card

---

## ✅ Implementation Checklist

**Screens:**
- [ ] SplashScreen
- [ ] LoginScreen
- [ ] RegisterScreen
- [ ] HomeScreen
- [ ] CoursesScreen
- [ ] CourseDetailScreen
- [ ] VideoPlayerScreen
- [ ] ReelsScreen
- [ ] ReelPlayerScreen
- [ ] MyLearningScreen
- [ ] ProfileScreen
- [ ] AdminPanelScreen (6 tabs)
- [ ] SettingsScreen

**Providers:**
- [ ] AuthProvider
- [ ] CoursesProvider
- [ ] ReelsProvider
- [ ] AdminProvider
- [ ] ThemeProvider

**Widgets:**
- [ ] CourseCard
- [ ] ReelCard
- [ ] CustomAppBar
- [ ] BottomNav
- [ ] StatsCard
- [ ] LoadingShimmer

**Services:**
- [x] ApiService (20+ endpoints)
- [x] Models & Serialization
- [ ] StorageService
- [ ] NotificationService

---

**Total Implementation Time:** 40-60 hours for complete Flutter app

**Current Status:** 
- ✅ Project structure created
- ✅ Models & API service ready
- ✅ Auth provider setup
- ✅ Main screen layout created
- ✅ Splash & Login screens
- ⏳ Remaining screens to implement
