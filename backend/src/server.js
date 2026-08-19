import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reelRoutes from './routes/reelRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import hlsRoutes from './routes/hlsRoutes.js';
import upgradeRoutes from './routes/upgradeRoutes.js';

// Import middleware
import { errorHandler } from './middleware/auth.js';

// Import models to ensure admin exists
import User from './models/User.js';

// Import services
import gridFSService from './services/gridfsService.js';
import videoProcessingService from './services/videoProcessingService.js';

// Load environment variables from backend/.env first, then root .env.
// This keeps `npm start` working from backend/ while also supporting the
// repo-level .env used by docker-compose and the checked-in .env.example.
const __srcDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__srcDir, '..', '.env') });
dotenv.config({ path: path.resolve(__srcDir, '..', '..', '.env') });

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ML Server process reference
let mlServerProcess = null;

// Start ML Server automatically
const startMLServer = async () => {
    const mlServerPath = path.resolve(__dirname, '../../ml');
    const mlServerScript = path.join(mlServerPath, 'start_ml_server.py');

  console.log('🤖 Starting ML Recommendation Server...');
  console.log(`   Script path: ${mlServerScript}`);

  // Check if file exists
  const fs = await import('fs');
  if (!fs.existsSync(mlServerScript)) {
    console.error(`✗ ML Server script not found: ${mlServerScript}`);
    return;
  }

  try {
    // Use python3 on Mac/Linux, python on Windows
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    mlServerProcess = spawn(pythonCmd, [mlServerScript, '--port', '5001'], {
      cwd: mlServerPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: true
    });

    mlServerProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[ML Server] ${output}`);
      }
    });

    mlServerProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      // Filter out TensorFlow warnings
      if (output && !output.includes('TF_ENABLE_ONEDNN') && !output.includes('tensorflow') && !output.includes('oneDNN')) {
        console.error(`[ML Server] ${output}`);
      }
    });

    mlServerProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[ML Server] Process exited with code ${code}`);
      }
    });

    mlServerProcess.on('error', (err) => {
      console.error('[ML Server] Failed to start:', err.message);
    });

    // Wait a bit and check if server is responding
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const http = await import('http');
      const checkHealth = () => new Promise((resolve) => {
        const req = http.get('http://localhost:5001/api/health', (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => resolve(false));
      });

      const isHealthy = await checkHealth();
      if (isHealthy) {
        console.log('✓ ML Server started and responding on port 5001');
      } else {
        console.log('⚠ ML Server started but not yet responding - may need more time to initialize');
      }
    } catch (e) {
      console.log('✓ ML Server process started on port 5001');
    }
  } catch (error) {
    console.error('✗ Failed to start ML Server:', error.message);
  }
};

// Cleanup on exit
process.on('exit', () => {
  if (mlServerProcess) {
    mlServerProcess.kill();
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  if (mlServerProcess) {
    mlServerProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (mlServerProcess) {
    mlServerProcess.kill();
  }
  process.exit(0);
});

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/masterclass';

// Enable keep-alive for faster repeated connections (critical for media streaming)
app.set('keepAliveTimeout', 65000); // slightly higher than default 60s
app.set('headersTimeout', 66000);

// Parse FRONTEND_URL which may be comma-separated
const getAllowedOrigins = () => {
  const envOrigins = process.env.FRONTEND_URL?.split(',').map(url => url.trim()) || [];
  return [
    ...envOrigins,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002'
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
};

const corsOptions = {
  origin: true, // Allow ALL origins — any IP, any user
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Custom body parsing middleware that skips multipart/form-data
// Multer will handle multipart requests in individual routes
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // Log admin course creation attempts for debugging
  if (req.path.includes('/admin/courses') && req.method === 'POST') {
    console.log('[DEBUG] Course creation request:', {
      method: req.method,
      path: req.path,
      contentType: contentType.substring(0, 50)
    });
  }

  // Skip body parsing for multipart/form-data - multer handles these
  if (contentType.includes('multipart/form-data')) {
    return next();
  }

  // Parse JSON for non-multipart requests
  if (contentType.includes('application/json') || !contentType) {
    return express.json({ limit: '500mb' })(req, res, next);
  }

  // Parse URL-encoded for form submissions
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return express.urlencoded({ extended: true, limit: '500mb' })(req, res, next);
  }

  next();
});

// API Routes
import { sseHandler } from './services/sseService.js';
app.get('/api/events/stream', sseHandler);

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/hls', hlsRoutes);
app.use('/api/upgrade-requests', upgradeRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  let ffmpegStatus = 'unknown';
  try {
    ffmpegStatus = await videoProcessingService.checkFFmpegAvailable() ? 'available' : 'not installed';
  } catch (e) {
    ffmpegStatus = 'error';
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    gridfs: gridFSService.bucket ? 'initialized' : 'not initialized',
    ffmpeg: ffmpegStatus,
    database: mongoose.connection.db?.databaseName || 'unknown'
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB connected to:', mongoose.connection.db.databaseName);

    // Initialize GridFS after connection
    gridFSService.initialize();

    // Initialize video processing service
    await videoProcessingService.init();

    // Ensure admin user exists
    await User.ensureAdminExists();

    // Auto-precache: download ALL media from GridFS to local disk (background)
    // This ensures instant playback after server start
    (async () => {
      try {
        const fs = await import('fs');
        const fspath = await import('path');
        const { fileURLToPath: fu } = await import('url');
        const cacheDir = fspath.default.join(fspath.default.dirname(fu(import.meta.url)), '..', 'media_cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        const bucket = gridFSService.getGridFSBucket();
        if (!bucket) return;

        const files = await bucket.find({}).toArray();
        console.log(`\n📦 Pre-caching ${files.length} media files from Atlas → local disk...`);

        let cached = 0, skipped = 0;
        for (const file of files) {
          const fid = file._id.toString();
          const localPath = fspath.default.join(cacheDir, fid);
          const metaPath = localPath + '.meta';

          // Skip if already cached and correct size
          if (fs.existsSync(localPath) && fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              if (fs.statSync(localPath).size === meta.size) {
                skipped++;
                continue;
              }
            } catch { }
          }

          // Download from GridFS
          try {
            const downloadStream = bucket.openDownloadStream(file._id);
            const writeStream = fs.createWriteStream(localPath);
            await new Promise((resolve, reject) => {
              downloadStream.pipe(writeStream);
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
              downloadStream.on('error', reject);
            });

            fs.writeFileSync(metaPath, JSON.stringify({
              contentType: file.contentType,
              size: file.length,
              cachedAt: new Date().toISOString()
            }));

            cached++;
            console.log(`   [${cached}/${files.length - skipped}] ✓ ${file.filename || fid} (${(file.length / 1024).toFixed(0)}KB)`);
          } catch (e) {
            console.error(`   ✗ Failed to cache ${fid}:`, e.message);
          }
        }

        console.log(`📦 Pre-cache complete: ${cached} downloaded, ${skipped} already cached\n`);
      } catch (e) {
        console.error('Pre-cache error:', e.message);
      }
    })();

  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();

    const skipMlSpawn =
      process.env.DISABLE_ML_SERVER === 'true' || Boolean(process.env.ML_API_URL);

    if (skipMlSpawn) {
      console.log(
        process.env.ML_API_URL
          ? `ML server auto-start skipped (ML_API_URL=${process.env.ML_API_URL})`
          : 'ML server auto-start skipped (DISABLE_ML_SERVER=true)'
      );
    } else {
      await startMLServer();
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║   🎓 MasterClass Backend Server                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║   Server:    http://localhost:${PORT}                                      ║
║   Database:  ${mongoose.connection.db?.databaseName || 'masterclass'}                                                ║
║   GridFS:    ✓ Initialized                                                ║
║   ML API:    ${skipMlSpawn ? 'disabled (use ML_API_URL or re-enable spawn)'.padEnd(42) : 'http://localhost:5001/api'.padEnd(42)} ║
╠═══════════════════════════════════════════════════════════════════════════╣
║   API Endpoints:                                                          ║
║   • Auth:          /api/auth/*                                            ║
║   • Courses:       /api/courses/*                                         ║
║   • Recommendations: /api/recommendations/*                               ║
║   • Admin:         /api/admin/* (requires admin login)                    ║
║   • Reels:         /api/reels/*                                           ║
║   • Media:         /api/media/:fileId (video/image streaming)             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║   Admin Login:                                                            ║
║   POST /api/auth/admin/login                                              ║
║   Username: ${process.env.ADMIN_USERNAME || 'admintudy'}                                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
