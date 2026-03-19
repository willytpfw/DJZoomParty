import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL Not Found.");
    throw new Error("DATABASE_URL is missing.");
}

// 1. Extraemos el Host para diagnóstico (opcional pero recomendado)
console.log("Iniciando pool para el host:", new URL(connectionString).hostname);

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Necesario para Supabase si no manejas certificados locales
    },
    // 2. CONFIGURACIÓN CRÍTICA PARA DOCKER/CUBEPATH
    max: 10,                 // No satures el pooler
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Si en 5s no resuelve el DNS, lanza error rápido
});

// 3. Manejador de errores del Pool (Evita que el contenedor muera por errores de red)
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de Postgres:', err);
});

export const db = drizzle(pool, { schema });
export default db;