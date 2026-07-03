import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function aggressiveCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');
    
    const Activity = (await import('./src/models/Activity.js')).default;
    
    console.log('\n🗑️  LIMPIEZA AGRESIVA - Eliminando TODAS las actividades...\n');
    
    // Delete ALL activities
    const result = await Activity.deleteMany({});
    
    console.log(`✓ Eliminadas ${result.deletedCount} actividades`);
    console.log('✓ Espacio liberado: Significativo (~5-10 MB aprox)');
    
    // Verify count
    const remaining = await Activity.countDocuments();
    console.log(`✓ Actividades restantes: ${remaining}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

aggressiveCleanup();
