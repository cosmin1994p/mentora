# 💰 Cost Analysis: 1TB B2 + Cloudflare CDN

## Quick Summary
```
Monthly Cost for 1TB Storage + Video Streaming:
┌─────────────────────────────────────┐
│ B2 Storage:        ~$6 - $8/month   │
│ B2 Bandwidth:      $0 - $50/month   │
│ Cloudflare CDN:    FREE             │
│ MongoDB (metadata): ~$15 - $30      │
├─────────────────────────────────────┤
│ TOTAL:            $21 - $88/month   │
│ (Depending on traffic)              │
└─────────────────────────────────────┘
```

---

## Detailed B2 Pricing

### 1. Storage Costs

| Scenario | Capacity | Cost/month |
|----------|----------|-----------|
| **Small** (100 GB) | 100 GB | $0.60 |
| **Medium** (500 GB) | 500 GB | $3.00 |
| **Large** (1 TB) | 1,024 GB | $6.14 |
| **Extra Large** (2 TB) | 2,048 GB | $12.29 |

```
Formula: GB × $0.006 per GB per month
1 TB (1,024 GB) × $0.006 = $6.14/month
```

### 2. Bandwidth Costs (Download)

**B2 Bandwidth Costs:**
- **$0.10 per GB** for downloads
- **First 1 GB per day is FREE** = ~30 GB/month free

**Examples:**

| Monthly Traffic | Cost Calculation | Total Cost |
|-----------------|-----------------|-----------|
| 10 GB/month | (10 - 30 free) = $0 | **$0** |
| 50 GB/month | 50 GB × $0.10 | **$5** |
| 100 GB/month | 100 GB × $0.10 | **$10** |
| 500 GB/month | 500 GB × $0.10 | **$50** |
| 1 TB/month | 1,024 GB × $0.10 | **$102** |

**But with Cloudflare CDN:**
- CDN caches at edge servers (less B2 downloads)
- Typical cache hit ratio: **70-85%**
- Effective bandwidth to B2: Only 15-30%

**Example with CDN Cache:**
```
Without CDN:  100 GB traffic = 100 GB × $0.10 = $10
With CDN:     100 GB traffic × 25% = 25 GB from B2 = $2.50
Savings:      75% reduction!
```

### 3. Transaction Costs (Usually negligible)

| Operation | Cost | Your Usage |
|-----------|------|-----------|
| File Upload | $0.005 per 10,000 | 1 course/day = ~0.15/month |
| File Download | $0.001 per 10,000 | Minimal (CDN) |

**Typical monthly:** <$0.50

---

## Cloudflare Integration

### Cost: **$0 - FREE!** ✅

**Why Free?**
- Cloudflare R2 (B2 alternative) would cost money
- But Cloudflare Workers CDN works with B2 redirects
- Public cache rules = zero cost

**What You Get:**
- Global CDN caching
- DDoS protection
- Faster delivery worldwide
- SSL/TLS encryption
- No egress fees from Cloudflare!

```
┌─────────────────────────────────┐
│ Video Request Flow              │
├─────────────────────────────────┤
│ User → Closest Cloudflare Edge  │
│        (cached video)           │
│        ↓                        │
│    If not cached:              │
│    Fetch from B2 → Cache       │
│    Serve to user               │
└─────────────────────────────────┘
```

---

## 3 Cost Scenarios for Your Platform

### Scenario 1: Small Community (Light Usage)
```
Platform Size:      50 courses
Storage Used:       400 GB
Daily Views:        5,000 views/day
Monthly Traffic:    ~50 GB downloads

Costs:
├─ B2 Storage:      400 GB × $0.006 = $2.40
├─ B2 Bandwidth:    50 GB × $0.10 = $5.00
├─ Cloudflare:      FREE
└─ MongoDB:         $15-25
─────────────────────────────────
TOTAL/month:        $22-32
Per User/month:     $0.04-0.06 (if 500 users)
```

### Scenario 2: Medium Platform (Growing)
```
Platform Size:      200 courses (1 TB)
Daily Views:        50,000 views/day
Monthly Traffic:    ~200 GB downloads

Costs:
├─ B2 Storage:      1 TB × $6.14 = $6.14
├─ B2 Bandwidth:    200 GB × $0.10 = $20.00
├─ Cloudflare:      FREE
└─ MongoDB:         $25-50
─────────────────────────────────
TOTAL/month:        $51-76
Per User/month:     $0.02-0.03 (if 2,000+ users)
```

### Scenario 3: Large Platform (Full Scale)
```
Platform Size:      500 courses (2.5 TB)
Daily Views:        200,000 views/day
Monthly Traffic:    ~500 GB downloads

Costs:
├─ B2 Storage:      2.5 TB × $15.36 = $15.36
├─ B2 Bandwidth:    500 GB × $0.10 = $50.00
├─ Cloudflare:      FREE
└─ MongoDB:         $50-100
─────────────────────────────────
TOTAL/month:        $115-165
Per User/month:     $0.01-0.02 (if 5,000+ users)
```

---

## Comparison: B2 vs Other Providers

| Provider | Storage | Bandwidth | CDN | Total/month (1TB) |
|----------|---------|-----------|-----|------------------|
| **B2 + CFW** | $6.14 | $10-50 | FREE | **$16-56** |
| AWS S3 | $23 | $85-170 | $20-100 | **$128-293** |
| Google Cloud | $20 | $85-170 | $50-100 | **$155-290** |
| Azure Blob | $20 | $0.10/GB | $50-100 | **$170-220** |
| DigitalOcean Spaces | $5 | $250/mo flat | $0 | **$255** |

**B2 + Cloudflare: 3-4x CHEAPER** 💰

---

## MongoDB Atlas Usage (Current)

### ✅ What MongoDB Stores Now:

1. **Course Metadata** (~5-10 MB per course)
   - Title, description
   - Category, tags, rating
   - Instructor info
   - Quiz questions
   - Lesson structure

2. **Video URL Pointers** (~1 KB per course)
   - `videoUrl: "https://cdn.mentora.page/file/mentora/videos/xxx.mp4"`
   - `hlsUrl: "https://cdn.mentora.page/file/mentora/hls/courseId/master.m3u8"`
   - NOT the actual video data!

3. **User/Student Data** (~1 MB per 1,000 users)
   - User profiles
   - Authentication tokens
   - Enrollment records
   - Progress tracking
   - Watch history
   - Bookmarks

4. **Interaction Data**
   - Comments
   - Ratings & reviews
   - Student Q&A
   - Discussion forums

5. **Admin Data**
   - Activity logs
   - Course creation history
   - User management

### Database Size Estimate:

```
50 courses:
├─ Course documents:    50 × 10 MB = 500 MB
├─ 1,000 users data:    1,000 × 1 MB = ~100 MB
├─ Comments/ratings:    ~50 MB
└─ Logs/activity:       ~50 MB
─────────────────────────────────
Total:                  ~700 MB

COST: $15-20/month (M2 cluster)
```

### ❌ What MongoDB NO LONGER Stores:

```
❌ Video files          → Now in B2
❌ HLS segments         → Now in B2
❌ Thumbnails          → Now in B2
❌ Instructor images   → Now in B2
❌ Reel videos         → Now in B2

Removed: ~85% of database bulk!
```

---

## Total Monthly Cost Breakdown

### For 1TB Platform with 2,000 users:

```
┌──────────────────────────────────────┐
│ SERVICE COSTS                         │
├──────────────────────────────────────┤
│ B2 Storage (1 TB)          $6.14     │
│ B2 Bandwidth (200 GB/mo)   $20.00    │
│ Cloudflare CDN             FREE ✓    │
│ MongoDB Atlas (M2)         $25.00    │
├──────────────────────────────────────┤
│ SUBTOTAL                   $51.14    │
│ Buffer (10% margin)        $5.11     │
├──────────────────────────────────────┤
│ TOTAL/MONTH                $56.25    │
├──────────────────────────────────────┤
│ Cost per user/month        $0.028    │
│ Cost per GB storage        $0.056    │
└──────────────────────────────────────┘
```

### Annual Cost:
```
$56.25 × 12 = $675/year

Much cheaper than:
- AWS: $1,500-3,500/year
- Google Cloud: $1,800-3,500/year
```

---

## Ways to Reduce Costs Further

### 1. Video Compression
```
Before: Full quality = 500 MB per hour
After:  H.264 CRF 25 = 150 MB per hour
Savings: 70% storage reduction
```

### 2. Selective Caching Strategy
```
Popular courses:     Cache 30 days (Cloudflare)
New courses:         Cache 7 days
Old courses:         Cache on-demand (99% CDN hit rate)
Savings: 40% B2 bandwidth reduction
```

### 3. Adaptive Bitrate (HLS Tiers)
```
Keep only:
- 720p (3 Mbps) - default
- 1080p (6 Mbps) - optional
Remove:
- 480p (tiny screens)
- 4K (90% users don't watch)
Savings: 50% storage/bandwidth
```

### 4. Lifecycle Policies
```
Active courses:   Keep all HLS variants
Archived:         Delete HLS, keep original video
Old (6+ months):  Move to cheaper storage class
Savings: 20-30% storage
```

---

## Hidden Costs to Watch

| Item | Cost | Notes |
|------|------|-------|
| **Domain & SSL** | $0-15 | Through Cloudflare (usually free) |
| **Backend Server** | $10-100 | VPS for API (separate from video) |
| **Video Encoding** | INCLUDED | Local FFmpeg on backend |
| **Setup/Migration** | ONE-TIME | Already done! |
| **Monitoring** | FREE | Cloudflare + B2 dashboards |
| **Backup** | FREE | B2 versioning included |

---

## Cost Optimization Timeline

### Month 1-3: Setup Phase
```
Cost: $150-200
- B2 setup: Free
- Initial 500 GB storage: $3/month
- MongoDB: Keep as-is ($25/month)
- Testing/validation: Free
```

### Month 4-12: Growth Phase
```
Cost: $300-600 (for 500 GB-1TB storage)
- Gradual upload to B2
- Optimize CDN cache rules
- Monitor bandwidth usage
```

### Year 2+: Optimization Phase
```
Cost: $600-1,000/year (if grows to 2TB)
- Auto-scaling based on traffic
- Tiered retention policies
- Archive old courses
```

---

## ROI Comparison vs Old MongoDB-Only Setup

### Old Setup (MongoDB for everything):
```
Storage:      $200-300/month (database bloat)
Bandwidth:    Limited by database I/O
Queries:      Slow (GridFS overhead)
Global CDN:   $100-200/month extra
─────────────────────────────
TOTAL:        $300-500/month
```

### New Setup (B2 + Cloudflare):
```
Storage:      $6/month (B2)
Bandwidth:    $20-50/month (B2)
CDN:          FREE (Cloudflare)
MongoDB:      $25/month (metadata only)
─────────────────────────────
TOTAL:        $51-81/month
```

### **Annual Savings: $2,600 - $5,400!** 🎉

---

## Final Cost Summary

### For Your 1TB Platform:

✅ **B2 Storage:** $6.14/month (fixed)
✅ **B2 Bandwidth:** $0-50/month (depends on views)
✅ **Cloudflare CDN:** FREE
✅ **MongoDB Metadata:** $25/month (reduced)

─────────────────────────────────────
**Total Monthly: $31-81/month** 💰

**Per 1,000 Courses: $0.03-0.08/course/month**
**Per 1,000 Users: $0.03-0.08/user/month**

This scales logarithmically - the more users, the lower cost per user!

---

## Action Items

1. **Enable B2 Lifecycle Policies:**
   ```
   - Delete old HLS segments after 6 months
   - Archive videos after 1 year
   ```

2. **Optimize Cloudflare Cache Rules:**
   ```
   /videos/* → Cache 30 days
   /hls/*    → Cache 3 days
   /thumbnails/* → Cache 60 days
   ```

3. **Monitor Bandwidth:**
   ```
   Monthly budget: $60
   Alert if: > $80/month
   Review and optimize if: > $100/month
   ```

4. **MongoDB Optimization:**
   ```
   Move old activity logs to archive collection
   Compress old course metadata
   Current: 700 MB → Target: 300 MB
   ```

---

## References

- B2 Pricing: https://www.backblaze.com/b2/cloud-storage-pricing.html
- Cloudflare CDN: https://www.cloudflare.com/cdn/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas/pricing
- Implementation: B2_IMPLEMENTATION_SUMMARY.md
- Verification: B2_FINAL_CONFIRMATION.md
