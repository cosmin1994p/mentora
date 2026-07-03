/**
 * Custom Hook for Lazy Loading Images with Blob Optimization
 */

import { useEffect, useRef, useState } from 'react';
import {
  loadImageBlob,
  createBlobUrl,
  getCachedMedia,
  releaseBlobUrl
} from '../utils/mediaOptimization';

interface UseLazyImageProps {
  src: string;
  cacheId?: string;
}

export function useLazyImage({ src, cacheId }: UseLazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const blobUrlRef = useRef<string>('');
  const loadedRef = useRef(false);

  useEffect(() => {
    // Prevent double-loading or invalid src
    if (loadedRef.current || !src || typeof src !== 'string') return;
    loadedRef.current = true;

    // Fast path: for URLs that have proper HTTP caching (our backend with ETag/Cache-Control,
    // or external CDNs like Unsplash), skip the blob/IndexedDB overhead and use native browser caching.
    // This avoids: fetch() → arrayBuffer → blob → IndexedDB write → createObjectURL
    // and instead lets the browser handle caching natively (much faster).
    const isHttpUrl = src.startsWith('http://') || src.startsWith('https://');
    if (isHttpUrl) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setIsLoading(true);

        // Try to get from cache first (only for non-HTTP sources like data: URIs)
        const cached = await getCachedMedia(cacheId || src);
        if (cached) {
          const url = createBlobUrl(cached);
          blobUrlRef.current = url;
          setImageSrc(url);
          setIsLoading(false);
          return;
        }

        // Load and cache
        const blob = await loadImageBlob(src, cacheId);
        const url = createBlobUrl(blob);
        blobUrlRef.current = url;
        setImageSrc(url);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load image'));
        // Fallback to original URL
        setImageSrc(src);
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      if (blobUrlRef.current) {
        releaseBlobUrl(blobUrlRef.current);
      }
    };
  }, [src, cacheId]);

  return {
    imageSrc,
    isLoading,
    error
  };
}

/**
 * Hook for Progressive Image Loading (blur -> sharp)
 */
interface UseProgressiveImageProps {
  src: string;
  thumbnailSrc?: string;
  cacheId?: string;
}

export function useProgressiveImage({
  src,
  thumbnailSrc,
  cacheId
}: UseProgressiveImageProps) {
  const [thumbnailSrc_state, setThumbnailSrc] = useState<string>(
    thumbnailSrc || ''
  );
  const [fullSrc, setFullSrc] = useState<string>('');
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        // Load thumbnail first if provided and valid
        if (thumbnailSrc && typeof thumbnailSrc === 'string' && !thumbnailSrc_state) {
          const thumbBlob = await loadImageBlob(thumbnailSrc, cacheId + '_thumb');
          const thumbUrl = createBlobUrl(thumbBlob);
          blobUrlsRef.current.push(thumbUrl);
          setThumbnailSrc(thumbUrl);
        }

        // Load full image
        // Load full image if valid
        if (src && typeof src === 'string') {
          setIsLoadingFull(true);
          const fullBlob = await loadImageBlob(src, cacheId || src);
          const fullUrl = createBlobUrl(fullBlob);
          blobUrlsRef.current.push(fullUrl);
          setFullSrc(fullUrl);
          setIsLoadingFull(false);
        }
      } catch (error) {
        console.error('Failed to load images:', error);
        // Fallback to original URLs
        if (thumbnailSrc) setThumbnailSrc(thumbnailSrc);
        setFullSrc(src);
        setIsLoadingFull(false);
      }
    };

    loadImages();

    return () => {
      blobUrlsRef.current.forEach((url) => releaseBlobUrl(url));
    };
  }, [src, thumbnailSrc, cacheId]);

  return {
    thumbnailSrc: thumbnailSrc_state,
    fullSrc,
    isLoadingFull
  };
}

/**
 * Hook for Video Blob Loading with Progress
 */
interface UseVideoLoaderProps {
  src: string;
  cacheId?: string;
  autoLoad?: boolean;
}

export function useVideoLoader({
  src,
  cacheId,
  autoLoad = false
}: UseVideoLoaderProps) {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const blobUrlRef = useRef<string>('');

  const loadVideo = async () => {
    try {
      setIsLoading(true);
      setProgress(0);

      if (!src || typeof src !== 'string') {
        throw new Error('Invalid video source');
      }

      const { loadVideoBlob } = await import('../utils/mediaOptimization');
      const blob = await loadVideoBlob(
        src,
        cacheId,
        (p) => setProgress(p)
      );
      const url = createBlobUrl(blob);
      blobUrlRef.current = url;
      setVideoSrc(url);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load video'));
      // Fallback to original URL
      setVideoSrc(src);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      loadVideo();
    }

    return () => {
      if (blobUrlRef.current) {
        releaseBlobUrl(blobUrlRef.current);
      }
    };
  }, [src, cacheId, autoLoad]);

  return {
    videoSrc,
    isLoading,
    progress,
    error,
    loadVideo
  };
}
