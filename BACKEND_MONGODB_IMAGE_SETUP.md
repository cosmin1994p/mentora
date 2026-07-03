# Backend MongoDB Image Upload Setup

## 📋 Precondiții

- Node.js + Express.js
- MongoDB Atlas connection
- Backend running pe `http://localhost:5002`

---

## 🔧 Implementare Backend Endpoints

### 1. Setup GridFS Buckets

```javascript
// In your MongoDB connection setup
const { GridFSBucket } = require('mongodb');

const db = client.db('masterclass');

// Create GridFS buckets for images
const thumbnailBucket = new GridFSBucket(db, { bucketName: 'thumbnails' });
const reelThumbnailBucket = new GridFSBucket(db, { bucketName: 'reelThumbnails' });

module.exports = { thumbnailBucket, reelThumbnailBucket };
```

### 2. Upload Course Thumbnail Endpoint

```javascript
// routes/admin.js
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { thumbnailBucket } = require('../db/gridfs');
const { coursesCollection } = require('../db/collections');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// POST /api/admin/courses/:courseId/thumbnail
router.post('/courses/:courseId/thumbnail', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    const { courseId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create upload stream
    const uploadStream = thumbnailBucket.openUploadStream(
      `course-${courseId}`,
      {
        metadata: {
          courseId: courseId,
          uploadedAt: new Date(),
          contentType: req.file.mimetype
        }
      }
    );

    // Write file to GridFS
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async () => {
      try {
        // Update course with imageId
        const result = await coursesCollection.updateOne(
          { _id: new ObjectId(courseId) },
          { 
            $set: { 
              thumbnailImageId: uploadStream.id,
              updatedAt: new Date()
            } 
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ 
          success: true,
          imageId: uploadStream.id.toString(),
          message: 'Thumbnail uploaded successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    uploadStream.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Upload Reel Thumbnail Endpoint

```javascript
// POST /api/admin/reels/:reelId/thumbnail
router.post('/reels/:reelId/thumbnail', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  try {
    const { reelId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create upload stream for reel thumbnails
    const uploadStream = reelThumbnailBucket.openUploadStream(
      `reel-${reelId}`,
      {
        metadata: {
          reelId: reelId,
          uploadedAt: new Date(),
          contentType: req.file.mimetype
        }
      }
    );

    // Write file to GridFS
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async () => {
      try {
        // Update reel with imageId
        const result = await db.collection('reels').updateOne(
          { _id: new ObjectId(reelId) },
          { 
            $set: { 
              thumbnailImageId: uploadStream.id,
              updatedAt: new Date()
            } 
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Reel not found' });
        }

        res.json({ 
          success: true,
          imageId: uploadStream.id.toString(),
          message: 'Thumbnail uploaded successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    uploadStream.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Get Course Thumbnail Endpoint

```javascript
// GET /api/media/thumbnails/:imageId
router.get('/thumbnails/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    // Check if file exists
    const files = await db.collection('thumbnails.files').findOne({
      _id: new ObjectId(imageId)
    });

    if (!files) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set response headers
    res.setHeader('Content-Type', files.metadata?.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    res.setHeader('ETag', `"${files._id}"`);

    // Stream file from GridFS
    const downloadStream = thumbnailBucket.openDownloadStream(
      new ObjectId(imageId)
    );

    downloadStream.on('error', (error) => {
      if (error.codeName === 'FileNotFound') {
        res.status(404).json({ error: 'Image not found' });
      } else {
        res.status(500).json({ error: error.message });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5. Get Reel Thumbnail Endpoint

```javascript
// GET /api/media/reel-thumbnails/:imageId
router.get('/reel-thumbnails/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    // Check if file exists
    const files = await db.collection('reelThumbnails.files').findOne({
      _id: new ObjectId(imageId)
    });

    if (!files) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set response headers
    res.setHeader('Content-Type', files.metadata?.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
    res.setHeader('ETag', `"${files._id}"`);

    // Stream file from GridFS
    const downloadStream = reelThumbnailBucket.openDownloadStream(
      new ObjectId(imageId)
    );

    downloadStream.on('error', (error) => {
      if (error.codeName === 'FileNotFound') {
        res.status(404).json({ error: 'Image not found' });
      } else {
        res.status(500).json({ error: error.message });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 6. Complete Route Registration

```javascript
// In your main server file (e.g., server.js or app.js)
const mediaRoutes = require('./routes/media');
const adminRoutes = require('./routes/admin');

app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
```

---

## 📦 Required Packages

```bash
npm install express multer mongodb cors
```

---

## ✅ Testing Flow

### 1. Create Test Course

```bash
curl -X POST http://localhost:5002/api/admin/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Course" \
  -F "instructor=John Doe" \
  -F "category=tech" \
  -F "video=@video.mp4"

# Response: { id: "course-123", ... }
```

### 2. Upload Thumbnail

```bash
curl -X POST http://localhost:5002/api/admin/courses/course-123/thumbnail \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "thumbnail=@image.jpg"

# Response: { success: true, imageId: "507f1f77bcf86cd799439011" }
```

### 3. Retrieve Thumbnail

```bash
curl http://localhost:5002/api/media/thumbnails/507f1f77bcf86cd799439011 \
  --output downloaded-image.jpg

# Check image displays correctly
```

### 4. Frontend Upload

- Open `http://localhost:5173` (Frontend)
- Go to **Admin Panel**
- Tab: **Gestionare Imagini**
- Click **Încarcă Imagine** for a course
- Select image from computer
- Wait for upload
- Verify thumbnail updates

---

## 🐛 Troubleshooting

### "GridFS bucket not created"
```javascript
// Manually create buckets
await db.createCollection('thumbnails.files');
await db.createCollection('thumbnails.chunks');
await db.createCollection('reelThumbnails.files');
await db.createCollection('reelThumbnails.chunks');
```

### "Upload returns 500 error"
- Check MongoDB connection
- Verify `multer` is configured
- Check file size limit (5MB)
- Verify authentication token valid

### "Image returns 404"
- Check ObjectId format in database
- Verify GridFS buckets exist
- Check database name is 'masterclass'

### "CORS errors"
```javascript
// Add to server.js
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

---

## 📊 Database Queries

### View uploaded images
```javascript
db.thumbnails.files.find({}).pretty()
db.reelThumbnails.files.find({}).pretty()
```

### Check course has imageId
```javascript
db.courses.findOne({ _id: ObjectId("course-id") }, { thumbnailImageId: 1 })
```

### Delete old images
```javascript
// Delete from GridFS
const id = ObjectId("507f1f77bcf86cd799439011");
db.thumbnails.files.deleteOne({ _id: id });
db.thumbnails.chunks.deleteMany({ files_id: id });
```

---

## 🚀 Deployment Considerations

1. **MongoDB Atlas**: Upload storage included in plan
2. **CDN**: Consider CloudFlare for image caching
3. **Rate Limiting**: Add rate limit on upload endpoints
4. **Security**: Validate file type server-side (already done)
5. **Monitoring**: Log all uploads for analytics
