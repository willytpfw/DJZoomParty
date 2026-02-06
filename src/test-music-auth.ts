
import { db } from './db/db';
import { user, company, userCompany, userLogin, event, eventMusic } from './db/schema';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { addHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import './api/server'; // Start server

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;
const SECRET_KEY = process.env.SignJWS || 'sayHello';
const TIMEZONE = 'America/Mexico_City';

function getCurrentDateUTC6() {
    return toZonedTime(new Date(), TIMEZONE);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function createToken(payload: any) {
    const secret = new TextEncoder().encode(SECRET_KEY);
    return new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
}

async function cleanup() {
    console.log('Cleaning up...');
    try {
        await db.delete(eventMusic).where(eq(eventMusic.title, 'TEST_MUSIC'));
        await db.delete(event).where(eq(event.name, 'TEST_EVENT'));
        await db.delete(userCompany).where(eq(userCompany.idUser, 99999));
        await db.delete(userLogin).where(eq(userLogin.idUser, 99999));
        await db.delete(user).where(eq(user.idUser, 99999));
        await db.delete(company).where(eq(company.idCompany, 99999));
    } catch (e) {
        console.log('Cleanup error (might be empty):', e);
    }
}

async function runTests() {
    await sleep(2000);
    await cleanup();

    console.log('Setting up test data...');

    // Create User, Company, Event, Music
    const testUser = {
        idUser: 99999,
        userName: 'TEST_USER_Z',
        eMail: 'testz@example.com',
        movil: '1234567890',
        active: true,
        administrator: false
    };

    const testCompany = {
        idCompany: 99999,
        name: 'TEST_CO_Z',
        keyCompany: 'KEY_CO_Z',
        active: true
    };

    const testEvent = {
        idCompany: 99999,
        name: 'TEST_EVENT',
        eventDate: getCurrentDateUTC6(),
        eventToken: 'TEST_EVT_TOK',
        active: true
    };

    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompany);
    await db.insert(userCompany).values({ idUser: 99999, idCompany: 99999 });
    const [evt] = await db.insert(event).values(testEvent).returning();

    // Insert Music
    const [music] = await db.insert(eventMusic).values({
        idEvent: evt.idEvent,
        number: 1,
        url: 'https://secret.url/song.mp3',
        title: 'TEST_MUSIC',
        likes: 0
    }).returning();

    console.log('Test data created. Running assertions...');

    // 1. Get Music without Token (Should have empty URL)
    const res1 = await fetch(`${BASE_URL}/music/event/${evt.idEvent}`);
    const json1 = await res1.json();
    console.log('Test 1 (Public Music URL Hidden):',
        json1.success && json1.music[0].url === '' ? 'PASS' : 'FAIL',
        json1.music[0]
    );

    // 2. Get Music with Token (Should have URL)
    const token = await createToken({ UserName: 'TEST_USER_Z', KeyCompany: 'KEY_CO_Z' });
    const res2 = await fetch(`${BASE_URL}/music/event/${evt.idEvent}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const json2 = await res2.json();
    console.log('Test 2 (Auth Music URL Visible):',
        json2.success && json2.music[0].url === 'https://secret.url/song.mp3' ? 'PASS' : 'FAIL'
    );

    // 3. Delete Music without Token (Fail)
    const res3 = await fetch(`${BASE_URL}/music/${music.idEventMusic}`, {
        method: 'DELETE'
    });
    console.log('Test 3 (Delete Unauth):', res3.status === 401 ? 'PASS' : 'FAIL', res3.status);

    // 4. Delete Music with Token (Success)
    const res4 = await fetch(`${BASE_URL}/music/${music.idEventMusic}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    const json4 = await res4.json();
    console.log('Test 4 (Delete Auth):', json4.success ? 'PASS' : 'FAIL', json4);

    // 5. Expired PIN Regeneration
    // Insert expired PIN login (25h ago)
    const expiredPin = '999999';
    await db.insert(userLogin).values({
        idUser: testUser.idUser,
        pin: expiredPin,
        ip: 'TEST_IP',
        response: 'pending',
        date: addHours(getCurrentDateUTC6(), -25)
    });

    const res5 = await fetch(`${BASE_URL}/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: testUser.userName, pin: expiredPin, keyCompany: testCompany.keyCompany })
    });
    const json5 = await res5.json();
    console.log('Test 5 (Expired PIN Regen):',
        !json5.success && json5.code === 'PIN_EXPIRED_NEW_SENT' ? 'PASS' : 'FAIL',
        json5
    );

    await cleanup();
    console.log('Tests completed.');
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
