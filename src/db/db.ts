import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import 'dotenv/config';
import * as schema from './schema';

const { Pool } = pg;

// 1. Limpieza agresiva de la URL
const rawUrl = process.env.DATABASE_URL || "";
const connectionString = rawUrl.replace(/\s/g, '').trim();

// 2. Validación extra: Si la URL no empieza con postgresql://, algo está mal
if (!connectionString.startsWith('postgresql://')) {
    console.error("❌ La URL de la base de datos tiene un formato inválido:", connectionString);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    // Importante para el Pooler de Supabase
    max: 10,
    connectionTimeoutMillis: 10000,
});

// 3. Prueba de fuego inmediata al arrancar
pool.connect((err, _, release) => {
    if (err) {
        return console.error('❌ Error fatal conectando a la DB:', err.message);
    }
    console.log('✅ Conexión establecida correctamente con el host');
    release();
});

export const db = drizzle(pool, { schema });