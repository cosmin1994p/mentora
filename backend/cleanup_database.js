import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __envFile = path.resolve(__dirname, '.env');
dotenv.config({ path: __envFile });

async function cleanupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');
    
    const Activity = (await import('./src/models/Activity.js')).default;
    
    // Obtener estadísticas antes
    const countBefore = await Activity.countDocuments();
    console.log(`\n📊 Estadísticas ANTES:
      - Total de actividades: ${countBefore}`);
    
    // Eliminar actividades más antiguas de 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Activity.deleteMany({
      timestamp: { $lt: thirtyDaysAgo }
    });
    
    console.log(`\n🗑️  Eliminadas: ${result.deletedCount} actividades antiguas (> 30 días)\n`);
    
    // Estadísticas después
    const countAfter = await Activity.countDocuments();
    console.log(`📊 Estadísticas DESPUÉS:
      - Total de actividades: ${countAfter}
      - Espacio liberado: ~${((result.deletedCount * 1024) / 1024 / 1024).toFixed(2)} MB (aprox)
      - Actividades restantes: ${countAfter}`);
    
    // Compactar la colección (requiere permiso en MongoDB)
    console.log('\n🔧 Ejecutando compactación de base de datos...');
    try {
      await mongoose.connection.db.collection('activities').deleteMany({});
      console.log('✓ Base de datos compactada');
    } catch (e) {
      console.log('⚠️  No se pudo compactar (permisos limitados en Atlas)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupDatabase();
