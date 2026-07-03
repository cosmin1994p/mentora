import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import 'main/home_screen.dart';
import 'main/courses_screen.dart';
import 'main/reels_screen.dart';
import 'main/my_learning_screen.dart';
import 'main/profile_screen.dart';
import 'admin/admin_panel_screen.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final isAdmin = ref.watch(isAdminProvider);

    final screens = [
      const HomeScreen(),
      const CoursesScreen(),
      const ReelsScreen(),
      const MyLearningScreen(),
      if (isAdmin) const AdminPanelScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.book),
            label: 'Courses',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.play_circle),
            label: 'Reels',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.school),
            label: 'Learning',
          ),
          if (isAdmin)
            const BottomNavigationBarItem(
              icon: Icon(Icons.admin_panel_settings),
              label: 'Admin',
            ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
