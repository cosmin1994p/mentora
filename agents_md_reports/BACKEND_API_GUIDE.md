# Backend API Implementation Guide

## Response Format Standards

To prevent API response format issues, ensure all your backend endpoints follow a **consistent response format**.

### Recommended Response Format

All API responses should follow this structure:

```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Optional success message"
}
```

Or for errors:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## API Endpoints - Implementation Guide

### Authentication Endpoints

#### POST `/auth/register`
**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "emotion": "happy",
  "energyLevel": "high"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

#### POST `/auth/login`
**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123",
  "emotion": "happy",
  "energyLevel": "high"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

#### GET `/auth/me`
**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "enrolledCourses": ["course1", "course2"],
    "completedCourses": ["course1"],
    "background": {
      "emotion": "happy",
      "energyLevel": "high"
    }
  }
}
```

---

### Courses Endpoints

#### GET `/courses`
**Response (returns array in data property):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "course1",
      "title": "React Basics",
      "category": "Web Development",
      "description": "Learn React fundamentals",
      "instructor": "John Doe",
      "rating": 4.5,
      "studentsEnrolled": 1250,
      "thumbnail": "https://...",
      "enrolled": false,
      "progress": 0,
      "quizCompleted": false
    },
    {
      "_id": "course2",
      "title": "Advanced TypeScript",
      "category": "Web Development",
      "description": "Master TypeScript",
      "instructor": "Jane Smith",
      "rating": 4.8,
      "studentsEnrolled": 850,
      "thumbnail": "https://...",
      "enrolled": true,
      "progress": 45,
      "quizCompleted": false
    }
  ],
  "message": "Courses retrieved successfully"
}
```

#### GET `/courses/:id`
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "course1",
    "title": "React Basics",
    "category": "Web Development",
    "description": "Learn React fundamentals",
    "instructor": "John Doe",
    "rating": 4.5,
    "studentsEnrolled": 1250,
    "thumbnail": "https://...",
    "videoUrl": "https://...",
    "lessons": [
      {
        "_id": "lesson1",
        "title": "Getting Started",
        "duration": 1200,
        "videoUrl": "https://..."
      }
    ],
    "enrolled": false,
    "progress": 0,
    "quizCompleted": false
  }
}
```

#### POST `/courses/:id/enroll`
**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully enrolled in course",
    "enrolledAt": "2026-01-03T10:00:00Z"
  }
}
```

#### POST `/courses/:id/complete`
**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Course marked as completed",
    "completedAt": "2026-01-03T10:00:00Z"
  }
}
```

---

### Reels Endpoints

#### GET `/reels`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "reel1",
      "title": "React Hooks Explained",
      "category": "Web Development",
      "videoUrl": "https://...",
      "creator": "John Doe",
      "likes": 234,
      "views": 5600,
      "comments": 45,
      "createdAt": "2025-12-20T10:00:00Z"
    }
  ]
}
```

#### GET `/reels/:id`
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "reel1",
    "title": "React Hooks Explained",
    "category": "Web Development",
    "videoUrl": "https://...",
    "creator": "John Doe",
    "creatorFollowers": 5600,
    "likes": 234,
    "views": 5600,
    "comments": 45,
    "description": "Learn about React hooks...",
    "createdAt": "2025-12-20T10:00:00Z"
  }
}
```

#### POST `/reels/:id/like`
**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "totalLikes": 235
  }
}
```

---

### User Profile Endpoints

#### GET `/users/profile`
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user1",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "enrolledCourses": ["course1", "course2"],
    "completedCourses": ["course1"],
    "background": {
      "emotion": "happy",
      "energyLevel": "high"
    }
  }
}
```

#### PUT `/users/profile`
**Request:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user1",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### GET `/users/courses/enrolled`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "course1",
      "title": "React Basics",
      "progress": 45,
      "enrolledAt": "2025-12-01T10:00:00Z"
    }
  ]
}
```

#### GET `/users/courses/completed`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "course1",
      "title": "React Basics",
      "completedAt": "2025-12-20T10:00:00Z",
      "certificateUrl": "https://..."
    }
  ]
}
```

---

### Admin Endpoints

#### GET `/admin/videos`
**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "video1",
      "title": "React Tutorial",
      "instructor": "John Doe",
      "status": "published",
      "views": 5600,
      "duration": 3600,
      "uploadedAt": "2025-12-15T10:00:00Z"
    }
  ]
}
```

#### GET `/admin/users`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "enrolledCourses": 5,
      "completedCourses": 2,
      "isActive": true,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ]
}
```

#### GET `/admin/analytics`
**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalCourses": 45,
    "totalReels": 320,
    "platformRevenue": 125000,
    "activeUsers": 856,
    "completionRate": 68,
    "averageRating": 4.6
  }
}
```

---

## Node.js + Express Implementation Example

### Basic Setup
```typescript
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Response wrapper
const sendResponse = (res: any, success: boolean, data: any = null, message: string = '', code: number = 200) => {
  res.status(code).json({
    success,
    data,
    message
  });
};

// Error handler
const sendError = (res: any, error: string, code: number = 400) => {
  res.status(code).json({
    success: false,
    error,
    code: code.toString()
  });
};
```

### Courses Endpoint
```typescript
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().lean();
    sendResponse(res, true, courses, 'Courses retrieved successfully');
  } catch (error) {
    sendError(res, 'Failed to fetch courses', 500);
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) {
      return sendError(res, 'Course not found', 404);
    }
    sendResponse(res, true, course);
  } catch (error) {
    sendError(res, 'Failed to fetch course', 500);
  }
});
```

### Authentication Middleware
```typescript
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 'Access token required', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 'Invalid token', 401);
  }
};

// Protected route example
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    sendResponse(res, true, user);
  } catch (error) {
    sendError(res, 'Failed to fetch user', 500);
  }
});
```

---

## MongoDB Collections Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  name: String,
  role: String (enum: ['user', 'admin']),
  enrolledCourses: [ObjectId],
  completedCourses: [ObjectId],
  background: {
    emotion: String,
    energyLevel: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Courses Collection
```javascript
{
  _id: ObjectId,
  title: String,
  category: String,
  description: String,
  instructor: String,
  thumbnail: String (URL),
  videoUrl: String (URL),
  rating: Number,
  studentsEnrolled: Number,
  lessons: [{
    _id: ObjectId,
    title: String,
    duration: Number,
    videoUrl: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Reels Collection
```javascript
{
  _id: ObjectId,
  title: String,
  category: String,
  videoUrl: String (URL),
  creator: String,
  creatorFollowers: Number,
  likes: Number,
  views: Number,
  comments: Number,
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Key Implementation Tips

1. **Always wrap responses** in success/data structure
2. **Return arrays in data property** to avoid client confusion
3. **Use consistent error codes** (400, 401, 404, 500)
4. **Validate input** before processing
5. **Authenticate protected routes** with JWT middleware
6. **Use lean() queries** for read operations (performance)
7. **Handle MongoDB errors** gracefully
8. **Index frequently queried fields** (email, username, etc)

---

**Backend Implementation Status:** ⏳ Ready for Development
**API Contracts:** ✅ Defined
**Database Schema:** ✅ Designed
**Frontend Integration:** ✅ Ready to Connect

