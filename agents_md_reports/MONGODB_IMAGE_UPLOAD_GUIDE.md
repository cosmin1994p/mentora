# MongoDB Image Upload & Storage System

## 📋 Prezentare Generală

Sistemul permite upload complet de imagini din file explorer care sunt stocate în **MongoDB Atlas GridFS** și servite direct din baza de date, nu din URL-uri externe.

## 🎯 Obiectiv

✅ **Stochează 100% imaginile în MongoDB Atlas**
✅ **Upload din file explorer**
✅ **Auto-caching în IndexedDB (7 zile)**
✅ **Fallback la external URLs dacă nu sunt din MongoDB**

---

## 🏗️ Arhitectură Sistem

### Frontend Components

#### 1. `imageUploadManager.ts` (Utility pentru Upload)
```typescript
imageUploadManager.uploadCourseThumbnail(courseId, file)
imageUploadManager.uploadReelThumbnail(reelId, file)
imageUploadManager.getThumbnailUrl(imageId)
```

#### 2. `api.ts` - Noi endpoints
```typescript
apiService.admin.uploadThumbnail(courseId, file)
apiService.admin.uploadReelThumbnail(reelId, file)
apiService.media.getThumbnailUrl(imageId)
apiService.media.getReelThumbnailUrl(imageId)
```

#### 3. `AdminPanel.tsx` - UI pentru Upload
- **Tab 1: Cursuri** - Adaugă cursuri noi
- **Tab 2: Reels** - Vizualizează reels
- **Tab 3: Gestionare Imagini** - ⭐ **NOU**
  - Upload thumbnail-uri pentru cursuri existente
  - Upload thumbnail-uri pentru reels existente
  - Indicator de status MongoDB

#### 4. `App.tsx` - Interfețe Actualizate
```typescript
interface Course {
  // ...
  thumbnailImageId?: string;  // MongoDB GridFS image ID
}

interface Reel {
  // ...
  thumbnailImageId?: string;  // MongoDB GridFS image ID
}
```

### Backend Required (Node.js/Express)

Endpoint-uri care trebuie implementate la `http://localhost:5002/api`:

#### POST `/admin/courses/:courseId/thumbnail`
```
Headers: Authorization: Bearer {token}
Body: FormData { thumbnail: File }

Response: { 
  success: boolean, 
  imageId: string,
  url: string 
}
```

#### POST `/admin/reels/:reelId/thumbnail`
```
Headers: Authorization: Bearer {token}
Body: FormData { thumbnail: File }

Response: { 
  success: boolean, 
  imageId: string,
  url: string 
}
```

#### GET `/media/thumbnails/:imageId`
```
Response: Imagine binară (content-type: image/jpeg sau image/png)
```

#### GET `/media/reel-thumbnails/:imageId`
```
Response: Imagine binară (content-type: image/jpeg sau image/png)
```

---

## 📦 Flow Upload Complet

### Pasul 1: User Upload
```
User deschide AdminPanel → Tab "Gestionare Imagini"
User selectează imagine din file explorer
Imagine se trimite la backend via POST /admin/courses/:id/thumbnail
```

### Pasul 2: Server Backend
```
Backend primește File
Backend salvează în MongoDB GridFS (bucketName: "thumbnails")
Backend returnează ObjectId (imageId)
Backend salvează imageId în Course document
```

### Pasul 3: Frontend Update
```
Frontend primește imageId
Frontend actualizează Course cu { thumbnailImageId: imageId }
Frontend generate URL: /api/media/thumbnails/{imageId}
Frontend cache-ează imaginea în IndexedDB (7 zile)
```

### Pasul 4: Display
```
CourseCard component detectează thumbnailImageId
Folosește URL-ul MongoDB în loc de external URL
Imagine se auto-cache-ează local
```

---

## 🔧 Cum Folosești

### 1. Upload Initial - Curs Nou

**AdminPanel → Tab "Cursuri" → "Adaugă Curs Nou"**

```
Titlu: "Advanced React"
Instructor: "John Doe"
Category: "tech"
...
Incarcă Video: [select_video.mp4]
Incarcă Thumbnail: [select_image.jpg]  ← MongoDB GridFS
Salvează Curs
```

→ Thumbnail-ul se salvează automat în MongoDB la crearea cursului

### 2. Upload Posterior - Curs Existent

**AdminPanel → Tab "Gestionare Imagini" → "Thumbnail-uri Cursuri"**

```
Pentru fiecare curs:
  [Imagine actuală]
  [Buton] "Incarcă Imagine"
  └─ Click → Select imagine din file explorer
  └─ Imagine → MongoDB GridFS
  └─ Course updated cu imageId
  ✓ Status: "Stocata în MongoDB"
```

### 3. Upload Reels

**AdminPanel → Tab "Gestionare Imagini" → "Thumbnail-uri Reels"**

```
Similar cu cursurile
Selectează imagine 9:16 pentru reel
Se salvează în MongoDB GridFS
```

---

## 📊 Validări

### File Upload Constraints
- ✅ Doar imagini: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- ✅ Max 5MB per imagine
- ✅ Recommended: PNG/WEBP cu transparency

### Dimensiuni Recomandate
- **Course Thumbnail**: 1920x1080 (16:9 ratio)
- **Reel Thumbnail**: 1080x1920 (9:16 ratio)
- **Compression**: WEBP recommended (mai mic decât PNG/JPG)

---

## 🔄 Caching Strategy

### IndexedDB Cache (7 zile)
```typescript
// Automat când se descent imaginea
cacheMedia('course-thumbnail-{courseId}', blob, 7 * 24 * 60 * 60 * 1000)

// La reîncărcare
getCachedMedia('course-thumbnail-{courseId}')
```

### Blob URL Lifecycle
```
Download → Blob → Cache → Blob URL → Display
                    ↓ (7 days later)
                  Auto-delete
```

---

## 🗄️ Database Structure

### MongoDB Collections

#### `courses` Collection
```javascript
{
  _id: ObjectId("..."),
  title: "Advanced React",
  thumbnail: "https://images.unsplash.com/...",  // Fallback
  thumbnailImageId: ObjectId("..."),              // MongoDB GridFS ID ⭐
  instructor: "John Doe",
  // ... other fields
}
```

#### `reels` Collection
```javascript
{
  _id: ObjectId("..."),
  title: "React Tips #5",
  thumbnail: "https://images.unsplash.com/...",  // Fallback
  thumbnailImageId: ObjectId("..."),              // MongoDB GridFS ID ⭐
  creator: "John Doe",
  // ... other fields
}
```

#### GridFS Buckets
```
thumbnails.files     → Course images
thumbnails.chunks    → Image data

reelThumbnails.files → Reel images
reelThumbnails.chunks → Image data
```

---

## 🚀 Deployment

### Requirements
1. **MongoDB Atlas** - Configured GridFS buckets
2. **Backend Node.js** - Upload endpoints implemented
3. **Frontend** - Already configured

### Backend Setup (Express)
```javascript
const GridFSBucket = require('mongodb').GridFSBucket;
const db = client.db('masterclass');
const thumbnailBucket = new GridFSBucket(db, { bucketName: 'thumbnails' });

// POST /admin/courses/:courseId/thumbnail
router.post('/admin/courses/:courseId/thumbnail', async (req, res) => {
  const uploadStream = thumbnailBucket.openUploadStream('course-' + req.params.courseId);
  
  req.file.buffer.pipe(uploadStream);
  
  uploadStream.on('finish', async () => {
    // Save imageId to course
    await coursesCollection.updateOne(
      { _id: ObjectId(req.params.courseId) },
      { $set: { thumbnailImageId: uploadStream.id } }
    );
    
    res.json({ imageId: uploadStream.id });
  });
});

// GET /media/thumbnails/:imageId
router.get('/media/thumbnails/:imageId', async (req, res) => {
  const downloadStream = thumbnailBucket.openDownloadStream(
    ObjectId(req.params.imageId)
  );
  
  res.set('Content-Type', 'image/jpeg');
  downloadStream.pipe(res);
});
```

---

## ✅ Checklist Setup

- [ ] Backend: Implementat POST `/admin/courses/:id/thumbnail`
- [ ] Backend: Implementat POST `/admin/reels/:id/thumbnail`
- [ ] Backend: Implementat GET `/media/thumbnails/:imageId`
- [ ] Backend: Implementat GET `/media/reel-thumbnails/:imageId`
- [ ] Backend: GridFS buckets create
- [ ] Frontend: Verified `imageUploadManager.ts` working
- [ ] Frontend: Verified `AdminPanel` tab "Gestionare Imagini"
- [ ] Database: `thumbnailImageId` field in Course & Reel documents
- [ ] Testing: Upload curs → verify MongoDB → verify cache

---

## 📝 Note Importante

1. **Imagini Fără ImageId**: Vor folosi fallback thumbnail URL (Unsplash)
2. **Update Progresiv**: Poți upload imagini pentru cursuri/reels existente
3. **Auto-Cache**: Imaginile din MongoDB se cache automat (7 zile)
4. **Offline Support**: Imaginile cache-ate funcționează offline
5. **Storage**: Limitat doar de MongoDB Atlas plan (default: 512MB GridFS)

---

## 🐛 Troubleshooting

### "Upload failed"
- Verifică backend `/admin/courses/:id/thumbnail` running
- Verifică MongoDB connection
- Verifică CORS headers

### "Image appears blurry"
- Nu ar trebui - folosim sharp images din file explorer
- Check cache corruption: Ctrl+Shift+Delete → Clear IndexedDB

### "Image doesn't appear"
- Verifică `GET /media/thumbnails/:imageId` endpoint
- Verifică `ObjectId` format din MongoDB
- Check browser console pentru network errors

---

## 📚 Referințe

- MediaOptimization.ts - Caching system
- imageUploadManager.ts - Upload utilities
- AdminPanel.tsx - Upload UI
- api.ts - API service layer
