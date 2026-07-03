import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import gridFSService from '../services/gridfsService.js';

const router = express.Router();

// ── Local disk cache ────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '..', 'media_cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('✓ Created media cache directory:', CACHE_DIR);
}

// In-memory map: fileId → { contentType, size, localPath, caching: boolean }
const cacheIndex = new Map();

/**
 * Get a file from local cache, or download from GridFS and cache it.
 * Returns { localPath, contentType, size } or null if not found.
 */
async function getCachedFile(fileId) {
  const cleanId = fileId.trim();

  // 1. Already fully cached or currently caching?
  if (cacheIndex.has(cleanId)) {
    const entry = cacheIndex.get(cleanId);
    if (entry.caching) {
      // Already downloading in background by another request. Skip concurrent override!
      return null;
    }
    if (!entry.caching && fs.existsSync(entry.localPath)) {
      return entry;
    }
  }

  // 2. Check if file exists on disk (from a previous server run)
  const localPath = path.join(CACHE_DIR, cleanId);
  const metaPath = localPath + '.meta';
  if (fs.existsSync(localPath) && fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const stats = fs.statSync(localPath);
      if (stats.size === meta.size) {
        const entry = { localPath, contentType: meta.contentType, size: meta.size, caching: false };
        cacheIndex.set(cleanId, entry);
        return entry;
      }
    } catch { }
  }

  // 3. Download from GridFS and cache to disk
  const bucket = gridFSService.getGridFSBucket();
  if (!bucket) return null;

  const objectId = new mongoose.Types.ObjectId(cleanId);
  const file = await gridFSService.getCachedFileMetadata(objectId, bucket);
  if (!file) return null;

  const entry = {
    localPath,
    contentType: file.contentType || 'application/octet-stream',
    size: file.length,
    caching: true
  };
  cacheIndex.set(cleanId, entry);

  // Download in background
  try {
    console.log(`[Cache] Downloading ${cleanId} (${(file.length / 1024).toFixed(0)}KB) from GridFS...`);
    const downloadStream = bucket.openDownloadStream(objectId);
    const writeStream = fs.createWriteStream(localPath);

    await new Promise((resolve, reject) => {
      downloadStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      downloadStream.on('error', reject);
    });

    // Write metadata
    fs.writeFileSync(metaPath, JSON.stringify({
      contentType: entry.contentType,
      size: entry.size,
      cachedAt: new Date().toISOString()
    }));

    entry.caching = false;
    console.log(`[Cache] ✓ Cached ${cleanId} (${(file.length / 1024).toFixed(0)}KB)`);
    return entry;
  } catch (err) {
    console.error(`[Cache] Failed to cache ${cleanId}:`, err.message);
    entry.caching = false;
    // Clean up partial file
    try { fs.unlinkSync(localPath); } catch { }
    try { fs.unlinkSync(metaPath); } catch { }
    cacheIndex.delete(cleanId);
    return null;
  }
}

/**
 * Serve a file from local disk with full range request support.
 */
function serveLocalFile(req, res, cached) {
  const { localPath, contentType, size: fileSize } = cached;
  const isVideo = contentType.startsWith('video/') || contentType.startsWith('audio/');
  const isImage = contentType.startsWith('image/');

  // ETag
  const etag = `"${path.basename(localPath)}-${fileSize}"`;
  if (req.headers['if-none-match'] === etag) return res.status(304).end();

  res.set('Accept-Ranges', 'bytes');
  res.set('ETag', etag);
  res.set('Connection', 'keep-alive');
  res.set('X-Content-Type-Options', 'nosniff');

  if (isImage) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (isVideo) {
    res.set('Cache-Control', 'no-cache');
  }

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const CHUNK_SIZE = 3 * 1024 * 1024; // Limit to 3MB chunks like GridFS to prevent proxy hanging
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const stream = fs.createReadStream(localPath, { start, end });
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    });

    const stream = fs.createReadStream(localPath);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }
}

/**
 * Fallback: stream directly from GridFS (while caching in background).
 */
function streamFromGridFS(req, res, fileId, bucket, file) {
  const fileSize = file.length;
  const contentType = file.contentType || 'application/octet-stream';
  const isVideo = contentType.startsWith('video/') || contentType.startsWith('audio/');
  const isImage = contentType.startsWith('image/');
  const objectId = new mongoose.Types.ObjectId(fileId.trim());

  const etag = `"${fileId}-${fileSize}"`;
  if (req.headers['if-none-match'] === etag) return res.status(304).end();

  res.set('Accept-Ranges', 'bytes');
  res.set('ETag', etag);
  res.set('Connection', 'keep-alive');
  res.set('X-Content-Type-Options', 'nosniff');

  if (isImage) res.set('Cache-Control', 'public, max-age=31536000, immutable');
  else if (isVideo) res.set('Cache-Control', 'no-cache');

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const CHUNK_SIZE = 3 * 1024 * 1024;
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const ds = bucket.openDownloadStream(objectId, { start, end: end + 1 });
    ds.on('error', (err) => {
      console.error('[GridFS Error]', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.destroy(); // Hard destroy socket so Chrome knows it's broken
    });
    res.on('close', () => ds.destroy());
    ds.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType });
    const ds = bucket.openDownloadStream(objectId);
    ds.on('error', (err) => {
      console.error('[GridFS Error]', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    res.on('close', () => ds.destroy());
    ds.pipe(res);
  }
}

// ── Routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/media/:fileId - Stream media file
 * Serves from local disk cache when available (instant).
 * Falls back to GridFS streaming + background caching on first access.
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !/^[a-f0-9]{24}$/i.test(fileId.trim())) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    // Try serving from local cache first (instant)
    const cached = await getCachedFile(fileId);
    if (cached && !cached.caching && fs.existsSync(cached.localPath)) {
      return serveLocalFile(req, res, cached);
    }

    // Fallback: stream from GridFS (slow but works on first access)
    const bucket = gridFSService.getGridFSBucket();
    if (!bucket) return res.status(500).json({ error: 'Storage not available' });

    const objectId = new mongoose.Types.ObjectId(fileId.trim());
    const file = await gridFSService.getCachedFileMetadata(objectId, bucket);
    if (!file) return res.status(404).json({ error: 'Media not found' });

    // Start background caching while streaming from GridFS
    if (!cached) {
      getCachedFile(fileId).catch(() => { });
    }

    streamFromGridFS(req, res, fileId, bucket, file);
  } catch (error) {
    console.error('Stream media error:', error.message);
    if (!res.headersSent) res.status(404).json({ error: 'Media not found' });
  }
});

/**
 * GET /api/media/:fileId/info - Get media file info
 */
router.get('/:fileId/info', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { info } = await gridFSService.getFile(fileId);

    res.json({
      success: true,
      file: {
        id: info._id,
        filename: info.filename,
        contentType: info.contentType,
        size: info.length,
        uploadDate: info.uploadDate,
        metadata: info.metadata
      }
    });
  } catch (error) {
    console.error('Get media info error:', error);
    res.status(404).json({ error: 'Media not found' });
  }
});

/**
 * GET /api/media/thumbnails/:fileId - Get thumbnail
 */
router.get('/thumbnails/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !/^[a-f0-9]{24}$/i.test(fileId.trim())) return res.status(400).send('Invalid ID');

    const cached = await getCachedFile(fileId);
    if (cached && !cached.caching && fs.existsSync(cached.localPath)) {
      return serveLocalFile(req, res, cached);
    }

    // Fallback to GridFS
    const bucket = gridFSService.getGridFSBucket();
    if (!bucket) return res.status(500).send('Storage not available');
    const objectId = new mongoose.Types.ObjectId(fileId.trim());
    const file = await gridFSService.getCachedFileMetadata(objectId, bucket);
    if (!file) return res.status(404).send('Not found');

    const etag = `"${fileId}-${file.length}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': etag,
    });
    bucket.openDownloadStream(objectId).pipe(res);
  } catch (error) {
    res.status(404).send('Not found');
  }
});

/**
 * GET /api/media/reel-thumbnails/:fileId - Get reel thumbnail
 */
router.get('/reel-thumbnails/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !/^[a-f0-9]{24}$/i.test(fileId.trim())) return res.status(400).send('Invalid ID');

    const cached = await getCachedFile(fileId);
    if (cached && !cached.caching && fs.existsSync(cached.localPath)) {
      return serveLocalFile(req, res, cached);
    }

    const bucket = gridFSService.getGridFSBucket();
    if (!bucket) return res.status(500).send('Storage not available');
    const objectId = new mongoose.Types.ObjectId(fileId.trim());
    const file = await gridFSService.getCachedFileMetadata(objectId, bucket);
    if (!file) return res.status(404).send('Not found');

    const etag = `"${fileId}-${file.length}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();

    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': etag,
    });
    bucket.openDownloadStream(objectId).pipe(res);
  } catch (error) {
    res.status(404).send('Not found');
  }
});

/**
 * POST /api/media/precache - Pre-cache all media from GridFS to local disk
 * Call this once after server start to warm up the cache.
 */
router.post('/precache', async (req, res) => {
  try {
    const bucket = gridFSService.getGridFSBucket();
    if (!bucket) return res.status(500).json({ error: 'Storage not available' });

    const files = await bucket.find({}).toArray();
    const results = { total: files.length, cached: 0, skipped: 0, errors: 0 };

    // Cache in background, return immediately
    res.json({ message: `Starting precache of ${files.length} files`, results });

    for (const file of files) {
      try {
        const fid = file._id.toString();
        await getCachedFile(fid);
        results.cached++;
      } catch {
        results.errors++;
      }
    }

    console.log(`[Cache] Precache complete: ${results.cached}/${results.total} files cached`);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

export default router;

