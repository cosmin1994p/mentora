import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';
import '../models/models.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:5000/api';
  
  late final Dio _dio;
  final Logger _logger = Logger();
  late SharedPreferences _prefs;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        contentType: 'application/json',
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          _logger.i('🔵 ${options.method} ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          _logger.i('🟢 ${response.statusCode} ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (error, handler) {
          _logger.e('🔴 ${error.response?.statusCode} ${error.requestOptions.path}');
          return handler.next(error);
        },
      ),
    );
  }

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    
    // Add auth token interceptor
    final token = _prefs.getString('authToken');
    if (token != null) {
      _setAuthToken(token);
    }
  }

  void _setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  // ==================== AUTH ENDPOINTS ====================
  
  Future<AuthResponse> login(String username, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {
          'username': username,
          'password': password,
        },
      );

      final authResponse = AuthResponse.fromJson(response.data['data']);
      
      // Save token
      await _prefs.setString('authToken', authResponse.token);
      _setAuthToken(authResponse.token);
      
      // Save user profile
      await _prefs.setString('userProfile', authResponse.user.toJson().toString());
      
      return authResponse;
    } on DioException catch (e) {
      _logger.e('Login error: ${e.message}');
      rethrow;
    }
  }

  Future<AuthResponse> register(String username, String email, String password, String name) async {
    try {
      final response = await _dio.post(
        '/auth/register',
        data: {
          'username': username,
          'email': email,
          'password': password,
          'name': name,
        },
      );

      final authResponse = AuthResponse.fromJson(response.data['data']);
      
      // Save token
      await _prefs.setString('authToken', authResponse.token);
      _setAuthToken(authResponse.token);
      
      return authResponse;
    } on DioException catch (e) {
      _logger.e('Register error: ${e.message}');
      rethrow;
    }
  }

  Future<void> logout() async {
    await _prefs.remove('authToken');
    await _prefs.remove('userProfile');
    _dio.options.headers.remove('Authorization');
  }

  // ==================== COURSE ENDPOINTS ====================
  
  Future<List<Course>> getAllCourses() async {
    try {
      final response = await _dio.get('/courses');
      final courses = (response.data['data'] as List)
          .map((e) => Course.fromJson(e))
          .toList();
      return courses;
    } on DioException catch (e) {
      _logger.e('Get courses error: ${e.message}');
      rethrow;
    }
  }

  Future<Course> getCourseById(String courseId) async {
    try {
      final response = await _dio.get('/courses/$courseId');
      return Course.fromJson(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get course error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Course>> getCoursesByCategory(String category) async {
    try {
      final response = await _dio.get(
        '/courses',
        queryParameters: {'category': category},
      );
      final courses = (response.data['data'] as List)
          .map((e) => Course.fromJson(e))
          .toList();
      return courses;
    } on DioException catch (e) {
      _logger.e('Get courses by category error: ${e.message}');
      rethrow;
    }
  }

  Future<void> enrollCourse(String courseId) async {
    try {
      await _dio.post('/courses/$courseId/enroll');
    } on DioException catch (e) {
      _logger.e('Enroll course error: ${e.message}');
      rethrow;
    }
  }

  Future<void> completeCourse(String courseId) async {
    try {
      await _dio.post('/courses/$courseId/complete');
    } on DioException catch (e) {
      _logger.e('Complete course error: ${e.message}');
      rethrow;
    }
  }

  // ==================== REEL ENDPOINTS ====================
  
  Future<List<Reel>> getAllReels() async {
    try {
      final response = await _dio.get('/reels');
      final reels = (response.data['data'] as List)
          .map((e) => Reel.fromJson(e))
          .toList();
      return reels;
    } on DioException catch (e) {
      _logger.e('Get reels error: ${e.message}');
      rethrow;
    }
  }

  Future<Reel> getReelById(String reelId) async {
    try {
      final response = await _dio.get('/reels/$reelId');
      return Reel.fromJson(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get reel error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Reel>> getReelsByCategory(String category) async {
    try {
      final response = await _dio.get(
        '/reels',
        queryParameters: {'category': category},
      );
      final reels = (response.data['data'] as List)
          .map((e) => Reel.fromJson(e))
          .toList();
      return reels;
    } on DioException catch (e) {
      _logger.e('Get reels by category error: ${e.message}');
      rethrow;
    }
  }

  Future<void> likeReel(String reelId) async {
    try {
      await _dio.post('/reels/$reelId/like');
    } on DioException catch (e) {
      _logger.e('Like reel error: ${e.message}');
      rethrow;
    }
  }

  Future<void> watchReel(String reelId) async {
    try {
      await _dio.post('/reels/$reelId/watch');
    } on DioException catch (e) {
      _logger.e('Watch reel error: ${e.message}');
      rethrow;
    }
  }

  // ==================== USER ENDPOINTS ====================
  
  Future<User> getUserProfile() async {
    try {
      final response = await _dio.get('/user/profile');
      return User.fromJson(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get user profile error: ${e.message}');
      rethrow;
    }
  }

  Future<void> updateUserProfile(Map<String, dynamic> data) async {
    try {
      await _dio.put('/user/profile', data: data);
    } on DioException catch (e) {
      _logger.e('Update user profile error: ${e.message}');
      rethrow;
    }
  }

  Future<void> updateUserBackground(Map<String, dynamic> backgroundData) async {
    try {
      await _dio.put('/user/background', data: backgroundData);
    } on DioException catch (e) {
      _logger.e('Update user background error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Course>> getMyEnrolledCourses() async {
    try {
      final response = await _dio.get('/user/courses');
      final courses = (response.data['data'] as List)
          .map((e) => Course.fromJson(e))
          .toList();
      return courses;
    } on DioException catch (e) {
      _logger.e('Get enrolled courses error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Course>> getMyCompletedCourses() async {
    try {
      final response = await _dio.get('/user/completed-courses');
      final courses = (response.data['data'] as List)
          .map((e) => Course.fromJson(e))
          .toList();
      return courses;
    } on DioException catch (e) {
      _logger.e('Get completed courses error: ${e.message}');
      rethrow;
    }
  }

  // ==================== ADMIN ENDPOINTS ====================
  
  // Video Management
  Future<void> uploadVideo({
    required String title,
    required String type,
    required String quality,
    required String videoPath,
  }) async {
    try {
      final formData = FormData.fromMap({
        'title': title,
        'type': type,
        'quality': quality,
        'video': await MultipartFile.fromFile(videoPath),
      });

      await _dio.post('/admin/videos', data: formData);
    } on DioException catch (e) {
      _logger.e('Upload video error: ${e.message}');
      rethrow;
    }
  }

  Future<void> deleteVideo(String videoId) async {
    try {
      await _dio.delete('/admin/videos/$videoId');
    } on DioException catch (e) {
      _logger.e('Delete video error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Course>> getAdminVideos({String? type, String? status}) async {
    try {
      final response = await _dio.get(
        '/admin/videos',
        queryParameters: {
          if (type != null) 'type': type,
          if (status != null) 'status': status,
        },
      );
      final videos = (response.data['data'] as List)
          .map((e) => Course.fromJson(e))
          .toList();
      return videos;
    } on DioException catch (e) {
      _logger.e('Get admin videos error: ${e.message}');
      rethrow;
    }
  }

  // User Management
  Future<List<User>> getAllUsers({String? filter}) async {
    try {
      final response = await _dio.get(
        '/admin/users',
        queryParameters: {
          if (filter != null) 'filter': filter,
        },
      );
      final users = (response.data['data'] as List)
          .map((e) => User.fromJson(e))
          .toList();
      return users;
    } on DioException catch (e) {
      _logger.e('Get all users error: ${e.message}');
      rethrow;
    }
  }

  Future<List<UserActivity>> getUserActivity(String userId) async {
    try {
      final response = await _dio.get('/admin/users/$userId/activity');
      final activities = (response.data['data'] as List)
          .map((e) => UserActivity.fromJson(e))
          .toList();
      return activities;
    } on DioException catch (e) {
      _logger.e('Get user activity error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Course>> getUserCourseHistory(String userId) async {
    try {
      final response = await _dio.get('/admin/users/$userId/course-history');
      final courses = (response.data['data'] as List)
          .map((e) => Course.fromJson(e))
          .toList();
      return courses;
    } on DioException catch (e) {
      _logger.e('Get user course history error: ${e.message}');
      rethrow;
    }
  }

  Future<UserEngagementMetrics> getUserEngagementMetrics(String userId) async {
    try {
      final response = await _dio.get('/admin/users/$userId/engagement-metrics');
      return UserEngagementMetrics.fromJson(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get user engagement metrics error: ${e.message}');
      rethrow;
    }
  }

  Future<UserBackground?> getUserBackground(String userId) async {
    try {
      final response = await _dio.get('/admin/users/$userId/background');
      return UserBackground.fromJson(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get user background error: ${e.message}');
      rethrow;
    }
  }

  // Analytics
  Future<PlatformAnalytics> getPlatformAnalytics({String? period}) async {
    try {
      final response = await _dio.get(
        '/admin/analytics/platform',
        queryParameters: {
          if (period != null) 'period': period,
        },
      );
      return PlatformAnalytics.fromJson(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get platform analytics error: ${e.message}');
      rethrow;
    }
  }

  Future<List<TopCourse>> getTopCourses({int? limit}) async {
    try {
      final response = await _dio.get(
        '/admin/analytics/top-courses',
        queryParameters: {
          if (limit != null) 'limit': limit,
        },
      );
      final courses = (response.data['data'] as List)
          .map((e) => TopCourse.fromJson(e))
          .toList();
      return courses;
    } on DioException catch (e) {
      _logger.e('Get top courses error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getTopTags({int? limit}) async {
    try {
      final response = await _dio.get(
        '/admin/analytics/top-tags',
        queryParameters: {
          if (limit != null) 'limit': limit,
        },
      );
      return List<Map<String, dynamic>>.from(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get top tags error: ${e.message}');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getStatisticsReport({String? period}) async {
    try {
      final response = await _dio.get(
        '/admin/analytics/report',
        queryParameters: {
          if (period != null) 'period': period,
        },
      );
      return response.data['data'];
    } on DioException catch (e) {
      _logger.e('Get statistics report error: ${e.message}');
      rethrow;
    }
  }

  // Media Management
  Future<void> uploadMedia({
    required String type,
    required String filePath,
  }) async {
    try {
      final formData = FormData.fromMap({
        'type': type,
        'file': await MultipartFile.fromFile(filePath),
      });

      await _dio.post('/admin/media', data: formData);
    } on DioException catch (e) {
      _logger.e('Upload media error: ${e.message}');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getMedia({String? type}) async {
    try {
      final response = await _dio.get(
        '/admin/media',
        queryParameters: {
          if (type != null) 'type': type,
        },
      );
      return List<Map<String, dynamic>>.from(response.data['data']);
    } on DioException catch (e) {
      _logger.e('Get media error: ${e.message}');
      rethrow;
    }
  }

  Future<void> deleteMedia(String mediaId) async {
    try {
      await _dio.delete('/admin/media/$mediaId');
    } on DioException catch (e) {
      _logger.e('Delete media error: ${e.message}');
      rethrow;
    }
  }
}

// Riverpod Provider
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});
