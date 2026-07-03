/**
 * Media Optimization Utility
 * Handles lazy loading, blob streaming, caching, and progressive loading
 * for images and videos from MongoDB GridFS
 */

// IndexedDB Cache for media
const DB_NAME = 'StreamclassMedia';
const DB_VERSION = 1;
const STORE_NAME = 'media_cache';

interface CachedMedia {
  id: string;
  type: 'image' | 'video';
  blob: Blob;
  timestamp: number;
  ttl: number; // Time to live in hours
}

// Initialize IndexedDB
async function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Cache media blob in IndexedDB
 */
export async function cacheMedia(
  id: string,
  blob: Blob,
  type: 'image' | 'video',
  ttlHours: number = 7 * 24 // Default 7 days
): Promise<void> {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cachedMedia: CachedMedia = {
      id,
      type,
      blob,
      timestamp: Date.now(),
      ttl: ttlHours
    };

    store.put(cachedMedia);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to cache media:', error);
  }
}

/**
 * Retrieve cached media from IndexedDB
 */
export async function getCachedMedia(id: string): Promise<Blob | null> {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const cached = request.result as CachedMedia | undefined;

        if (cached) {
          // Check if cache is still valid
          const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
          if (ageHours < cached.ttl) {
            resolve(cached.blob);
            return;
          } else {
            // Cache expired, delete it
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => resolve(null);
            deleteRequest.onerror = () => resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to retrieve cached media:', error);
    return null;
  }
}

/**
 * Clear old cache entries
 */
export async function clearOldCache(): Promise<void> {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedMedia[];
        items.forEach((item) => {
          const ageHours = (Date.now() - item.timestamp) / (1000 * 60 * 60);
          if (ageHours > item.ttl) {
            store.delete(item.id);
          }
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to clear old cache:', error);
  }
}

/**
 * Load image as blob with caching
 */
export async function loadImageBlob(
  imageUrl: string,
  cacheId?: string
): Promise<Blob> {
  const id = cacheId || imageUrl;

  // Try to get from cache first
  const cached = await getCachedMedia(id);
  if (cached) {
    return cached;
  }

  // Fetch from URL
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`);
  }

  const blob = await response.blob();

  // Cache for later use
  await cacheMedia(id, blob, 'image', 7 * 24); // 7 days

  return blob;
}

/**
 * Load video as blob with progress tracking
 */
export async function loadVideoBlob(
  videoUrl: string,
  cacheId?: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const id = cacheId || videoUrl;

  // Try to get from cache first
  const cached = await getCachedMedia(id);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

  // Fetch with progress tracking
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to load video: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = parseInt(contentLength || '0', 10);

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to read response body');
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (total && onProgress) {
        const progress = Math.round((loaded / total) * 100);
        onProgress(progress);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Determine content type from URL or headers
  const contentType = response.headers.get('content-type') || 'video/mp4';
  const blob = new Blob(chunks as BlobPart[], { type: contentType });

  // Cache video (keep for 14 days)
  await cacheMedia(id, blob, 'video', 14 * 24);

  return blob;
}

/**
 * Create object URL from blob (auto-cleanup)
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Release object URL to free memory
 */
export function releaseBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Lazy load image with intersection observer
 */
export function observeImage(
  element: HTMLImageElement,
  callback: () => void
): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(element);
        }
      });
    },
    { rootMargin: '50px' } // Start loading 50px before entering viewport
  );

  observer.observe(element);
  return observer;
}

/**
 * Progressive image loader with blur effect
 */
export async function loadImageProgressive(
  imageUrl: string,
  thumbnailUrl?: string
): Promise<{ thumbnail: string; full: string }> {
  const thumbnailBlob = thumbnailUrl
    ? await loadImageBlob(thumbnailUrl, imageUrl + '_thumb')
    : null;
  const fullBlob = await loadImageBlob(imageUrl, imageUrl + '_full');

  return {
    thumbnail: thumbnailBlob
      ? createBlobUrl(thumbnailBlob)
      : createBlobUrl(fullBlob),
    full: createBlobUrl(fullBlob)
  };
}

/**
 * Video streaming with range requests (for large files)
 */
export async function getVideoChunk(
  videoUrl: string,
  start: number,
  end: number
): Promise<Blob> {
  const response = await fetch(videoUrl, {
    headers: {
      Range: `bytes=${start}-${end}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video chunk: ${response.status}`);
  }

  return response.blob();
}

/**
 * Get media URL - either from cache or as blob URL
 */
export async function getMediaUrl(
  mediaUrl: string,
  type: 'image' | 'video',
  cacheId?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (type === 'image') {
      const blob = await loadImageBlob(mediaUrl, cacheId);
      return createBlobUrl(blob);
    } else {
      const blob = await loadVideoBlob(mediaUrl, cacheId, onProgress);
      return createBlobUrl(blob);
    }
  } catch (error) {
    console.error('Failed to get media URL:', error);
    // Fallback to original URL if blob loading fails
    return mediaUrl;
  }
}

/**
 * Pre-cache multiple media items
 */
export async function precacheMedia(
  mediaList: Array<{ url: string; id: string; type: 'image' | 'video' }>
): Promise<void> {
  const promises = mediaList.map(async ({ url, id, type }) => {
    try {
      if (type === 'image') {
        await loadImageBlob(url, id);
      } else {
        await loadVideoBlob(url, id);
      }
    } catch (error) {
      console.warn(`Failed to precache ${type} ${id}:`, error);
    }
  });

  await Promise.all(promises);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalItems: number;
  totalSize: number;
  items: Array<{ id: string; type: string; size: number; age: number }>;
}> {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedMedia[];
        let totalSize = 0;
        const itemStats = items.map((item) => {
          const size = item.blob.size;
          totalSize += size;
          const ageHours = (Date.now() - item.timestamp) / (1000 * 60 * 60);
          return {
            id: item.id,
            type: item.type,
            size,
            age: Math.round(ageHours)
          };
        });

        resolve({
          totalItems: items.length,
          totalSize,
          items: itemStats
        });
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return { totalItems: 0, totalSize: 0, items: [] };
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}
