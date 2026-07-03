import mongoose from 'mongoose';
import { Readable } from 'stream';

let gfsBucket = null;

// In-memory metadata cache to avoid Atlas round-trips on every media request
const metadataCache = new Map();
const METADATA_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get file metadata from cache or Atlas
 * @param {ObjectId} objectId - The file ObjectId
 * @param {object} bucket - GridFS bucket
 * @returns {Promise<object|null>} - File metadata or null
 */
async function getCachedFileMetadata(objectId, bucket) {
  const key = objectId.toString();
  const cached = metadataCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < METADATA_CACHE_TTL) {
    return cached.file;
  }
  const files = await bucket.find({ _id: objectId }).toArray();
  if (!files || files.length === 0) return null;
  metadataCache.set(key, { file: files[0], timestamp: Date.now() });
  // Evict old entries periodically (keep cache under 5000 items)
  if (metadataCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of metadataCache) {
      if (now - v.timestamp > METADATA_CACHE_TTL) metadataCache.delete(k);
    }
  }
  return files[0];
}

/**
 * Initialize GridFS Bucket
 * Call this after mongoose connection is established
 */
export const initGridFS = () => {
  if (mongoose.connection.readyState === 1) {
    gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
    console.log('✓ GridFS initialized with bucket: uploads');
    return gfsBucket;
  }
  return null;
};

/**
 * Get the GridFS bucket
 */
export const getGridFSBucket = () => {
  if (!gfsBucket) {
    console.log('[GridFS] Bucket not initialized, checking connection state:', mongoose.connection.readyState);
    if (mongoose.connection.readyState === 1) {
      return initGridFS();
    } else {
      console.warn('[GridFS] Cannot initialize bucket, MongoDB NOT connected (state: ' + mongoose.connection.readyState + ')');
    }
  }
  return gfsBucket;
};

/**
 * Upload a file to GridFS
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Filename
 * @param {string} contentType - MIME type
 * @param {object} metadata - Additional metadata
 * @returns {Promise<ObjectId>} - The file ID
 */
export const uploadFile = async (buffer, filename, contentType, metadata = {}) => {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  return new Promise((resolve, reject) => {
    const readableStream = Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    readableStream.pipe(uploadStream);
  });
};

/**
 * Download a file from GridFS
 * @param {ObjectId|string} fileId - The file ID
 * @returns {Promise<{stream: ReadableStream, file: object}>}
 */
export const downloadFile = async (fileId) => {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;

  // Get file info first
  const files = await bucket.find({ _id: objectId }).toArray();
  if (files.length === 0) {
    throw new Error('File not found');
  }

  const file = files[0];
  const downloadStream = bucket.openDownloadStream(objectId);

  return { stream: downloadStream, file };
};

/**
 * Delete a file from GridFS
 * @param {ObjectId|string} fileId - The file ID
 */
export const deleteFile = async (fileId) => {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  await bucket.delete(objectId);
};

/**
 * Download image from URL and store in GridFS
 * @param {string} imageUrl - URL of the image
 * @param {string} filename - Desired filename
 * @returns {Promise<ObjectId>} - The file ID
 */
export const downloadAndStoreImage = async (imageUrl, filename) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    const fileId = await uploadFile(buffer, filename, contentType, {
      sourceUrl: imageUrl,
      uploadedAt: new Date()
    });

    console.log(`✓ Stored image: ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
    return fileId;
  } catch (error) {
    console.error(`Failed to download image from ${imageUrl}:`, error.message);
    throw error;
  }
};

/**
 * Enhanced stream to response for video seeking (range support)
 */
export const streamToResponse = async (fileId, res, options = {}) => {
  try {
    const bucket = getGridFSBucket();
    if (!bucket) {
      console.error('✗ GridFS bucket not initialized');
      throw new Error('GridFS not initialized');
    }

    const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId.trim()) : fileId;
    console.log(`[GridFS] Streaming file: ${objectId}`);

    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || !files.length) {
      console.error(`✗ File not found in uploads.files: ${objectId}`);
      throw new Error('File not found');
    }
    const file = files[0];
    console.log(`[GridFS] File found: ${file.filename} (${file.contentType}, ${file.length} bytes)`);

    const { range } = options;
    if (range && (file.contentType?.startsWith('video/') || file.contentType?.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.contentType,
      });

      bucket.openDownloadStream(objectId, { start, end: end + 1 }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': file.contentType,
      });
      bucket.openDownloadStream(objectId).pipe(res);
    }
  } catch (error) {
    console.error('[GridFS Error]', error);
    throw error;
  }
};

/**
 * Get file info and stream
 */
export const getFile = async (fileId) => {
  const { file, stream } = await downloadFile(fileId);
  return { info: file, stream };
};

export default {
  initGridFS,
  initialize: initGridFS,  // Alias for server.js compatibility
  getGridFSBucket,
  get bucket() { return gfsBucket; },
  uploadFile,
  downloadFile,
  getFile,
  deleteFile,
  downloadAndStoreImage,
  streamToResponse,
  getCachedFileMetadata
};
