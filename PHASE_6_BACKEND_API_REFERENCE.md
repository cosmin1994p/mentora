# 🚀 Backend API Reference - Phase 6 Implementation

**Status**: ✅ Routes wired | ⏳ Controller methods needed | 🔄 Frontend integration pending

---

## 📋 Summary

Phase 6 completes **backend route configuration** for the SaaS platform:
- ✅ 4 new route files created (instructors, packages, companies, and enhanced auth)
- ✅ Middleware (isAdmin, isCompanyAdmin) added
- ✅ Server.js updated to mount all routes
- ✅ Course routes expanded for lesson management
- ⏳ **Remaining**: Implement controller methods that routes reference

**Architecture**:
```
GET  /api/instructors           → Get all speakers
GET  /api/packages              → Get pricing tiers
POST /api/companies             → Create company + subscription
GET  /api/auth/oauth/google/url → Start OAuth flow
POST /api/auth/mfa/verify-code  → Verify 2FA code
```

---

## 🔐 Authentication Routes (`/api/auth/*`)

### MFA - Email OTP (6-digit codes)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/mfa/send-code` | ❌ Public | Send 6-digit code to email (after failed login) |
| POST | `/mfa/verify-code` | ❌ Public | Verify code, return JWT + refresh token |
| POST | `/mfa/enable-email` | ✅ JWT | Enable email 2FA for user account |
| POST | `/mfa/disable` | ✅ JWT | Disable all MFA methods |

**Request/Response Examples**:
```bash
# Send MFA code after failed login
POST /api/auth/mfa/send-code
{
  "email": "user@example.com"
}
# Response: { "codeExpire": "10 minutes", "codeSent": true }

# Verify MFA code
POST /api/auth/mfa/verify-code
{
  "email": "user@example.com",
  "code": "123456"
}
# Response: { "token": "eyJhbGc...", "userId": "65a3f...", "role": "user" }
```

**Status**: 🔴 `sendMFACode()` method TODO in authController
**Status**: 🔴 `verifyMFACode()` method TODO in authController

---

### MFA - TOTP (Google Authenticator)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/mfa/setup-totp` | ✅ JWT | Get secret + QR code for authenticator app |
| POST | `/mfa/verify-totp` | ✅ JWT | Verify TOTP code + save to account |
| POST | `/mfa/backup-codes` | ✅ JWT | Generate new 10-code backup codes |

**Request/Response**:
```bash
# Setup TOTP
POST /api/auth/mfa/setup-totp
Authorization: Bearer <JWT>
# Response: {
#   "secret": "JBSWY3DPEBLW64TMMQQ",
#   "qrCode": "data:image/png;base64,iVBOR...",
#   "manualEntry": "Mentora:user@example.com (Mentora)"
# }

# Verify and save TOTP
POST /api/auth/mfa/verify-totp
{
  "code": "123456"
}
# Response: { "success": true, "backupCodes": ["ABC123", "DEF456", ...] }
```

**Status**: 🔴 `setupTOTP()` method TODO in authController
**Status**: 🔴 `verifyTOTP()` method TODO in authController
**Status**: 🔴 `generateBackupCodes()` method TODO in authController

---

### OAuth (Google & LinkedIn)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/oauth/google/url` | ❌ Public | Get Google OAuth authorization URL |
| POST | `/oauth/google/callback` | ❌ Public | Handle callback with auth code, return JWT |
| GET | `/oauth/linkedin/url` | ❌ Public | Get LinkedIn OAuth authorization URL |
| POST | `/oauth/linkedin/callback` | ❌ Public | Handle callback with auth code, return JWT |

**Flow**:
```bash
# Frontend calls this to get redirect URL
GET /api/auth/oauth/google/url
# Response: {
#   "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
#   "state": "random_state_123"
# }

# After user authorizes, frontend POSTs code + state
POST /api/auth/oauth/google/callback
{
  "code": "4/0AY0e-...",
  "state": "random_state_123"
}
# Response: {
#   "token": "eyJhbGc...",
#   "userId": "65a3f...",
#   "user": { "email": "user@google.com", "name": "John Doe", "picture": "https://..." }
# }
```

**Status**: 🔴 `getGoogleAuthUrl()` method TODO
**Status**: 🔴 `googleCallback()` method TODO
**Status**: 🔴 `getLinkedInAuthUrl()` method TODO
**Status**: 🔴 `linkedInCallback()` method TODO

---

### Password Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/forgot-password` | ❌ Public | Send password reset link to email |
| POST | `/reset-password` | ❌ Public | Reset password with token from email |
| POST | `/change-password` | ✅ JWT | Change password (requires current password) |

**Status**: 🔴 `sendPasswordResetEmail()` method TODO
**Status**: 🔴 `resetPassword()` method TODO
**Status**: 🔴 `changePassword()` method TODO
**Status**: 🔴 `forcePasswordReset()` method TODO (admin endpoint)

---

### GDPR & Privacy

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/consent` | ✅ JWT | Save privacy preferences (analytics, marketing, cookies) |
| GET | `/consent` | ✅ JWT | Retrieve user's privacy consent settings |
| POST | `/data-export` | ✅ JWT | Export all user data as JSON (GDPR right-to-be-forgotten) |
| POST | `/delete-account` | ✅ JWT | Delete account and all associated data |

**Request/Response**:
```bash
# Save GDPR consent
POST /api/auth/consent
{
  "gdprConsent": true,
  "analyticsConsent": true,
  "cookiesConsent": true,
  "marketingConsent": false
}
# Response: { "success": true }

# Get consent status
GET /api/auth/consent
# Response: {
#   "gdprConsent": true,
#   "analyticsConsent": true,
#   "cookiesConsent": true,
#   "marketingConsent": false,
#   "savedAt": "2024-01-15T10:30:00Z"
# }
```

**Status**: 🔴 `saveGDPRConsent()` method TODO
**Status**: 🔴 `getGDPRConsent()` method TODO
**Status**: 🔴 `exportUserData()` method TODO
**Status**: 🔴 `deleteAccount()` method TODO

---

### Existing Auth Endpoints (Already working)

```bash
POST /api/auth/register          # Create new user account
POST /api/auth/login              # Standard email/password login
POST /api/auth/admin/login        # Admin login
GET  /api/auth/me                 # Get current user profile
POST /api/auth/logout             # Clear session tokens
GET  /api/auth/activity           # Get user activity history
```

---

## 👥 Instructors Routes (`/api/instructors/*`)

### Public Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ Public | Get all 9 speakers with courses |
| GET | `/:id` | ❌ Public | Get speaker detail + bio + courses + ratings |

**Response Format (GET /):**
```json
[
  {
    "_id": "65a3f...",
    "name": "Tudor Gârgu",
    "title": "Creative Leadership",
    "bio": "Tudor is a renowned...",
    "profileImage": "https://cdn.mentora.page/file/mentora/instructors/...",
    "email": "tudor@mentora.com",
    "socialLinks": {
      "linkedin": "https://linkedin.com/in/tudor",
      "twitter": "https://twitter.com/tudor",
      "website": "https://tudor.com"
    },
    "courses": ["65a4e...", "65a4f..."],
    "rating": 4.8,
    "students": 1250,
    "reviewCount": 342,
    "isActive": true
  }
]
```

**Status**: ⏳ `getAllInstructors()` method exists
**Status**: ⏳ `getInstructorDetail()` method exists

---

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ Admin | Create new instructor |
| PUT | `/:id` | ✅ Admin | Update instructor details |
| DELETE | `/:id` | ✅ Admin | Delete instructor (soft-delete recommended) |
| POST | `/:id/courses` | ✅ Admin | Add course to instructor's course list |

**Status**: ⏳ `createInstructor()` method exists
**Status**: ⏳ `updateInstructor()` method exists
**Status**: ⏳ `deleteInstructor()` method exists
**Status**: ⏳ `addCourseToInstructor()` method exists

---

## 📦 Packages Routes (`/api/packages/*`)

### Public Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ Public | Get all 5 pricing tiers with features |
| GET | `/:id` | ❌ Public | Get package detail + included courses + trial info |

**Response Format (GET /):**
```json
[
  {
    "_id": "65a5a...",
    "name": "Free",
    "description": "Perfect for getting started",
    "priceMonthly": 0,
    "priceAnnual": 0,
    "features": [
      "Access to free courses",
      "Basic analytics",
      "Community forum access"
    ],
    "includedCourses": ["65a4e...", "65a4f..."],
    "limits": {
      "maxUsers": 1,
      "maxTeams": 0,
      "storageGB": 5,
      "videoQuality": "720p"
    },
    "trialDaysAvailable": 0,
    "order": 1
  },
  {
    "_id": "65a5b...",
    "name": "Starter",
    "description": "For individual professionals",
    "priceMonthly": 49,
    "priceAnnual": 490,
    "features": [
      "All Free features",
      "Access to premium courses",
      "HD video (1080p)",
      "Certificate of completion",
      "Email support"
    ],
    "includedCourses": ["65a4e...", "65a4f...", "65a50..."],
    "limits": {
      "maxUsers": 1,
      "maxTeams": 0,
      "storageGB": 50,
      "videoQuality": "1080p"
    },
    "trialDaysAvailable": 7,
    "order": 2
  }
  // ... Growth (€99), Enterprise (€499), Elite (€999)
]
```

**Status**: ⏳ `getAllPackages()` method exists
**Status**: ⏳ `getPackageDetail()` method exists

---

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ✅ Admin | Create new pricing tier |
| PUT | `/:id` | ✅ Admin | Update package price/features |
| DELETE | `/:id` | ✅ Admin | Delete package tier |
| POST | `/:id/courses` | ✅ Admin | Bulk add courses to package |

**Status**: ⏳ `createPackage()` method exists
**Status**: ⏳ `updatePackage()` method exists
**Status**: ⏳ `deletePackage()` method exists
**Status**: ⏳ `addCoursesToPackage()` method exists

---

## 🏢 Companies Routes (`/api/companies/*`)

### Admin-Only Endpoints (Super Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ Super Admin | List all companies with subscription status |
| POST | `/` | ✅ Super Admin | Create new company account |

**Response Format (GET /):**
```json
[
  {
    "_id": "65a6a...",
    "name": "Tech Innovators Inc",
    "email": "admin@techinnovators.com",
    "package": "65a5c...", // Growth package
    "subscription": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-02-01T00:00:00Z",
      "status": "active",
      "licenseCount": 10,
      "autoRenew": true
    },
    "adminUser": "65a7a...",
    "users": ["65a7b...", "65a7c...", ...],
    "gdprSettings": {
      "dataRetentionMonths": 12,
      "allowAnalytics": true,
      "allowExternalIntegrations": false
    },
    "billing": {
      "country": "RO",
      "taxId": "RO12345678",
      "paymentMethod": "credit_card",
      "nextBillingDate": "2024-02-01T00:00:00Z"
    }
  }
]
```

**Status**: ⏳ `getAllCompanies()` method exists
**Status**: ⏳ `createCompany()` method exists

---

### Company Admin Endpoints (Company-specific access)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id` | ✅ Company Admin | Get company details + users + subscription |
| PUT | `/:id` | ✅ Company Admin | Update company settings, GDPR policies |

**Status**: ⏳ `getCompanyDetail()` method exists
**Status**: ⏳ `updateCompany()` method exists

---

### Users Management (CSV Import/Export)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id/export-users` | ✅ Company Admin | Export all company users as CSV/Excel |
| POST | `/:id/import-users` | ✅ Company Admin | Bulk import users from CSV (auto-generate passwords) |

**Export Response** (CSV headers):
```
Email,FullName,Package,CreatedAt,LastLogin,Status
user1@techinnovators.com,John Doe,Growth (€99),2024-01-01T10:00:00Z,2024-01-15T14:30:00Z,active
user2@techinnovators.com,Jane Smith,Growth (€99),2024-01-02T11:00:00Z,2024-01-14T09:15:00Z,inactive
```

**Import Request** (POST body):
```json
{
  "users": [
    { "fullName": "John Doe", "email": "john@example.com" },
    { "fullName": "Jane Smith", "email": "jane@example.com" }
  ]
}
```

**Auto-Generated User Details**:
- Default password: `Mentora2026!`
- `passwordResetRequired: true` (forces change on first login)
- Role: `user`
- Company: Set to the uploading company
- Package: Inherited from company's package tier

**Status**: ⏳ `exportCompanyUsers()` method exists
**Status**: ⏳ `importUsersCSV()` method exists

---

## 📚 Courses Routes (`/api/courses/*`)

### SaaS Course Endpoints (Package-aware)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/v2/list` | ✅ JWT (optional) | Get courses filtered by user's package tier |
| GET | `/v2/:courseId` | ✅ JWT (optional) | Get course detail with access check (lock if unprivileged) |
| GET | `/v2/:courseId/lessons` | ✅ JWT (optional) | Get all lessons for course (check access) |
| GET | `/v2/:courseId/lessons/:lessonId` | ✅ JWT (optional) | Get individual lesson detail |

**Course List Response**:
```json
[
  {
    "_id": "65a4e...",
    "title": "Creative Leadership Masterclass",
    "description": "Learn to lead with creativity...",
    "level": "Beginner",
    "instructors": [
      { "_id": "65a3f...", "name": "Tudor Gârgu", "profileImage": "..." }
    ],
    "packageTiers": ["Free", "Starter", "Growth", "Enterprise", "Elite"],
    "isFree": true,
    "thumbnail": "https://cdn.mentora.page/file/mentora/courses/...",
    "lessonsArray": ["65a8a...", "65a8b...", "65a8c..."],
    "lessonsCount": 3,
    "totalDuration": 1800, // seconds
    "expirationDate": null,
    "previewDuration": 300, // seconds visible before purchase
    "rating": 4.7,
    "enrollmentCount": 3420,
    "status": "published"
  }
]
```

**Access Control Logic** (in getCourses):
```javascript
// Get user's effective package
const effectivePackage = user?.company?.package || user?.package || "Free";

// Filter courses: only return courses where packageTiers includes effectivePackage
const accessibleCourses = courses.filter(c => 
  c.packageTiers.includes(effectivePackage)
);
```

**Status**: ⏳ `getCourses()` V2 method exists
**Status**: ⏳ `getCourseDetail()` method exists
**Status**: ⏳ `getCourseLessons()` method exists
**Status**: ⏳ `getLesson()` method exists

---

### Admin Course Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/create` | ✅ Admin | Create new course |
| PUT | `/admin/:courseId` | ✅ Admin | Update course basics (title, description, level) |
| DELETE | `/admin/:courseId` | ✅ Admin | Delete entire course + all lessons |
| PUT | `/admin/:courseId/packages` | ✅ Admin | Set which package tiers can access course |

**Create Course Request**:
```bash
POST /api/courses/admin/create
{
  "title": "New Course Title",
  "description": "Course description...",
  "level": "Intermediate",
  "instructors": ["65a3f...", "65a3g..."], // Instructor IDs
  "packageTiers": ["Starter", "Growth", "Enterprise", "Elite"]
}
# Response: { "course": {...}, "message": "Course created" }
```

**Status**: ⏳ `createCourse()` method exists
**Status**: ⏳ `updateCourse()` method exists
**Status**: ⏳ `deleteCourse()` method exists
**Status**: ⏳ `updateCoursePackageTiers()` method exists

---

### Lesson Management (CRUD within courses)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/:courseId/lessons` | ✅ Admin | Add lesson with video upload |
| PUT | `/admin/:courseId/lessons/:lessonId` | ✅ Admin | Update lesson details + re-upload video |
| DELETE | `/admin/:courseId/lessons/:lessonId` | ✅ Admin | Delete lesson from course |

**Add Lesson Request** (multipart/form-data):
```bash
POST /api/courses/admin/65a4e.../lessons
Content-Type: multipart/form-data

Form Fields:
  title: "Lesson 1: Introduction"
  description: "Welcome to creative leadership..."
  order: 1
  duration: 600 (in seconds)
  video: <binary file data> (mp4, webm, mov)

Response: {
  "lesson": {
    "_id": "65a8a...",
    "title": "Lesson 1: Introduction",
    "order": 1,
    "duration": 600,
    "video": {
      "fileId": "gridfs_id",
      "url": "https://cdn.mentora.page/file/mentora/lessons/65a8a...",
      "hlsUrl": "https://cdn.mentora.page/file/mentora/hls/65a8a.../playlist.m3u8",
      "hlsReady": false  // ⏳ Background transcoding in progress
    },
    "hlsReady": false,
    "isPublished": true
  }
}
```

**Video Upload Flow**:
1. Admin uploads MP4 via `/admin/:courseId/lessons` endpoint
2. Backend stores original video in B2
3. Returns immediately with `hlsReady: false`
4. Background job transcodes to HLS (480p, 720p, 1080p) via ffmpeg
5. Once HLS ready, `hlsReady` flag set to `true`
6. Admin can see progress in AdminCourseEditor component

**Status**: ⏳ `addLesson()` method exists
**Status**: ⏳ `updateLesson()` method exists
**Status**: ⏳ `deleteLesson()` method exists

---

## ⚡ Implementation Checklist - Phase 7 (Next)

### Controllers TODO:

**authController.js**:
- [ ] `sendMFACode()` - Generate + email 6-digit code
- [ ] `verifyMFACode()` - Verify code, return JWT
- [ ] `setupTOTP()` - Generate secret + QR code
- [ ] `verifyTOTP()` - Verify TOTP code
- [ ] `generateBackupCodes()` - 10-code recovery codes
- [ ] `getGoogleAuthUrl()` - Return OAuth URL + state
- [ ] `googleCallback()` - Exchange code for token
- [ ] `getLinkedInAuthUrl()` - Return OAuth URL + state
- [ ] `linkedInCallback()` - Exchange code for token
- [ ] `sendPasswordResetEmail()` - Email reset link
- [ ] `resetPassword()` - Validate token + update password
- [ ] `changePassword()` - Require current password
- [ ] `forcePasswordReset()` - Admin-triggered reset
- [ ] `saveGDPRConsent()` - Save to User schema
- [ ] `getGDPRConsent()` - Retrieve consent flags
- [ ] `exportUserData()` - Export as JSON
- [ ] `deleteAccount()` - Soft-delete user

**courseControllerV2.js**:
- [ ] `getCourses()` - Apply package filtering
- [ ] `getCourseDetail()` - Check access, add lock if unauthorized
- [ ] `getCourseLessons()` - Return sorted lessons
- [ ] `getLesson()` - Single lesson detail
- [ ] `createCourse()` - Create + set packageTiers
- [ ] `updateCourse()` - Update basics
- [ ] `deleteCourse()` - Delete with cascade
- [ ] `updateCoursePackageTiers()` - Change access tiers
- [ ] `addLesson()` - Handle multipart upload, trigger HLS
- [ ] `updateLesson()` - Update + re-transcode if video changed
- [ ] `deleteLesson()` - Remove from course

---

## 🧪 Testing Commands

**Test Instructor API**:
```bash
# Get all instructors
curl http://localhost:8080/api/instructors

# Get speaker detail
curl http://localhost:8080/api/instructors/65a3f...
```

**Test Packages API**:
```bash
# Get pricing tiers
curl http://localhost:8080/api/packages
```

**Test Auth with MFA**:
```bash
# Step 1: Login with email/password
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!@#"}'
# Response: { "requiresMFA": true, "email": "user@example.com" }

# Step 2: Send MFA code
curl -X POST http://localhost:8080/api/auth/mfa/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
# Response: { "codeSent": true, "codeExpire": "10 minutes" }

# Step 3: Verify code
curl -X POST http://localhost:8080/api/auth/mfa/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'
# Response: { "token": "eyJhbGc...", "userId": "65a7a...", "role": "user" }
```

**Test OAuth Google**:
```bash
# Get authorization URL
curl http://localhost:8080/api/auth/oauth/google/url
# Response: { "url": "https://accounts.google.com/...", "state": "..." }

# After user authorizes (frontend gets code from callback)
curl -X POST http://localhost:8080/api/auth/oauth/google/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"4/0AY0...", "state":"..."}'
# Response: { "token": "eyJhbGc...", "user": { "email": "...", "name": "..." } }
```

---

## 📝 Frontend Integration Notes

**Phase 7 will**:
1. Replace existing Login component with **LoginMFA** (handles email + 2FA + OAuth)
2. Update Course Gallery to use **CourseCardLocked** (shows locks + upgrade buttons)
3. Add `/speakers` route with **SpeakersTab** component
4. Mount **PackageUpgradeModal** globally in App.tsx
5. Mount **GDPRConsentModal** on first visit (check localStorage)
6. Create **LessonPlayer** component for video playback
7. Create **AdminDashboard** with AdminCoursesManager + AdminCourseEditor

**API Calls from Frontend**:
```typescript
// After login, frontend stores JWT in localStorage
localStorage.setItem('token', response.token);

// All subsequent API calls include JWT
const config = {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
};

// Get accessible courses (auto-filtered by package)
const courses = await axios.get('/api/courses/v2/list', config);

// Get all speakers for SpeakersTab
const instructors = await axios.get('/api/instructors');

// Get pricing tiers for upgrade modal
const packages = await axios.get('/api/packages');

// Save GDPR consent
await axios.post('/api/auth/consent', {
  gdprConsent: true,
  analyticsConsent: false
}, config);
```

---

## 📅 Commit History

| Hash | Message |
|------|---------|
| 5330126 | Add AdminCoursesManager + AdminCourseEditor components + correct instructor names to PDF exact names |
| 566eb9e | Phase 6: Wire backend routes - instructors, packages, companies, enhanced auth & courses |

---

**Next Step**: Implement all TODO controller methods, then proceed to Phase 7 (Frontend Integration).
