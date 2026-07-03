/**
 * HLS Routes — serves HLS playlists and video segments
 * 
 * GET /api/hls/:courseId/master.m3u8     → Master playlist
 * GET /api/hls/:courseId/:variant/stream.m3u8 → Variant playlist
 * GET /api/hls/:courseId/:variant/:segment    → .ts segment
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import hlsService from '../services/hlsService.js';

const router = express.Router();

/**
 * Serve master playlist
 */
router.get('/:courseId/master.m3u8', (req, res) => {
    const filePath = hlsService.getHLSFilePath(req.params.courseId, 'master.m3u8');

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'HLS stream not found for this course' });
    }

    res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
    });
    const stream = fs.createReadStream(filePath);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
});

/**
 * Serve variant playlist
 */
router.get('/:courseId/:variant/stream.m3u8', (req, res) => {
    const filePath = hlsService.getHLSFilePath(req.params.courseId, req.params.variant, 'stream.m3u8');

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Variant playlist not found' });
    }

    res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
    });
    const stream = fs.createReadStream(filePath);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
});

/**
 * Serve .ts segments (with aggressive caching — segments never change)
 */
router.get('/:courseId/:variant/:segment', (req, res) => {
    const filePath = hlsService.getHLSFilePath(req.params.courseId, req.params.variant, req.params.segment);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Segment not found' });
    }

    const stat = fs.statSync(filePath);

    res.set({
        'Content-Type': 'video/mp2t',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=31536000, immutable', // Segments never change
        'Access-Control-Allow-Origin': '*',
    });
    const stream = fs.createReadStream(filePath);
    res.on('close', () => stream.destroy());
    stream.pipe(res);
});

export default router;
