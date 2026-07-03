# Mentora Platform - Docker Compose Setup

## Quick Start

### 1. Setup Environment Variables
Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Update the following in `.env`:
- `MONGO_PASSWORD` - Set a secure MongoDB password
- `B2_APP_KEY_ID` - Your Backblaze B2 App Key ID
- `B2_APP_KEY` - Your Backblaze B2 App Key
- `B2_BUCKET` - Your B2 bucket name
- `JWT_SECRET` - Change to a secure random string for production

### 2. Start Services
```bash
docker-compose up -d
```

This starts:
- **MongoDB** on port 27017
- **Backend API** on port 5000 
- **Frontend** on port 5173

### 3. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MongoDB: mongodb://admin:password@localhost:27017

## Storage Architecture - Backblaze B2 + Cloudflare

### Unified Storage Structure
All media is stored in **same Backblaze B2 bucket** with organized folders:

```
bucket/
├── videos/                    # HLS streaming (course videos)
│   ├── course-1/
│   │   ├── master.m3u8        # HLS master file
│   │   └── segments/
│   │       ├── segment-0.ts
│   │       ├── segment-1.ts
│   │       └── ...
│   └── course-2/
│
├── reels/                     # All reels (manual + edited clips)
│   ├── reel-abc123-xyz.mp4    # Manually uploaded reel
│   ├── reel-def456-xyz.mp4    # Edited/clipped from course video
│   └── ...
│
├── thumbnails/               # All thumbnails (courses + reels unified)
│   ├── course-1-xyz.jpg
│   ├── reel-abc123-xyz.jpg
│   └── ...
│
└── assets/                    # PDFs, documents
    ├── course-doc-1.pdf
    └── ...
```

### Key Benefits of Unified Storage
- **Instant preloading**: All files cached with 1-year TTL (immutable content)
- **Simple paths**: No subdirectories like `reels/videos/` or `reels/thumbnails/`
- **Cloudflare caching**: All files served from edge with aggressive caching
- **Cost efficient**: 
  - B2 Storage: ~$6/TB/month
  - Bandwidth B2→CDN: ~$0.001/GB (minimal with Cloudflare caching)
  - Cloudflare: Free tier includes 100GB/month
  - **Total for 1TB**: ~$7/month

### How It Works
1. **Upload to B2**: All media files uploaded directly to B2 with Cache-Control headers
2. **Cloudflare CDN**: Requests route through Cloudflare edges globally
3. **Edge Caching**: Content cached at Cloudflare edges with 1-year TTL
4. **B2 Origin**: Only cache misses hit B2 origin (rare after initial load)

### Compared to AWS CloudFront
- CloudFront: $0.085/GB = **$425/month** for 5TB
- B2 + Cloudflare: **$50-80/month** for same volume

## Video Streaming & Reels

### Course Videos (HLS)
- Format: HLS with `.m3u8` manifest + `.ts` segments
- Storage: `videos/course-{id}/`
- Preload: `preload="auto"` for instant playback
- Player: Video.js with HLS.js

### Reels (All Types Unified)
- **Manual uploads**: User uploads MP4 file → stored in `reels/`
- **Edited clips**: System cuts from course HLS → stored in `reels/`
- **Preload**: `preload="auto"` for current reel + `preload="metadata"` for adjacent reels
- **Autoplay**: Muted on load, user can unmute
- **Preview on Hover**: First 15 seconds loaded on course card hover

### Performance Optimizations
- **Adjacent Preload**: Next/prev reels start loading 600ms after current reel ready
- **Intelligent Buffering**: Current reel gets full auto-preload, adjacent get metadata only
- **Cache-Control**: All files set with `max-age=31536000, immutable` for 1-year browser caching
- **Cloudflare Workers**: Can add image optimization, lazy-loading, and transformations

## Docker Commands

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f api
docker-compose logs -f mongo
docker-compose logs -f frontend
```

### Rebuild services
```bash
docker-compose up -d --build
```

### Remove volumes (reset database)
```bash
docker-compose down -v
```

## Development Notes

- **Frontend** mounts source code for hot reload
- **Backend** requires npm ci for clean installs
- **MongoDB** data persists in docker volumes
- All services on same internal network (`mentora-network`)

## Migration from Old Paths

If migrating from old reel storage (`reels/videos/` → `reels/`):

1. Run migration script (provided separately)
2. Update MongoDB documents with new paths
3. Delete old B2 folders after verification

## Troubleshooting

### MongoDB connection failed
- Check `MONGO_PASSWORD` in .env matches docker-compose.yml
- Ensure MongoDB container is healthy: `docker ps`

### API not accessible
- Check backend is running: `docker-compose logs api`
- Verify port 5000 is not in use
- Check B2 credentials in .env

### Frontend not loading
- Check frontend logs: `docker-compose logs frontend`
- Verify port 5173 is available
- Check VITE_API_BASE_URL in docker-compose.yml

### Video/reel not playing
- Verify B2 bucket is configured correctly
- Check file exists in B2 with correct path
- Ensure Cloudflare DNS is set up
- Verify Cache-Control headers set on upload

### Reels loading slowly
- Check preload strategy in vertical-reel-stack.tsx
- Verify B2 bandwidth not throttled
- Check Cloudflare cache hit rate in analytics
- Ensure adjacent preload timeout (600ms) is optimal
