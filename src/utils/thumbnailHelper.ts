/**
 * Get thumbnail URL - prefers MongoDB image, falls back to external URL
 */
import { apiService } from './api';

export function getThumbnailUrl(thumbnail: string, imageId?: string): string {
  // If we have a MongoDB image ID, use it
  if (imageId) {
    return apiService.media.getThumbnailUrl(imageId);
  }
  
  // Otherwise fall back to the thumbnail URL (external or blob)
  return thumbnail;
}

export function getReelThumbnailUrl(thumbnail: string, imageId?: string): string {
  // If we have a MongoDB image ID, use it
  if (imageId) {
    return apiService.media.getReelThumbnailUrl(imageId);
  }
  
  // Otherwise fall back to the thumbnail URL (external or blob)
  return thumbnail;
}
