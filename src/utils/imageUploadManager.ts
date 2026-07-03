/**
 * Image Upload Manager
 * Handles uploading images to MongoDB GridFS and generating blob URLs
 */

import { apiService } from './api';

interface UploadResult {
  success: boolean;
  imageId?: string;
  blobUrl?: string;
  error?: string;
}

export const imageUploadManager = {
  /**
   * Upload course thumbnail to MongoDB
   */
  async uploadCourseThumbnail(courseId: string, file: File): Promise<UploadResult> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Invalid file type. Please upload an image.' };
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { success: false, error: 'File too large. Max 5MB.' };
      }

      // Upload to server
      const response = await apiService.admin.uploadThumbnail(courseId, file);
      
      if (response.imageId) {
        // Get blob URL for the uploaded image
        const blobUrl = apiService.media.getThumbnailUrl(response.imageId);
        return { 
          success: true, 
          imageId: response.imageId,
          blobUrl 
        };
      }

      return { success: false, error: 'Upload returned no imageId' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  },

  /**
   * Upload reel thumbnail to MongoDB
   */
  async uploadReelThumbnail(reelId: string, file: File): Promise<UploadResult> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Invalid file type. Please upload an image.' };
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return { success: false, error: 'File too large. Max 5MB.' };
      }

      // Upload to server
      const response = await apiService.admin.uploadReelThumbnail(reelId, file);
      
      if (response.imageId) {
        // Get blob URL for the uploaded image
        const blobUrl = apiService.media.getReelThumbnailUrl(response.imageId);
        return { 
          success: true, 
          imageId: response.imageId,
          blobUrl 
        };
      }

      return { success: false, error: 'Upload returned no imageId' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  },

  async uploadReelVideo(reelId: string, file: File): Promise<UploadResult> {
    try {
      // Validate file
      if (!file.type.startsWith('video/')) {
        return { success: false, error: 'Invalid file type. Please upload a video.' };
      }

      // 500MB limit for videos
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: `File too large. Max ${maxSize / (1024 * 1024)}MB.` };
      }

      // Upload to server
      const response = await apiService.admin.uploadReelVideo(reelId, file);
      
      if (response.url) {
        return { 
          success: true, 
          blobUrl: response.url
        };
      }

      return { success: false, error: 'Upload returned no URL' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  },

  /**
   * Create local preview URL from File object
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  },

  /**
   * Revoke preview URL to free up memory
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  },

  /**
   * Get MongoDB thumbnail URL for display
   */
  getThumbnailUrl(imageId: string): string {
    return apiService.media.getThumbnailUrl(imageId);
  },

  /**
   * Get MongoDB reel thumbnail URL for display
   */
  getReelThumbnailUrl(imageId: string): string {
    return apiService.media.getReelThumbnailUrl(imageId);
  },
};

export default imageUploadManager;
