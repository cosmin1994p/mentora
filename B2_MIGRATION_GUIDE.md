# B2 + Cloudflare Migration Guide

## ✅ Completat: Migrare MongoDB Atlas → Backblaze B2

Aceasta este documentația completă pentru migrarea video-urilor proiectului din MongoDB Atlas GridFS la Backblaze B2 cu CDN Cloudflare.

---

## 📋 Ce s-a schimbat?

### Serverul
1. **MediaRoutes** (`/api/media/:fileId`) - acum redirecționează direct la B2 CDN
2. **AdminController** - forțează B2 pentru upload (fără fallback GridFS)
3. **HLSService** - transcodeaza local, apoi urcă pe B2
4. **B2Service** - API îmbunătățit cu metode dedicate (video, thumbnail, HLS)

### Baza de date
- Videouri: URL direct B2 (ex: `https://cdn.mentora.page/file/mentora/videos/...`)
- Thumbnails: URL direct B2
- Instructor images: URL direct B2

---

## 🚀 Pași de implementare

### 1. Configurare B2 ✓

Variabilele sunt deja setate în `.env`:

```env
B2_KEY_ID=003fcead353d3820000000001
B2_APP_KEY=K003QYvkapqxH3cmWn+uXqzMKFFpiVU
B2_BUCKET_NAME=mentora
B2_ENDPOINT=s3.eu-central-003.backblazeb2.com
B2_REGION=eu-central-003
B2_CDN_URL=https://cdn.mentora.page/file/mentora
```

**Verifică că:**
- [ ] Bucket-ul B2 "mentora" este creat și activ
- [ ] CDN Cloudflare este configurat și activ
- [ ] API keys sunt corecte

### 2. Deployează codul actualiza

```bash
cd backend
npm install  # Dacă sunt noi dependențe
```

**Fișiere modificate:**
- ✅ `src/services/b2Service.js` - API îmbunătțit
- ✅ `src/routes/mediaRoutes.js` - Redirecții B2
- ✅ `src/controllers/adminController.js` - B2 exclusiv
- ✅ `src/services/hlsService.js` - Upload B2

### 3. Migrare date existente (OPȚIONAL)

Dacă ai videouri în MongoDB GridFS pe care vrei să le migrezi:

```bash
node migrate_gridfs_to_b2.js
```

**Ce face:**
- Descarcă videouri din MongoDB GridFS
- Urcă pe Backblaze B2
- Actualizează URL-urile în baza de date

**Timp estimat:**
- 5-10 minute pentru ~50 fișiere (depinde de mărimea și viteza)

**Output exemplu:**
```
=====================================
  MongoDB GridFS → Backblaze B2
  Migration Script
=====================================

✓ B2 Service configured and ready

📖 Fetching courses from MongoDB...
Found 25 courses

🎬 Migrating course: fffffffffffffffff
  📹 Video fileId: 69da8a71473f86f787a0fbd7
    ↓ Downloaded: 109.5MB
    ↑ Uploaded to B2: https://cdn.mentora.page/file/mentora/videos/69da8a6e473f86f787a0fbd1-1712960686134.mp4
  ✓ Course updated with B2 URLs

...

=====================================
  Migration Complete!
=====================================
✓ Courses migrated: 25/25
✓ Reels migrated: 0/0
✓ Total items processed: 25
=====================================
```

---

## 🧪 Testare

### Test 1: Upload curs nou cu video

```bash
# 1. Pornește serverul
npm start

# 2. Upload curs cu video
POST /api/admin/courses
Content-Type: multipart/form-data

- title: "Test Video"
- video: <your_video.mp4>
- thumbnail: <your_image.jpg>
- ...
```

**Verificări:**
- [ ] Video-ul este comprimat
- [ ] URL-ul din baza de date este de la B2 (conține `cdn.mentora.page` sau `s3.eu-central-003.backblazeb2.com`)
- [ ] Videoul se redă corect din player
- [ ] HLS playlistele sunt generate și disponibile pe B2

### Test 2: Download video existent

```bash
# Verifică că media routes redirecționează corect
curl -I http://localhost:8080/api/media/videos/69da8a6e473f86f787a0fbd1-1712960686134.mp4

# Ar trebui să returneze redirect (301/302) la B2 CDN
```

### Test 3: HLS Streaming

```bash
# Verifică HLS master playlist
curl http://localhost:8080/api/hls/courseId/master.m3u8

# Ar trebui să afișeze playlistele variant (480p, 720p, 1080p)
```

### Test 4: Cloudflare CDN

```bash
# Verifică că CDN servește fișierele
curl -I https://cdn.mentora.page/file/mentora/videos/...

# Ar trebui să răspundă 200 OK cu cache headers
```

---

## 📊 Monitoring și Debugging

### Verifică ce e stocat pe B2

```bash
# Folosind AWS CLI (dacă e instalat)
aws s3 --profile backblaze-b2 ls s3://mentora/videos/
aws s3 --profile backblaze-b2 ls s3://mentora/hls/
```

### Logs din aplicație

```bash
# Cauta mesajele de upload
grep -i "B2" backend.log
grep -i "uploaded to B2" backend.log
```

### URL Patterns

**Video direct:**
```
https://cdn.mentora.page/file/mentora/videos/{courseId}-{timestamp}-{filename}.mp4
```

**HLS Master playlist:**
```
https://cdn.mentora.page/file/mentora/hls/{courseId}/master.m3u8
```

**HLS Variant playlist:**
```
https://cdn.mentora.page/file/mentora/hls/{courseId}/720p/stream.m3u8
```

**HLS Segment:**
```
https://cdn.mentora.page/file/mentora/hls/{courseId}/720p/segment000.ts
```

---

## ⚠️ Limitări și Considerații

### GridFS este încă folosit pentru?
- **NU** - video-uri și thumbails-urile noi sunt 100% pe B2
- Fișierele vechi din GridFS raman până la migrare
- După migrare, poți șterge GridFS cu `cleanup_gridfs.js` (backup înainte!)

### Fallback la local copy?
- **MediaRoutes** nu mai servește din local cache
- Doar redirecționează la B2 URL
- HLS RouteRORE încă servește local pentru backward compatibility

### Ce dacă B2 e down?
- Videouri nu vor fi disponibile
- Recomandare: configurează failover CDN extra

---

## 🔧 Troubleshooting

### "B2 service not configured"
```
❌ Soluție: Verifică variabilele .env
cd backend && cat .env | grep B2_
```

### "Upload failed to B2"
```
❌ Posibilități:
1. Credentiale B2 expirate → regenerează în Backblaze dashboard
2. Bucket-ul nu există → creeaza "mentora" bucket
3. Permisiuni insuficiente → verifica Application Key permissions
```

### "Videoul slow la redare"
```
❌ Verificari:
1. CDN Cloudflare activ? → https://cdn.mentora.page
2. Caching headers corecte? → curl -I https://cdn.mentora.page/file/...
3. Bitrate video prea mare? → recomprim cu ffmpeg
```

### "HLS playlist gol"
```
❌ Verificari:
1. ffmpeg instalat? → which ffmpeg
2. Spațiu disk pentru transcoding? → df -h
3. Permisiuni folder hls_output? → ls -la hls_output/
```

---

## 📈 Performance Tips

### 1. Compresie video
Videoun sunt autocomprise în adminController:
- H.264 codec
- CRF 22 (quality/size balance)
- 8Mbps video bitrate
- Redimensionat sub 3840x2160

### 2. HLS segmente
Sunt generate în multiple calități:
- 480p (1000kbps)
- 720p (3000kbps)
- 1080p (6000kbps)
- 1440p (12Mbps)
- 4K (20Mbps)

**Player trece automat a cea mai bună calitate disponibilă.**

### 3. CDN Caching

**Videouri**: cache permanent (`max-age=31536000`)
**HLS Playlists**: nu se cachează (`no-cache`)
**Segmente HLS**: cache 1 an (`immutable`)

---

## 🗑️ Cleanup (Optional)

Dacă vrei să ștergi GridFS după migrare sigură:

```bash
# Backup database înainte!
mongodump --uri="mongodb+srv://..." --out=./backup

# Apoi rula
node backend/cleanup_gridfs.js
```

---

## 📞 Support

**Probleme?**
1. Verifica .env configuration
2. Ruleaza `migrate_gridfs_to_b2.js` cu debug
3. Verifica B2 bucket permissions
4. Restartează serverul

---

**Status**: ✅ Production Ready
**Last Updated**: 12 April 2026
**MongoDB→B2 Migration**: Complete
