import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import gridFSService from './gridfsService.js';

/**
 * Video Processing Service
 * Handles video cutting for reels using FFmpeg
 */
class VideoProcessingService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'streamclass-video-processing');
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }

  /**
   * Initialize temp directory
   */
  async init() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('✓ Video processing service initialized');
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Get video metadata using ffprobe
   * @param {string} filePath - Path to video file
   * @returns {Promise<Object>} - Video metadata
   */
  async getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const ffprobe = spawn(this.ffprobePath, args);
      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const metadata = JSON.parse(output);
          const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
          
          resolve({
            duration: parseFloat(metadata.format?.duration || 0),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            codec: videoStream?.codec_name || 'unknown',
            bitrate: parseInt(metadata.format?.bit_rate || 0),
            size: parseInt(metadata.format?.size || 0)
          });
        } catch (parseError) {
          reject(parseError);
        }
      });

      ffprobe.on('error', reject);
    });
  }

  /**
   * Cut a video segment for a reel
   * @param {Buffer} sourceBuffer - Source video buffer
   * @param {string} sourceFilename - Original filename
   * @param {Object} options - Cut options
   * @returns {Promise<Buffer>} - Cut video buffer
   */
  async cutVideoSegment(sourceBuffer, sourceFilename, options = {}) {
    const {
      startTime = 0,
      duration = 15, // 15, 30, or 60 seconds
      outputFormat = 'mp4'
    } = options;

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(this.tempDir, `input_${uniqueId}${path.extname(sourceFilename)}`);
    const outputPath = path.join(this.tempDir, `output_${uniqueId}.${outputFormat}`);

    try {
      // Write source buffer to temp file
      await fs.writeFile(inputPath, sourceBuffer);

      // Get video metadata to validate
      const metadata = await this.getVideoMetadata(inputPath);
      
      // Validate start time and duration
      const maxStartTime = Math.max(0, metadata.duration - duration);
      const actualStartTime = Math.min(startTime, maxStartTime);
      const actualDuration = Math.min(duration, metadata.duration - actualStartTime);

      // Cut video using ffmpeg
      await this.runFFmpeg([
        '-i', inputPath,
        '-ss', actualStartTime.toString(),
        '-t', actualDuration.toString(),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart', // Optimize for web streaming
        '-y', // Overwrite output
        outputPath
      ]);

      // Read output file
      const outputBuffer = await fs.readFile(outputPath);

      // Cleanup temp files
      await this.cleanup([inputPath, outputPath]);

      return {
        buffer: outputBuffer,
        metadata: {
          duration: actualDuration,
          startTime: actualStartTime,
          endTime: actualStartTime + actualDuration,
          format: outputFormat
        }
      };
    } catch (error) {
      // Cleanup on error
      await this.cleanup([inputPath, outputPath]);
      throw error;
    }
  }

  /**
   * Generate thumbnail from video
   * @param {Buffer} videoBuffer - Video buffer
   * @param {string} filename - Original filename
   * @param {number} timestamp - Timestamp in seconds
   * @returns {Promise<Buffer>} - Thumbnail buffer
   */
  async generateThumbnail(videoBuffer, filename, timestamp = 0) {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(this.tempDir, `input_${uniqueId}${path.extname(filename)}`);
    const outputPath = path.join(this.tempDir, `thumb_${uniqueId}.jpg`);

    try {
      // Write video to temp file
      await fs.writeFile(inputPath, videoBuffer);

      // Get video duration
      const metadata = await this.getVideoMetadata(inputPath);
      const actualTimestamp = Math.min(timestamp, metadata.duration - 1);

      // Extract frame using ffmpeg
      await this.runFFmpeg([
        '-i', inputPath,
        '-ss', actualTimestamp.toString(),
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=640:-1', // Scale to 640px width, maintain aspect
        '-y',
        outputPath
      ]);

      // Read thumbnail
      const thumbnailBuffer = await fs.readFile(outputPath);

      // Cleanup
      await this.cleanup([inputPath, outputPath]);

      return thumbnailBuffer;
    } catch (error) {
      await this.cleanup([inputPath, outputPath]);
      throw error;
    }
  }

  /**
   * Create multiple reels from a video
   * @param {Buffer} sourceBuffer - Source video buffer
   * @param {string} sourceFilename - Original filename
   * @param {Array<Object>} segments - Array of segment options
   * @returns {Promise<Array>} - Array of cut results
   */
  async createMultipleReels(sourceBuffer, sourceFilename, segments) {
    const results = [];
    
    for (const segment of segments) {
      try {
        const result = await this.cutVideoSegment(sourceBuffer, sourceFilename, segment);
        results.push({
          success: true,
          ...result,
          originalSegment: segment
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          originalSegment: segment
        });
      }
    }
    
    return results;
  }

  /**
   * Auto-generate reel segments based on video duration
   * @param {number} videoDuration - Total video duration in seconds
   * @param {number} reelDuration - Desired reel duration (15, 30, 60)
   * @param {number} maxReels - Maximum number of reels to generate
   * @returns {Array<Object>} - Array of segment options
   */
  generateAutoSegments(videoDuration, reelDuration = 15, maxReels = 5) {
    const segments = [];
    const interval = videoDuration / (maxReels + 1);
    
    for (let i = 1; i <= maxReels; i++) {
      const startTime = Math.floor(interval * i);
      
      // Make sure we have enough video left
      if (startTime + reelDuration <= videoDuration) {
        segments.push({
          startTime,
          duration: reelDuration,
          index: i
        });
      }
    }
    
    return segments;
  }

  /**
   * Run FFmpeg command
   * @param {Array<string>} args - FFmpeg arguments
   * @returns {Promise<void>}
   */
  runFFmpeg(args) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegPath, args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg exited with code ${code}: ${errorOutput}`));
        } else {
          resolve();
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }

  /**
   * Cleanup temp files
   * @param {Array<string>} files - File paths to delete
   */
  async cleanup(files) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore errors (file might not exist)
      }
    }
  }

  /**
   * Check if FFmpeg is available
   * @returns {Promise<boolean>}
   */
  async checkFFmpegAvailable() {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegPath, ['-version']);
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
      
      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }
}

// Singleton instance
const videoProcessingService = new VideoProcessingService();

export default videoProcessingService;
