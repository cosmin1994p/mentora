import express from 'express';
import gridFSService from '../services/gridfsService.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /api/files/:id - Serve a file from GridFS
 * Used for images and videos stored in MongoDB
 */
router.get('/:id', async (req, res) => {
    try {
        const fileId = req.params.id;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: 'Invalid file ID' });
        }

        // Use the enhanced streamToResponse helper which handles range requests (seeking)
        await gridFSService.streamToResponse(fileId, res, {
            range: req.headers.range
        });

    } catch (error) {
        console.error('Get file error:', error);

        if (error.message === 'File not found') {
            return res.status(404).json({ error: 'File not found' });
        }

        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to get file' });
        }
    }
});

/**
 * GET /api/files/:id/info - Get file metadata without downloading
 */
router.get('/:id/info', async (req, res) => {
    try {
        const fileId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: 'Invalid file ID' });
        }

        const bucket = getGridFSBucket();
        if (!bucket) {
            return res.status(500).json({ error: 'GridFS not initialized' });
        }

        const objectId = new mongoose.Types.ObjectId(fileId);
        const files = await bucket.find({ _id: objectId }).toArray();

        if (files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = files[0];

        res.json({
            success: true,
            file: {
                id: file._id.toString(),
                filename: file.filename,
                contentType: file.contentType,
                size: file.length,
                uploadDate: file.uploadDate,
                metadata: file.metadata
            }
        });

    } catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

export default router;
