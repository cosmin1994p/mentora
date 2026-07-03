/**
 * Backblaze B2 S3-compatible upload service
 * Uses AWS SDK v3 with SigV4 authentication for B2 S3 endpoint
 * Serves files directly from B2 or through Cloudflare CDN
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, ListObjectVersionsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

class B2Service {
  constructor() {
    this.initialized = false;
    this.enabled = false;
    this.s3Client = null;
    this._initializeCredentials();
  }

  _getDefaultFreeStorageBytes() {
    const configuredGb = Number.parseFloat(process.env.B2_FREE_STORAGE_GB || '10');
    const safeGb = Number.isFinite(configuredGb) && configuredGb > 0 ? configuredGb : 10;
    return safeGb * 1024 * 1024 * 1024;
  }

  _getStoragePricePerGbMonth() {
    const configuredPrice = Number.parseFloat(process.env.B2_PRICE_PER_GB_MONTH || '0.006');
    return Number.isFinite(configuredPrice) && configuredPrice > 0 ? configuredPrice : 0.006;
  }

  async _scanCurrentObjects() {
    let continuationToken = undefined;
    let totalCount = 0;
    let totalBytes = 0;
    const byPrefix = new Map();

    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: this.bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });

      const listed = await this.s3Client.send(listCmd);
      for (const item of listed?.Contents || []) {
        const size = Number(item?.Size || 0);
        totalCount += 1;
        totalBytes += size;

        // Track by top-level prefix (e.g. videos/, thumbnails/, hls/, reels/)
        const key = item?.Key || '';
        const slashIdx = key.indexOf('/');
        const prefix = slashIdx === -1 ? '(root)' : key.slice(0, slashIdx);
        const entry = byPrefix.get(prefix) || { bytes: 0, count: 0 };
        entry.bytes += size;
        entry.count += 1;
        byPrefix.set(prefix, entry);
      }

      continuationToken = listed?.IsTruncated ? listed?.NextContinuationToken : undefined;
    } while (continuationToken);

    return { totalCount, totalBytes, byPrefix };
  }

  async _scanAllVersions() {
    let keyMarker = undefined;
    let versionIdMarker = undefined;
    let versionCount = 0;
    let deleteMarkerCount = 0;
    let versionBytes = 0;

    do {
      const listCmd = new ListObjectVersionsCommand({
        Bucket: this.bucketName,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
        MaxKeys: 1000
      });

      const listed = await this.s3Client.send(listCmd);
      for (const version of listed?.Versions || []) {
        versionCount += 1;
        versionBytes += Number(version?.Size || 0);
      }

      deleteMarkerCount += (listed?.DeleteMarkers || []).length;

      keyMarker = listed?.IsTruncated ? listed?.NextKeyMarker : undefined;
      versionIdMarker = listed?.IsTruncated ? listed?.NextVersionIdMarker : undefined;
    } while (keyMarker || versionIdMarker);

    return { versionCount, deleteMarkerCount, versionBytes };
  }

  async cleanupDeleteMarkers() {
    this._initializeCredentials();

    if (!this.enabled || !this.s3Client) {
      throw new Error('B2 service is not configured');
    }

    let keyMarker = undefined;
    let versionIdMarker = undefined;
    let deletedCount = 0;

    do {
      const listCmd = new ListObjectVersionsCommand({
        Bucket: this.bucketName,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
        MaxKeys: 1000
      });

      const listed = await this.s3Client.send(listCmd);
      const deleteMarkers = listed?.DeleteMarkers || [];

      if (deleteMarkers.length > 0) {
        // Delete in batches (S3 DeleteObjects supports up to 1000)
        const deleteCmd = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: deleteMarkers.map(dm => ({
              Key: dm.Key,
              VersionId: dm.VersionId
            })),
            Quiet: true
          }
        });
        
        await this.s3Client.send(deleteCmd);
        deletedCount += deleteMarkers.length;
      }

      keyMarker = listed?.IsTruncated ? listed?.NextKeyMarker : undefined;
      versionIdMarker = listed?.IsTruncated ? listed?.NextVersionIdMarker : undefined;
    } while (keyMarker || versionIdMarker);

    return { deletedCount };
  }

  async getStorageStats() {
    this._initializeCredentials();

    if (!this.enabled || !this.s3Client) {
      throw new Error('B2 service is not configured');
    }

    const [currentObjects, versions] = await Promise.all([
      this._scanCurrentObjects(),
      this._scanAllVersions()
    ]);

    const billedBytes = versions.versionBytes;
    const freeBytes = this._getDefaultFreeStorageBytes();
    const remainingFreeBytes = Math.max(0, freeBytes - billedBytes);
    const billableBytes = Math.max(0, billedBytes - freeBytes);
    const pricePerGbMonth = this._getStoragePricePerGbMonth();
    const estimatedMonthlyCost = (billableBytes / (1024 * 1024 * 1024)) * pricePerGbMonth;
    const usagePercent = freeBytes > 0 ? Math.min(100, (billedBytes / freeBytes) * 100) : 0;
    const historicalOverhead = Math.max(0, versions.versionBytes - currentObjects.totalBytes);

    // Determine warning level
    let warningLevel = 'safe';       // < 70%
    if (usagePercent >= 90) warningLevel = 'critical';
    else if (usagePercent >= 75) warningLevel = 'warning';
    else if (usagePercent >= 50) warningLevel = 'caution';

    // Build per-prefix breakdown sorted by bytes desc
    const breakdown = [];
    for (const [prefix, data] of currentObjects.byPrefix.entries()) {
      breakdown.push({ prefix, bytes: data.bytes, count: data.count });
    }
    breakdown.sort((a, b) => b.bytes - a.bytes);

    // Generate optimisation tips
    const tips = [];
    if (historicalOverhead > 1024 * 1024) {
      tips.push(`Ai ${this._formatBytesInternal(historicalOverhead)} în versiuni vechi care ocupă spațiu. Rulează cleanup-ul de versiuni pentru a le șterge.`);
    }
    if (versions.deleteMarkerCount > 10) {
      tips.push(`Există ${versions.deleteMarkerCount} delete markers care pot fi curățate.`);
    }
    if (usagePercent >= 75) {
      tips.push('Ia în considerare comprimarea videoclipurilor mari sau ștergerea conținutului nefolosit.');
    }

    return {
      provider: 'Backblaze B2 + Cloudflare CDN',
      bucketName: this.bucketName,
      currentObjects: {
        count: currentObjects.totalCount,
        bytes: currentObjects.totalBytes
      },
      versions: {
        count: versions.versionCount,
        deleteMarkers: versions.deleteMarkerCount,
        bytes: versions.versionBytes
      },
      quota: {
        freeBytes,
        remainingFreeBytes,
        billableBytes,
        pricePerGbMonth,
        estimatedMonthlyCost
      },
      usedBytes: billedBytes,
      usagePercent,
      warningLevel,
      historicalOverhead,
      breakdown,
      tips
    };
  }

  _formatBytesInternal(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(2)} ${units[unit]}`;
  }

  async _deleteAllVersionsForKey(key, options = {}) {
    const { strict = false } = options;

    let keyMarker = undefined;
    let versionIdMarker = undefined;
    let totalDeleted = 0;

    try {
      do {
        const listCmd = new ListObjectVersionsCommand({
          Bucket: this.bucketName,
          Prefix: key,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
          MaxKeys: 1000
        });

        const listed = await this.s3Client.send(listCmd);
        const versionEntries = [
          ...(listed?.Versions || []),
          ...(listed?.DeleteMarkers || [])
        ].filter((entry) => entry?.Key === key && entry?.VersionId);

        if (versionEntries.length > 0) {
          const deleteCmd = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: versionEntries.map((entry) => ({
                Key: entry.Key,
                VersionId: entry.VersionId
              })),
              Quiet: true
            }
          });

          await this.s3Client.send(deleteCmd);
          totalDeleted += versionEntries.length;
        }

        keyMarker = listed?.IsTruncated ? listed?.NextKeyMarker : undefined;
        versionIdMarker = listed?.IsTruncated ? listed?.NextVersionIdMarker : undefined;
      } while (keyMarker || versionIdMarker);

      if (totalDeleted === 0) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        await this.s3Client.send(command);
      }

      return { deleted: totalDeleted };
    } catch (error) {
      if (strict) {
        throw error;
      }
      return { deleted: totalDeleted, error: error.message };
    }
  }

  async _deleteAllVersionsByPrefix(prefix, options = {}) {
    const { strict = false } = options;

    let keyMarker = undefined;
    let versionIdMarker = undefined;
    let totalDeleted = 0;

    try {
      do {
        const listCmd = new ListObjectVersionsCommand({
          Bucket: this.bucketName,
          Prefix: prefix,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
          MaxKeys: 1000
        });

        const listed = await this.s3Client.send(listCmd);
        const versionEntries = [
          ...(listed?.Versions || []),
          ...(listed?.DeleteMarkers || [])
        ]
          .filter((entry) => entry?.Key && entry?.VersionId)
          .map((entry) => ({ Key: entry.Key, VersionId: entry.VersionId }));

        if (versionEntries.length > 0) {
          const deleteCmd = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: versionEntries,
              Quiet: true
            }
          });

          await this.s3Client.send(deleteCmd);
          totalDeleted += versionEntries.length;
        }

        keyMarker = listed?.IsTruncated ? listed?.NextKeyMarker : undefined;
        versionIdMarker = listed?.IsTruncated ? listed?.NextVersionIdMarker : undefined;
      } while (keyMarker || versionIdMarker);

      return { deleted: totalDeleted };
    } catch (error) {
      if (strict) {
        throw error;
      }
      return { deleted: totalDeleted, error: error.message };
    }
  }

  _initializeCredentials() {
    // Always check for latest env vars (in case dotenv was loaded after module import)
    this.keyId = process.env.B2_KEY_ID;
    this.appKey = process.env.B2_APP_KEY;
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.endpoint = process.env.B2_ENDPOINT;
    this.region = process.env.B2_REGION || 'eu-central-003';
    this.cdnUrl = process.env.B2_CDN_URL;
    
    console.log('[B2 Debug] Credentials check:', {
      keyId: this.keyId ? 'SET' : 'MISSING',
      appKey: this.appKey ? 'SET' : 'MISSING',
      bucketName: this.bucketName ? 'SET' : 'MISSING',
      endpoint: this.endpoint ? 'SET' : 'MISSING'
    });
    
    if (!this.keyId || !this.appKey || !this.bucketName) {
      this.enabled = false;
    } else {
      this.enabled = true;
      
      // Initialize S3 client with AWS credentials for B2 endpoint
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.keyId,
          secretAccessKey: this.appKey
        },
        endpoint: `https://${this.endpoint}`,
        forcePathStyle: true // Required for S3-compatible services
      });
      
      if (!this.initialized) {
        console.log('✓ B2 Service initialized with AWS SDK v3 (SigV4)');
      }
    }
    
    this.initialized = true;
  }

  /**
   * Upload file to B2 S3-compatible endpoint
   * @param {Buffer} fileBuffer - File content
   * @param {string} filename - File name
   * @param {string} mimeType - MIME type
   * @returns {Object} { url, fileId, filename }
   */
  async uploadFile(fileBuffer, filename, mimeType = 'application/octet-stream') {
    // Reinitialize credentials in case they were set after module load
    this._initializeCredentials();
    
    if (!this.enabled || !this.s3Client) {
      throw new Error('B2 service not configured');
    }

    // ⚠️ CRITICAL: Prevent uploading empty files - this was causing 0-byte files in B2
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      console.error(`[B2 VALIDATION ERROR] Empty buffer for ${filename}. Stack:`, new Error().stack);
      throw new Error(`Cannot upload empty file: ${filename}. Buffer is ${!fileBuffer ? 'null' : fileBuffer.length === 0 ? 'empty' : 'invalid'}`);
    }

    try {
      console.log(`[B2 UPLOAD] ${filename} - Size: ${(fileBuffer.length / 1024).toFixed(2)}KB`);
      
      // Upload to B2 S3 endpoint using AWS SDK (automatic SigV4 signing)
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimeType
      });

      await this.s3Client.send(command);
      console.log(`✓ Uploaded to B2: ${filename}`);

      // Generate CDN URL if available
      let cdnUrl;
      if (this.cdnUrl) {
        cdnUrl = `${this.cdnUrl}/${filename}`;
      } else {
        cdnUrl = `https://${this.endpoint}/${this.bucketName}/${filename}`;
      }

      return {
        fileId: filename, // Use filename as identifier
        filename: filename,
        contentType: mimeType,
        size: fileBuffer.length,
        url: cdnUrl,
        b2Url: `https://${this.endpoint}/${this.bucketName}/${filename}`
      };
    } catch (error) {
      console.error('B2 upload error:', error.message);
      throw new Error(`Failed to upload to B2: ${error.message}`);
    }
  }


  /**
   * Upload thumbnail to B2
   * @param {Buffer} fileBuffer - Image buffer
   * @param {string} courseId - Course ID for naming
   * @returns {Object} { url, fileId, filename }
   */
  async uploadThumbnail(fileBuffer, courseId) {
    const timestamp = Date.now();
    const filename = `thumbnails/${courseId}-${timestamp}.jpg`;
    return this.uploadFile(fileBuffer, filename, 'image/jpeg');
  }

  /**
   * Delete file from B2
   * @param {string} filename - File to delete
   */
  async deleteFile(filename, options = {}) {
    const { strict = false, purgeVersions = strict } = options;

    // Reinitialize credentials in case they were set after module load
    this._initializeCredentials();
    
    if (!filename) {
      if (strict) {
        throw new Error('Missing B2 filename for deletion');
      }
      return false;
    }

    if (!this.enabled || !this.s3Client) {
      if (strict) {
        throw new Error('B2 service is not configured');
      }
      return false;
    }
    
    try {
      if (purgeVersions) {
        const result = await this._deleteAllVersionsForKey(filename, { strict });
        console.log(`✓ Hard-deleted from B2 (all versions): ${filename} (${result.deleted} version entries)`);
        return true;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename
      });
      
      await this.s3Client.send(command);
      console.log(`✓ Deleted from B2: ${filename}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Could not delete from B2: ${error.message}`);
      if (strict) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Extract B2 object key from fileId or URL.
   * Supports direct keys and URLs like:
   * - https://f000.backblazeb2.com/file/<bucket>/<key>
   * - https://cdn.example.com/<key>
   */
  extractFileKey(reference) {
    if (!reference || typeof reference !== 'string') return null;

    const trimmed = reference.trim();
    if (!trimmed) return null;

    // Already a key (not URL)
    if (!/^https?:\/\//i.test(trimmed)) {
      return trimmed.replace(/^\/+/, '');
    }

    try {
      const parsed = new URL(trimmed);
      const path = parsed.pathname.replace(/^\/+/, '');

      // B2 raw file URL shape: file/<bucket>/<key>
      const b2Prefix = `file/${this.bucketName}/`;
      if (path.startsWith(b2Prefix)) {
        return path.slice(b2Prefix.length);
      }

      // CDN path: assume whole path is the key.
      return path || null;
    } catch {
      return null;
    }
  }

  /**
   * Delete using either direct B2 key or URL.
   */
  async deleteByReference(reference, options = {}) {
    const { strict = false } = options;
    const key = this.extractFileKey(reference);
    if (!key) {
      if (strict && reference) {
        throw new Error(`Invalid B2 reference for deletion: ${String(reference)}`);
      }
      return false;
    }

    return this.deleteFile(key, options);
  }

  /**
   * Delete all objects under a given key prefix (for example hls/<courseId>/).
   */
  async deleteFolder(prefix, options = {}) {
    const { strict = false, purgeVersions = strict } = options;
    this._initializeCredentials();
    if (!prefix) {
      if (strict) {
        throw new Error('Missing B2 prefix for deletion');
      }
      return { deleted: 0 };
    }

    if (!this.enabled || !this.s3Client) {
      if (strict) {
        throw new Error('B2 service is not configured');
      }
      return { deleted: 0 };
    }

    const normalizedPrefix = String(prefix).replace(/^\/+/, '');
    let continuationToken = undefined;
    let totalDeleted = 0;

    try {
      if (purgeVersions) {
        const versionDeleteResult = await this._deleteAllVersionsByPrefix(normalizedPrefix, { strict });
        totalDeleted += versionDeleteResult.deleted;
      }

      do {
        const listCmd = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: normalizedPrefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000
        });

        const listed = await this.s3Client.send(listCmd);
        const contents = listed?.Contents || [];

        if (contents.length > 0) {
          const deleteCmd = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: contents
                .map((item) => item?.Key)
                .filter(Boolean)
                .map((Key) => ({ Key })),
              Quiet: true
            }
          });

          await this.s3Client.send(deleteCmd);
          totalDeleted += contents.length;
        }

        continuationToken = listed?.IsTruncated ? listed?.NextContinuationToken : undefined;
      } while (continuationToken);

      if (totalDeleted > 0) {
        console.log(`✓ Deleted ${totalDeleted} objects from B2 prefix: ${normalizedPrefix}`);
      }

      return { deleted: totalDeleted };
    } catch (error) {
      console.warn(`⚠️  Could not delete B2 prefix ${normalizedPrefix}: ${error.message}`);
      if (strict) {
        throw error;
      }
      return { deleted: totalDeleted, error: error.message };
    }
  }

  /**
   * Get URL for a file in B2 (for existing files)
   * Useful for migration and redirects
   */
  getFileUrl(filename) {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${filename}`;
    }
    return `https://${this.endpoint}/${this.bucketName}/${filename}`;
  }

  /**
   * Get B2 raw URL for a file
   */
  getB2Url(filename) {
    return `https://${this.endpoint}/${this.bucketName}/${filename}`;
  }

  /**
   * Check if B2 service is enabled and ready
   */
  isEnabled() {
    this._initializeCredentials();
    return this.enabled;
  }

  /**
   * Upload video file with automatic path
   */
  async uploadVideo(fileBuffer, courseId, filename = null) {
    const timestamp = Date.now();
    const baseFilename = filename || 'video.mp4';
    const b2Filename = `videos/${courseId}-${timestamp}-${baseFilename}`;
    return this.uploadFile(fileBuffer, b2Filename, 'video/mp4');
  }

  /**
   * Upload instructor image
   */
  async uploadInstructorImage(fileBuffer, courseId) {
    const timestamp = Date.now();
    const filename = `instructor-images/${courseId}-${timestamp}.jpg`;
    return this.uploadFile(fileBuffer, filename, 'image/jpeg');
  }

  /**
   * Upload HLS segment
   */
  async uploadHLSSegment(fileBuffer, courseId, segmentName) {
    const filename = `hls/${courseId}/${segmentName}`;
    return this.uploadFile(fileBuffer, filename, 'video/mp2t');
  }

  /**
   * Upload HLS playlist
   */
  async uploadHLSPlaylist(fileBuffer, courseId, playlistName) {
    const filename = `hls/${courseId}/${playlistName}`;
    const mimeType = playlistName.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'text/plain';
    return this.uploadFile(fileBuffer, filename, mimeType);
  }

  /**
   * Upload reel video file (manual upload or edited)
   * Unified storage path for all reels
   */
  async uploadReelVideo(fileBuffer, reelId, filename = null) {
    const timestamp = Date.now();
    const baseFilename = filename || 'video.mp4';
    const b2Filename = `reels/${reelId}-${timestamp}-${baseFilename}`;
    return this.uploadFileWithCache(fileBuffer, b2Filename, 'video/mp4');
  }

  /**
   * Upload reel thumbnail image
   * Unified with all thumbnails
   */
  async uploadReelThumbnail(fileBuffer, reelId) {
    const timestamp = Date.now();
    const filename = `thumbnails/${reelId}-${timestamp}.jpg`;
    return this.uploadFile(fileBuffer, filename, 'image/jpeg');
  }

  /**
   * Upload file with aggressive caching for CDN
   * (reels, hls segments, static assets)
   */
  async uploadFileWithCache(fileBuffer, filename, mimeType = 'application/octet-stream') {
    this._initializeCredentials();
    
    if (!this.enabled || !this.s3Client) {
      throw new Error('B2 service not configured');
    }

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      console.error(`[B2 VALIDATION ERROR] Empty buffer for ${filename}`);
      throw new Error(`Cannot upload empty file: ${filename}`);
    }

    try {
      console.log(`[B2 UPLOAD] ${filename} - Size: ${(fileBuffer.length / 1024).toFixed(2)}KB - Cacheable`);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimeType,
        // Cache-Control for Cloudflare + CDN (1 year for immutable content)
        CacheControl: 'public, max-age=31536000, immutable'
      });

      await this.s3Client.send(command);
      console.log(`✓ Uploaded to B2 (cacheable): ${filename}`);

      let cdnUrl;
      if (this.cdnUrl) {
        cdnUrl = `${this.cdnUrl}/${filename}`;
      } else {
        cdnUrl = `https://${this.endpoint}/${this.bucketName}/${filename}`;
      }

      return {
        fileId: filename,
        filename: filename,
        contentType: mimeType,
        size: fileBuffer.length,
        url: cdnUrl,
        b2Url: `https://${this.endpoint}/${this.bucketName}/${filename}`
      };
    } catch (error) {
      console.error('B2 upload error:', error.message);
      throw new Error(`Failed to upload to B2: ${error.message}`);
    }
  }
}

export default new B2Service();
