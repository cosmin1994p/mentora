# ⚡ Quick Implementation Guide for Backend Developer

## 🎯 TL;DR

Frontend is 100% ready. You need to implement 4 API endpoints to handle image uploads to MongoDB GridFS.

---

## 📍 Where to Add Code

Your backend should be at: `http://localhost:5002/api`

Add these 4 endpoints to your Express routes.

---

## 🔧 The 4 Endpoints You Need

### 1️⃣ Upload Course Thumbnail
```javascript
POST /api/admin/courses/:courseId/thumbnail

Request:
  - Authorization: Bearer {jwt_token}
  - Body: FormData { thumbnail: File }
  - File: JPEG/PNG/WEBP, max 5MB

Response:
  {
    "success": true,
    "imageId": "507f1f77bcf86cd799439011",
    "message": "Thumbnail uploaded successfully"
  }

What it does:
  1. Receive image file
  2. Save to MongoDB GridFS bucket "thumbnails"
  3. Update course document: thumbnailImageId = imageId
  4. Return imageId for frontend
```

### 2️⃣ Upload Reel Thumbnail
```javascript
POST /api/admin/reels/:reelId/thumbnail

Request:
  - Authorization: Bearer {jwt_token}
  - Body: FormData { thumbnail: File }
  - File: JPEG/PNG/WEBP, max 5MB

Response:
  {
    "success": true,
    "imageId": "607f1f77bcf86cd799439012",
    "message": "Thumbnail uploaded successfully"
  }

What it does:
  1. Receive image file
  2. Save to MongoDB GridFS bucket "reelThumbnails"
  3. Update reel document: thumbnailImageId = imageId
  4. Return imageId for frontend
```

### 3️⃣ Get Course Thumbnail
```javascript
GET /api/media/thumbnails/:imageId

Request:
  - No authentication needed
  - imageId: MongoDB ObjectId (string)

Response:
  - Binary image data
  - Content-Type: image/jpeg (or image/png)
  - Cache-Control: public, max-age=604800 (7 days)

What it does:
  1. Check if image exists in GridFS
  2. Return binary image data
  3. Stream from GridFS bucket "thumbnails"
```

### 4️⃣ Get Reel Thumbnail
```javascript
GET /api/media/reel-thumbnails/:imageId

Request:
  - No authentication needed
  - imageId: MongoDB ObjectId (string)

Response:
  - Binary image data
  - Content-Type: image/jpeg (or image/png)
  - Cache-Control: public, max-age=604800 (7 days)

What it does:
  1. Check if image exists in GridFS
  2. Return binary image data
  3. Stream from GridFS bucket "reelThumbnails"
```

---

## 💻 Code Template (Express.js)

Copy this and adapt to your codebase:

```javascript
// routes/admin.js
const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const router = express.Router();

// Assuming you have these already:
const { authenticateToken } = require('../middleware/auth');
const { coursesCollection } = require('../db/collections');
const { thumbnailBucket, reelThumbnailBucket } = require('../db/gridfs');

// Multer for file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

// === ENDPOINT 1: Upload Course Thumbnail ===
router.post(
  '/courses/:courseId/thumbnail', 
  authenticateToken, 
  upload.single('thumbnail'), 
  async (req, res) => {
    try {
      const { courseId } = req.params;
      if (!req.file) return res.status(400).json({ error: 'No file' });

      const uploadStream = thumbnailBucket.openUploadStream(
        `course-${courseId}`,
        { metadata: { courseId, uploadedAt: new Date() } }
      );

      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', async () => {
        await coursesCollection.updateOne(
          { _id: new ObjectId(courseId) },
          { $set: { thumbnailImageId: uploadStream.id } }
        );
        res.json({ success: true, imageId: uploadStream.id.toString() });
      });

      uploadStream.on('error', (err) => res.status(500).json({ error: err.message }));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// === ENDPOINT 2: Upload Reel Thumbnail ===
router.post(
  '/reels/:reelId/thumbnail', 
  authenticateToken, 
  upload.single('thumbnail'), 
  async (req, res) => {
    try {
      const { reelId } = req.params;
      if (!req.file) return res.status(400).json({ error: 'No file' });

      const uploadStream = reelThumbnailBucket.openUploadStream(
        `reel-${reelId}`,
        { metadata: { reelId, uploadedAt: new Date() } }
      );

      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', async () => {
        await db.collection('reels').updateOne(
          { _id: new ObjectId(reelId) },
          { $set: { thumbnailImageId: uploadStream.id } }
        );
        res.json({ success: true, imageId: uploadStream.id.toString() });
      });

      uploadStream.on('error', (err) => res.status(500).json({ error: err.message }));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

// ===================================================

// routes/media.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

const { thumbnailBucket, reelThumbnailBucket } = require('../db/gridfs');
const { db } = require('../db/connection');

// === ENDPOINT 3: Get Course Thumbnail ===
router.get('/thumbnails/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const files = await db.collection('thumbnails.files').findOne({
      _id: new ObjectId(imageId)
    });

    if (!files) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Content-Type', files.metadata?.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800');

    const downloadStream = thumbnailBucket.openDownloadStream(
      new ObjectId(imageId)
    );

    downloadStream.on('error', (err) => {
      res.status(404).json({ error: 'Image not found' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ENDPOINT 4: Get Reel Thumbnail ===
router.get('/reel-thumbnails/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const files = await db.collection('reelThumbnails.files').findOne({
      _id: new ObjectId(imageId)
    });

    if (!files) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Content-Type', files.metadata?.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800');

    const downloadStream = reelThumbnailBucket.openDownloadStream(
      new ObjectId(imageId)
    );

    downloadStream.on('error', (err) => {
      res.status(404).json({ error: 'Image not found' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 🔧 Prerequisites You Need

```bash
npm install multer   # For file uploads
npm install mongodb  # For GridFS
```

In your main server file:
```javascript
const adminRoutes = require('./routes/admin');
const mediaRoutes = require('./routes/media');

app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);
```

---

## 📦 Setup GridFS Buckets

Before running the code, create the buckets:

```javascript
// In your database initialization
const { GridFSBucket } = require('mongodb');

const db = client.db('masterclass');

const thumbnailBucket = new GridFSBucket(db, { bucketName: 'thumbnails' });
const reelThumbnailBucket = new GridFSBucket(db, { bucketName: 'reelThumbnails' });

// Export them
module.exports = { thumbnailBucket, reelThumbnailBucket };
```

---

## 🧪 Test It

Once you've added the endpoints:

```bash
# 1. Start your backend
node server.js   # Should see: "Server running at port 5002"

# 2. Upload a course image
curl -X POST http://localhost:5002/api/admin/courses/course-123/thumbnail \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "thumbnail=@image.jpg"

# Should return:
# { "success": true, "imageId": "507f1f77bcf86cd799439011" }

# 3. Get the image back
curl http://localhost:5002/api/media/thumbnails/507f1f77bcf86cd799439011 \
  --output downloaded.jpg

# Should save an image file
```

---

## ✅ Validation Checklist

After implementation:

- [ ] Endpoint 1 accepts image upload
- [ ] Endpoint 1 saves to GridFS
- [ ] Endpoint 1 updates course document
- [ ] Endpoint 2 works for reels
- [ ] Endpoint 3 returns image binary
- [ ] Endpoint 4 returns image binary
- [ ] Cache headers set (max-age=604800)
- [ ] CORS allows frontend origin
- [ ] File size limit 5MB enforced
- [ ] Only image files accepted

---

## 🚀 That's It!

Once you implement these 4 endpoints:

1. Frontend will automatically work
2. Users can upload from AdminPanel
3. Images store in MongoDB
4. System auto-caches locally
5. Everything serves from MongoDB

No changes needed to frontend - it's already ready.
