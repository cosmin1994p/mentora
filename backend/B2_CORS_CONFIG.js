/**
 * CORS Configuration for Backblaze B2
 * 
 * DEPLOY: Paste this in Backblaze B2 Dashboard → Bucket → CORS Settings
 * 
 * This allows:
 * - HTTP Range requests (video seeking)
 * - Cross-origin video playback
 * - HLS streaming from any domain
 */

const B2_CORS_RULES = [
  {
    "corsRuleName": "HLS-Streaming",
    "allowedOrigins": ["*"], // Or specify your domain: ["https://stud.ase.ro"]
    "allowedHeaders": ["Range", "Authorization", "Content-Type"],
    "allowedOperations": [
      "b2_download_file_by_name",
      "b2_download_file_by_id",
      "b2_download_file_from_url"
    ],
    "maxAgeSeconds": 3600,
    "exposeHeaders": ["Content-Range", "Content-Length", "Content-Type"]
  }
];

/**
 * DEPLOY STEPS:
 * 
 * 1. Go to: https://secure.backblaze.com/b2_buckets.htm
 * 2. Select bucket: "mentora"
 * 3. Click → "Bucket Settings"
 * 4. Click → "CORS Rules"
 * 5. Add the rule above
 * 6. Save
 * 
 * ✅ IMPORTANT: Range header is CRITICAL for HLS video seeking
 * Without it, video players cannot seek/scrub timeline
 */

export default B2_CORS_RULES;
