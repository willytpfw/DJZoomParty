
import { db } from './db/db';
import { user, company, userCompany, userLogin } from './db/schema';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { addHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import './api/server'; // This should start the server

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/auth`;
const SECRET_KEY = process.env.SignJWS || 'sayHello';

const TIMEZONE = 'America/Mexico_City';
function getCurrentDateUTC6() {
    return toZonedTime(new Date(), TIMEZONE);
}

// Wait for server to start
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
        await db.delete(userLogin).where(eq(userLogin.ip, 'TEST_IP'));
        await db.delete(userCompany).where(eq(userCompany.idUser, 99999));
        await db.delete(user).where(eq(user.idUser, 99999));
        await db.delete(company).where(eq(company.idCompany, 99998));
        await db.delete(company).where(eq(company.idCompany, 99999));
    } catch (e) {
        console.log('Cleanup error (might be empty):', e);
    }
}

async function runTests() {
    await sleep(2000); // Wait for server to be ready
    await cleanup();

    console.log('Setting up test data...');

    // 1. Create Test Data
    const testUser = {
        idUser: 99999,
        userName: 'TEST_USER_X',
        eMail: 'test@example.com',
        movil: '1234567890',
        active: true,
        administrator: false
    };

    const testCompanyA = {
        idCompany: 99999,
        name: 'TEST_CO_A',
        keyCompany: 'KEY_CO_A',
        active: true
    };

    const testCompanyB = {
        idCompany: 99998,
        name: 'TEST_CO_B',
        keyCompany: 'KEY_CO_B', // Not associated
        active: true
    };

    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompanyA);
    await db.insert(company).values(testCompanyB);
    await db.insert(userCompany).values({
        idUser: testUser.idUser,
        idCompany: testCompanyA.idCompany
    });

    // Login from 13 hours ago (Should be VALID now, would fail before)
    await db.insert(userLogin).values({
        idUser: testUser.idUser,
        pin: '123456',
        ip: 'TEST_IP',
        response: '200',
        date: addHours(getCurrentDateUTC6(), -13)
    });

    console.log('Test data created. Running assertions...');

    // Test 1: Valid Login (13 hours ago) + Correct Company
    const token1 = await createToken({
        KeyCompany: 'KEY_CO_A',
        UserName: 'TEST_USER_X'
    });

    const res1 = await fetch(`${BASE_URL}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token1 })
    });
    const json1 = await res1.json();
    console.log('Test 1 (13h ago, Associate Co):', json1.success && json1.valid ? 'PASS' : 'FAIL', json1);

    // Test 2: User Not Associated with Company B
    const token2 = await createToken({
        KeyCompany: 'KEY_CO_B',
        UserName: 'TEST_USER_X'
    });

    const res2 = await fetch(`${BASE_URL}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token2 })
    });
    const json2 = await res2.json();
    // Expect 403 or failure
    console.log('Test 2 (Wrong Company):', !json2.success && json2.error.includes('associated') ? 'PASS' : 'FAIL', json2);

    // Test 3: Expired Login (25 hours ago)
    // Update the login record to be 25 hours ago
    await db.update(userLogin)
        .set({ date: addHours(getCurrentDateUTC6(), -25) })
        .where(eq(userLogin.idUser, testUser.idUser));

    const res3 = await fetch(`${BASE_URL}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token1 }) // Reuse token 1
    });
    const json3 = await res3.json();
    // Expect valid = false, redirectTo = 'pin-verification'
    console.log('Test 3 (25h ago):', json3.success && !json3.valid && json3.redirectTo === 'pin-verification' ? 'PASS' : 'FAIL', json3);

    await cleanup();
    console.log('Tests completed.');
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
