
import { db } from './db/db';
import { company, event, eventMusic } from './db/schema';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import './api/server'; // Start server

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;
const SECRET_KEY = process.env.SignJWS || 'sayHello';

async function createToken(payload: any) {
    const secret = new TextEncoder().encode(SECRET_KEY);
    return new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function cleanup() {
    console.log('Cleaning up...');
    try {
        await db.delete(eventMusic).where(eq(eventMusic.title, 'TEST_MUSIC_DEBUG'));
        await db.delete(event).where(eq(event.name, 'TEST_EVENT_DEBUG'));
        await db.delete(company).where(eq(company.idCompany, 99995));
    } catch (e) {
        console.log('Cleanup error:', e);
    }
}

async function runTests() {
    await sleep(2000);
    await cleanup();

    console.log('Setting up test data...');

    await db.insert(company).values({
        idCompany: 99995,
        name: 'TEST_CO_D',
        keyCompany: 'KEY_CO_D',
        active: true
    });

    // Inactive Event
    const [evtInactive] = await db.insert(event).values({
        idCompany: 99995,
        name: 'TEST_EVENT_DEBUG',
        eventDate: new Date(),
        eventToken: 'TOK_DEBUG',
        active: false
    }).returning();

    // Add music
    await db.insert(eventMusic).values({
        idEvent: evtInactive.idEvent,
        number: 1,
        url: 'https://youtube.com/watch?v=test',
        title: 'TEST_MUSIC_DEBUG',
        likes: 0
    });

    console.log('Test data created. Running assertions...');

    // Test 1: Guest (No token) - Should FAIL 403
    const res1 = await fetch(`${BASE_URL}/music/event-token/TOK_DEBUG`);
    console.log('Test 1 (Guest access to Inactive):', res1.status, res1.status === 403 ? 'PASS' : 'FAIL');

    // Test 2: Admin (Token with UserName and PIN) - Should PASS
    const adminToken = await createToken({
        UserName: 'ADMIN',
        PIN: '123456',
        KeyCompany: 'KEY_CO_D'
    });
    const res2 = await fetch(`${BASE_URL}/music/event-token/TOK_DEBUG`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Test 2 (Admin access to Inactive):', res2.status, res2.status === 200 ? 'PASS' : 'FAIL');

    await cleanup();
    console.log('Tests completed.');
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
