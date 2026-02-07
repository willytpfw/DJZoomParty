
import { db } from './db/db';
import { company, event, eventMusic } from './db/schema';
import { eq } from 'drizzle-orm';
import './api/server'; // Start server

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function cleanup() {
    console.log('Cleaning up...');
    try {
        await db.delete(eventMusic).where(eq(eventMusic.title, 'TEST_MUSIC_VISIBILITY'));
        await db.delete(event).where(eq(event.name, 'TEST_EVENT_ACTIVE_V'));
        await db.delete(event).where(eq(event.name, 'TEST_EVENT_INACTIVE_V'));
        await db.delete(company).where(eq(company.idCompany, 99997));
    } catch (e) {
        console.log('Cleanup error:', e);
    }
}

async function runTests() {
    await sleep(2000);
    await cleanup();

    console.log('Setting up test data...');

    await db.insert(company).values({
        idCompany: 99997,
        name: 'TEST_CO_V',
        keyCompany: 'KEY_CO_V',
        active: true
    });

    // 1. Active Event
    const [evtActive] = await db.insert(event).values({
        idCompany: 99997,
        name: 'TEST_EVENT_ACTIVE_V',
        eventDate: new Date(),
        eventToken: 'TOK_ACTIVE_V',
        active: true
    }).returning();

    // 2. Inactive Event
    const [evtInactive] = await db.insert(event).values({
        idCompany: 99997,
        name: 'TEST_EVENT_INACTIVE_V',
        eventDate: new Date(),
        eventToken: 'TOK_INACTIVE_V',
        active: false
    }).returning();

    // Add music
    for (const e of [evtActive, evtInactive]) {
        await db.insert(eventMusic).values({
            idEvent: e.idEvent,
            number: 1,
            url: 'https://youtube.com/watch?v=test',
            title: 'TEST_MUSIC_VISIBILITY',
            likes: 0
        });
    }

    console.log('Test data created. Running assertions...');

    // Test 1: Music list for ACTIVE event (Should PASS)
    const res1 = await fetch(`${BASE_URL}/music/event-token/TOK_ACTIVE_V`);
    const json1 = await res1.json();
    console.log('Test 1 (Active Event Playlist):', json1.success ? 'PASS' : 'FAIL');

    // Test 2: Music list for INACTIVE event (Should FAIL 403)
    const res2 = await fetch(`${BASE_URL}/music/event-token/TOK_INACTIVE_V`);
    console.log('Test 2 (Inactive Event Playlist):', res2.status === 403 ? 'PASS' : 'FAIL', res2.status);

    await cleanup();
    console.log('Tests completed.');
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
