
import { db } from './db/db';
import { user, company, userCompany, userLogin } from './db/schema';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { toZonedTime } from 'date-fns-tz';
import './api/server';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api/auth`;
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
        await db.delete(userCompany).where(eq(userCompany.idUser, 88888));
        await db.delete(userLogin).where(eq(userLogin.idUser, 88888));
        await db.delete(user).where(eq(user.idUser, 88888));
        await db.delete(company).where(eq(company.idCompany, 88888));
    } catch (e) {
        console.log('Cleanup error (might be empty):', e);
    }
}

async function runTests() {
    await sleep(2000);
    await cleanup();

    console.log('Setting up test data...');

    // Create User & Company
    const testUser = {
        idUser: 88888,
        userName: 'STRICT_USER',
        eMail: 'strict@example.com',
        movil: '5555555555',
        active: true,
        administrator: false
    };

    const testCompany = {
        idCompany: 88888,
        name: 'STRICT_CO',
        keyCompany: 'KEY_STR',
        active: true
    };

    await db.insert(user).values(testUser);
    await db.insert(company).values(testCompany);
    await db.insert(userCompany).values({ idUser: 88888, idCompany: 88888 });

    // Insert Valid Login
    const validPin = '777777';
    await db.insert(userLogin).values({
        idUser: testUser.idUser,
        pin: validPin,
        ip: 'TEST_IP',
        response: '200',
        date: getCurrentDateUTC6() // Now
    });

    console.log('Test data created. Running assertions...');

    // 1. Token WITHOUT PIN (Should Fail - 401)
    const tokenNoPin = await createToken({ UserName: 'STRICT_USER', KeyCompany: 'KEY_STR' });
    const res1 = await fetch(`${BASE_URL}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenNoPin })
    });
    const json1 = await res1.json();
    console.log('Test 1 (Missing PIN in Token):',
        !json1.success && json1.error.includes('PIN missing') ? 'PASS' : 'FAIL',
        json1
    );

    // 2. Token WITH WRONG PIN (Should Fail/Redirect)
    const tokenWrongPin = await createToken({ UserName: 'STRICT_USER', KeyCompany: 'KEY_STR', PIN: '000000' });
    const res2 = await fetch(`${BASE_URL}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenWrongPin })
    });
    const json2 = await res2.json();
    // Expect valid=false, redirectTo='pin-verification' (since no valid login found for that specific PIN)
    console.log('Test 2 (Wrong PIN in Token):',
        json2.success && !json2.valid && json2.redirectTo === 'pin-verification' ? 'PASS' : 'FAIL',
        json2
    );

    // 3. Token WITH CORRECT PIN (Should Pass)
    const tokenCorrect = await createToken({ UserName: 'STRICT_USER', KeyCompany: 'KEY_STR', PIN: validPin });
    const res3 = await fetch(`${BASE_URL}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenCorrect })
    });
    const json3 = await res3.json();
    console.log('Test 3 (Correct PIN):',
        json3.success && json3.valid && json3.redirectTo === 'events' ? 'PASS' : 'FAIL',
        json3
    );

    await cleanup();
    console.log('Tests completed.');
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
