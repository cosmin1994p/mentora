import 'package:json_annotation/json_annotation.dart';

part 'models.g.dart';

// Auth Models
@JsonSerializable()
class User {
  @JsonKey(name: '_id')
  final String id;
  final String username;
  final String email;
  final String name;
  final String avatar;
  final String bio;
  final String role; // 'admin' or 'user'
  final List<String> enrolledCourses;
  final List<String> completedCourses;
  final UserBackground? background;
  final DateTime createdAt;
  final DateTime lastActiveAt;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.name,
    required this.avatar,
    required this.bio,
    required this.role,
    required this.enrolledCourses,
    required this.completedCourses,
    this.background,
    required this.createdAt,
    required this.lastActiveAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}

@JsonSerializable()
class UserBackground {
  final String? domain;
  final Education? education;
  final Profession? profession;
  final Location? location;

  UserBackground({
    this.domain,
    this.education,
    this.profession,
    this.location,
  });

  factory UserBackground.fromJson(Map<String, dynamic> json) =>
      _$UserBackgroundFromJson(json);
  Map<String, dynamic> toJson() => _$UserBackgroundToJson(this);
}

@JsonSerializable()
class Education {
  final String level;
  final String field;
  final String? institution;

  Education({
    required this.level,
    required this.field,
    this.institution,
  });

  factory Education.fromJson(Map<String, dynamic> json) =>
      _$EducationFromJson(json);
  Map<String, dynamic> toJson() => _$EducationToJson(this);
}

@JsonSerializable()
class Profession {
  @JsonKey(name: 'job_title')
  final String jobTitle;
  final String company;
  final String industry;
  @JsonKey(name: 'experience_years')
  final int experienceYears;

  Profession({
    required this.jobTitle,
    required this.company,
    required this.industry,
    required this.experienceYears,
  });

  factory Profession.fromJson(Map<String, dynamic> json) =>
      _$ProfessionFromJson(json);
  Map<String, dynamic> toJson() => _$ProfessionToJson(this);
}

@JsonSerializable()
class Location {
  final String country;
  final String city;

  Location({
    required this.country,
    required this.city,
  });

  factory Location.fromJson(Map<String, dynamic> json) =>
      _$LocationFromJson(json);
  Map<String, dynamic> toJson() => _$LocationToJson(this);
}

// Course Models
@JsonSerializable()
class Course {
  @JsonKey(name: '_id')
  final String id;
  final String title;
  final String description;
  final String category;
  final String instructor;
  final String instructorImage;
  final String image;
  final double rating;
  final int reviews;
  final int enrollments;
  final List<String> tags;
  final int totalLessons;
  final String duration;
  final List<Lesson> lessons;
  final double price;
  final String level;
  final List<String>? recomendedCourses;
  final DateTime createdAt;

  Course({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.instructor,
    required this.instructorImage,
    required this.image,
    required this.rating,
    required this.reviews,
    required this.enrollments,
    required this.tags,
    required this.totalLessons,
    required this.duration,
    required this.lessons,
    required this.price,
    required this.level,
    this.recomendedCourses,
    required this.createdAt,
  });

  factory Course.fromJson(Map<String, dynamic> json) => _$CourseFromJson(json);
  Map<String, dynamic> toJson() => _$CourseToJson(this);
}

@JsonSerializable()
class Lesson {
  @JsonKey(name: '_id')
  final String id;
  final String title;
  final String description;
  final String videoUrl;
  final String duration;
  final int order;

  Lesson({
    required this.id,
    required this.title,
    required this.description,
    required this.videoUrl,
    required this.duration,
    required this.order,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) => _$LessonFromJson(json);
  Map<String, dynamic> toJson() => _$LessonToJson(this);
}

// Reel Models
@JsonSerializable()
class Reel {
  @JsonKey(name: '_id')
  final String id;
  final String title;
  final String description;
  final String videoUrl;
  final String thumbnailUrl;
  final String creator;
  final String category;
  final List<String> tags;
  final int views;
  final int likes;
  final int shares;
  final double rating;
  final String duration;
  final DateTime createdAt;

  Reel({
    required this.id,
    required this.title,
    required this.description,
    required this.videoUrl,
    required this.thumbnailUrl,
    required this.creator,
    required this.category,
    required this.tags,
    required this.views,
    required this.likes,
    required this.shares,
    required this.rating,
    required this.duration,
    required this.createdAt,
  });

  factory Reel.fromJson(Map<String, dynamic> json) => _$ReelFromJson(json);
  Map<String, dynamic> toJson() => _$ReelToJson(this);
}

// Admin Models
@JsonSerializable()
class UserActivity {
  @JsonKey(name: '_id')
  final String id;
  @JsonKey(name: 'userId')
  final String userId;
  final String type; // 'course_enrolled', 'course_completed', etc.
  @JsonKey(name: 'courseId')
  final String? courseId;
  @JsonKey(name: 'reelId')
  final String? reelId;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  UserActivity({
    required this.id,
    required this.userId,
    required this.type,
    this.courseId,
    this.reelId,
    required this.timestamp,
    required this.metadata,
  });

  factory UserActivity.fromJson(Map<String, dynamic> json) =>
      _$UserActivityFromJson(json);
  Map<String, dynamic> toJson() => _$UserActivityToJson(this);
}

@JsonSerializable()
class UserEngagementMetrics {
  final int courses;
  final int reels;
  final double engagementScore; // 0-100

  UserEngagementMetrics({
    required this.courses,
    required this.reels,
    required this.engagementScore,
  });

  factory UserEngagementMetrics.fromJson(Map<String, dynamic> json) =>
      _$UserEngagementMetricsFromJson(json);
  Map<String, dynamic> toJson() => _$UserEngagementMetricsToJson(this);
}

@JsonSerializable()
class PlatformAnalytics {
  final int totalUsers;
  final int activeUsers;
  final int totalEnrollments;
  final double averageEngagement;
  final int completionRate;

  PlatformAnalytics({
    required this.totalUsers,
    required this.activeUsers,
    required this.totalEnrollments,
    required this.averageEngagement,
    required this.completionRate,
  });

  factory PlatformAnalytics.fromJson(Map<String, dynamic> json) =>
      _$PlatformAnalyticsFromJson(json);
  Map<String, dynamic> toJson() => _$PlatformAnalyticsToJson(this);
}

@JsonSerializable()
class TopCourse {
  @JsonKey(name: '_id')
  final String id;
  final String title;
  final int enrollments;
  final int completions;

  TopCourse({
    required this.id,
    required this.title,
    required this.enrollments,
    required this.completions,
  });

  factory TopCourse.fromJson(Map<String, dynamic> json) =>
      _$TopCourseFromJson(json);
  Map<String, dynamic> toJson() => _$TopCourseToJson(this);
}

// Auth Response
@JsonSerializable()
class AuthResponse {
  final String token;
  final User user;

  AuthResponse({
    required this.token,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseFromJson(json);
  Map<String, dynamic> toJson() => _$AuthResponseToJson(this);
}

// API Response Wrapper
@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;
  final String? error;

  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.error,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) =>
      _$ApiResponseFromJson(json, fromJsonT);
  Map<String, dynamic> toJson(Object? Function(T?) toJsonT) =>
      _$ApiResponseToJson(this, toJsonT);
}
