/**
 * HLS Transcoding Service
 * Converts uploaded MP4 videos to HLS (HTTP Live Streaming) format
 * with multiple quality variants for adaptive bitrate streaming.
 * 
 * Output structure:
 *   hls_output/<courseId>/
 *     master.m3u8         ← Master playlist (points to variants)
 *     480p/
 *       stream.m3u8       ← Variant playlist
 *       segment000.ts     ← Video segments
 *       segment001.ts
 *     720p/
 *       stream.m3u8
 *       segment000.ts
 *     1080p/
 *       stream.m3u8
 *       segment000.ts
 */
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import b2Service from './b2Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ffmpeg.setFfmpegPath(ffmpegStatic);

// HLS output directory
const HLS_OUTPUT_DIR = path.join(__dirname, '..', '..', 'hls_output');

// Quality variants (from lowest to highest for adaptive bitrate streaming)
// ⚠️ OPTIMIZED: Reduced from 5 to 3 variants for faster transcoding
// Removed 1440p and 4K due to slow FFmpeg encoding on 10+ min videos
const VARIANTS = [
    { name: '480p', width: 854, height: 480, videoBitrate: '800k', audioBitrate: '96k', bandwidth: 1000000 },  // Fallback/mobile
    { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k', bandwidth: 3000000 }, // Default/main
    { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k', bandwidth: 6000000 }, // HD (only if source supports)
];

/**
 * Ensure the HLS output directory exists for a given course
 */
function ensureCourseDir(courseId) {
    const courseDir = path.join(HLS_OUTPUT_DIR, courseId);
    if (!fs.existsSync(courseDir)) {
        fs.mkdirSync(courseDir, { recursive: true });
    }
    return courseDir;
}

/**
 * Transcode a single quality variant
 */
function transcodeVariant(inputPath, courseDir, variant) {
    return new Promise((resolve, reject) => {
        const variantDir = path.join(courseDir, variant.name);
        if (!fs.existsSync(variantDir)) fs.mkdirSync(variantDir, { recursive: true });

        const outputPlaylist = path.join(variantDir, 'stream.m3u8');

        console.log(`  [HLS] Transcoding ${variant.name} (${variant.videoBitrate})...`);
        const startTime = Date.now();

        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .videoBitrate(variant.videoBitrate)
            .audioBitrate(variant.audioBitrate)
            .outputOptions([
                '-preset ultrafast',              // ⚠️ Changed from "fast" to "ultrafast" for speed
                '-profile:v main',                // Reduced from "high" for compatibility
                '-level 4.1',                     // Reduced from 5.1
                `-vf`, `scale=${variant.width}:${variant.height}:force_original_aspect_ratio=decrease,pad=${variant.width}:${variant.height}:(ow-iw)/2:(oh-ih)/2`,
                '-hls_time 6',                    // Increased segment size (6s instead of 4s) = fewer segments = faster
                '-hls_list_size 0',               // Keep all segments in playlist
                '-hls_segment_filename', path.join(variantDir, 'segment%03d.ts'),
                '-hls_playlist_type vod',         // Video on Demand
                '-movflags +faststart',
                '-sc_threshold 0',
                '-g 60',                          // Increased GOP size (fewer keyframes = smaller files)
                '-keyint_min 60',
            ])
            .output(outputPlaylist)
            .on('progress', (p) => {
                if (p.percent) {
                    process.stdout.write(`\r  [HLS] ${variant.name}: ${p.percent.toFixed(1)}% | Frame: ${p.currentFps || '?'} fps | Time: ${p.currentTime || '?'}`);
                }
            })
            .on('end', () => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`\n  [HLS] ✅ ${variant.name} DONE (${elapsed}s)`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`\n  [HLS] ✗ ${variant.name} failed:`, err.message);
                reject(err);
            })
            .run();
    });
}

/**
 * Generate the master playlist that references all variants
 */
function generateMasterPlaylist(courseDir, variants) {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const v of variants) {
        const variantPlaylistPath = path.join(courseDir, v.name, 'stream.m3u8');
        if (fs.existsSync(variantPlaylistPath)) {
            playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height},NAME="${v.name}"\n`;
            playlist += `${v.name}/stream.m3u8\n\n`;
        }
    }

    const masterPath = path.join(courseDir, 'master.m3u8');
    fs.writeFileSync(masterPath, playlist);
    console.log(`  [HLS] ✓ Master playlist written`);
    return masterPath;
}

/**
 * Probe the source video resolution using ffprobe
 */
function probeResolution(inputPath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err || !metadata) {
                console.warn('  [HLS] Could not probe video resolution, using all variants');
                resolve({ width: 9999, height: 9999 }); // Fallback: try all
            } else {
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                const w = videoStream?.width || 9999;
                const h = videoStream?.height || 9999;
                console.log(`  [HLS] Source resolution: ${w}x${h}`);
                resolve({ width: w, height: h });
            }
        });
    });
}

/**
 * Main function: Transcode an MP4 file to HLS with all quality variants
 * @param {string} inputPath - Path to the source MP4 file
 * @param {string} courseId - The course ID for organizing output
 * @returns {Promise<{hlsUrl: string, variants: string[]}>}
 */
async function transcodeToHLS(inputPath, courseId) {
    console.log(`\n🎬 [HLS] Starting transcode for course: ${courseId}`);
    console.log(`  [HLS] Input: ${inputPath}`);

    const courseDir = ensureCourseDir(courseId);

    // Probe source resolution to skip variants that would upscale
    const sourceRes = await probeResolution(inputPath);

    // Filter variants: only transcode if variant height <= source height
    // Always include the lowest variant (480p) for instant start
    const applicableVariants = VARIANTS.filter((v, i) =>
        i === 0 || v.height <= sourceRes.height
    );

    console.log(`  [HLS] Source: ${sourceRes.width}x${sourceRes.height} → will generate: ${applicableVariants.map(v => v.name).join(', ')}`);

    // Transcode each variant sequentially (to avoid overwhelming CPU)
    const successVariants = [];
    for (const variant of applicableVariants) {
        try {
            await transcodeVariant(inputPath, courseDir, variant);
            successVariants.push(variant);
        } catch (err) {
            console.error(`  [HLS] Skipping ${variant.name} due to error:`, err.message);
        }
    }

    if (successVariants.length === 0) {
        throw new Error('All HLS variants failed to transcode');
    }

    // Generate master playlist
    generateMasterPlaylist(courseDir, successVariants);

    const hlsUrl = `/api/hls/${courseId}/master.m3u8`;
    console.log(`🎬 [HLS] Transcode complete! ${successVariants.length} variants ready`);
    console.log(`  [HLS] URL: ${hlsUrl}\n`);

    return {
        hlsUrl,
        variants: successVariants.map(v => v.name),
    };
}

/**
 * Transcode from a buffer (e.g. from GridFS download)
 */
async function transcodeBufferToHLS(buffer, courseId) {
    const tmpInput = path.join(HLS_OUTPUT_DIR, `_tmp_${courseId}_${Date.now()}.mp4`);
    if (!fs.existsSync(HLS_OUTPUT_DIR)) fs.mkdirSync(HLS_OUTPUT_DIR, { recursive: true });

    try {
        fs.writeFileSync(tmpInput, buffer);
        return await transcodeToHLS(tmpInput, courseId);
    } finally {
        try { fs.unlinkSync(tmpInput); } catch { }
    }
}

/**
 * Check if HLS output already exists for a course
 */
function isHLSReady(courseId) {
    const masterPath = path.join(HLS_OUTPUT_DIR, courseId, 'master.m3u8');
    return fs.existsSync(masterPath);
}

/**
 * Get the filesystem path for an HLS file
 */
function getHLSFilePath(courseId, ...segments) {
    return path.join(HLS_OUTPUT_DIR, courseId, ...segments);
}

/**
 * Upload HLS segments to Backblaze B2 after transcoding
 * @param {string} courseId - Course ID
 * @returns {Object} { masterUrl, variants: [{name, url}] }
 */
async function uploadHLSToB2(courseId) {
    const courseDir = path.join(HLS_OUTPUT_DIR, courseId);
    if (!fs.existsSync(courseDir)) {
        throw new Error(`HLS directory not found for course ${courseId}`);
    }

    console.log(`[HLS→B2] Uploading HLS segments to B2 for course ${courseId}...`);
    
    // Check if B2 is enabled
    const b2Enabled = b2Service.isEnabled();
    
    if (!b2Enabled) {
        // B2 not configured - use fallback local HLS URLs
        console.log(`[HLS→B2] ⚠️  B2 not configured, using fallback local HLS URLs`);
        
        const masterUrl = `/api/hls/${courseId}/master.m3u8`;
        const variants = [
            { name: '480p', url: `/api/hls/${courseId}/480p/stream.m3u8` },
            { name: '720p', url: `/api/hls/${courseId}/720p/stream.m3u8` },
            { name: '1080p', url: `/api/hls/${courseId}/1080p/stream.m3u8` },
        ];
        
        const result = {
            masterUrl,
            variants,
            uploadedFiles: 0,
            b2Folder: null,
            fallback: true
        };
        
        console.log(`[HLS→B2] ✓ Fallback HLS ready: ${masterUrl}`);
        return result;
    }
    
    const uploadedFiles = {};
    const variants = [];
    let masterUrl = null;

    try {
        // Walk through all HLS files and upload to B2
        const walkDir = async (dir, basePath = '') => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Recurse into subdirectories (480p, 720p, etc.)
                    await walkDir(fullPath, path.join(basePath, file));
                } else if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
                    // Upload video segments and playlists
                    const fileBuffer = fs.readFileSync(fullPath);
                    const b2Path = `hls/${courseId}/${basePath}${basePath ? '/' : ''}${file}`;
                    const mimeType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
                    
                    const result = await b2Service.uploadFile(fileBuffer, b2Path, mimeType);
                    uploadedFiles[b2Path] = result.url;
                    
                    // Track master.m3u8 and variant playlists
                    if (file === 'master.m3u8') {
                        masterUrl = result.url;
                    } else if (file === 'stream.m3u8') {
                        const variantName = basePath.split('/')[0]; // e.g., "720p"
                        variants.push({ name: variantName, url: result.url });
                    }
                    
                    console.log(`  ✓ Uploaded: ${b2Path}`);
                }
            }
        };

        await walkDir(courseDir);

        if (!masterUrl) {
            throw new Error('Master M3U8 not found in HLS output');
        }

        const result = {
            masterUrl,
            variants,
            uploadedFiles: Object.keys(uploadedFiles).length,
            b2Folder: `hls/${courseId}/`
        };

        console.log(`[HLS→B2] ✓ Upload complete! Uploaded ${Object.keys(uploadedFiles).length} files`);
        return result;

    } catch (error) {
        console.error(`[HLS→B2] Upload failed: ${error.message}`);
        throw error;
    }
}

/**
 * Delete HLS output for a course
 */
function deleteHLSOutput(courseId) {
    const courseDir = path.join(HLS_OUTPUT_DIR, courseId);
    if (fs.existsSync(courseDir)) {
        fs.rmSync(courseDir, { recursive: true, force: true });
        console.log(`  [HLS] Deleted HLS output for course ${courseId}`);
    }
}

export default {
    transcodeToHLS,
    transcodeBufferToHLS,
    uploadHLSToB2,
    isHLSReady,
    getHLSFilePath,
    deleteHLSOutput,
    HLS_OUTPUT_DIR,
    VARIANTS,
};
