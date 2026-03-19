import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import 'dotenv/config'; // Esto debe cargar antes de usar process.env

const { Pool } = pg;

// Agregamos una validación para evitar el error "base"
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("❌ DATABASE_URL no encontrada. El sistema fallará con 'ENOTFOUND base' si continuamos.");
}

const pool = new Pool({
    connectionString: connectionString,
    // Para Supabase en producción (especialmente en Cubepath), 
    // es mejor forzar el SSL de esta manera:
    ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export default db;