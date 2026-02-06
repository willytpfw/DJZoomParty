import * as jose from 'jose';

const SECRET_KEY = process.env.SignJWS || 'default-secret-key-change-in-production';

interface TokenPayload {
    KeyCompany: string;
    EventToken?: string;
    UserName?: string;
    PIN?: string;
}

/**
 * Create a signed JWS token
 */
export async function createToken(payload: TokenPayload): Promise<string> {
    const secret = new TextEncoder().encode(SECRET_KEY);

    const jwt = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

    return jwt;
}

/**
 * Verify and decode a JWS token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const secret = new TextEncoder().encode(SECRET_KEY);
        const { payload } = await jose.jwtVerify(token, secret);

        return {
            KeyCompany: payload.KeyCompany as string,
            EventToken: payload.EventToken as string | undefined,
            UserName: payload.UserName as string | undefined,
            PIN: payload.PIN as string | undefined,
        };
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): TokenPayload | null {
    try {
        const payload = jose.decodeJwt(token);
        return {
            KeyCompany: payload.KeyCompany as string,
            EventToken: payload.EventToken as string | undefined,
            UserName: payload.UserName as string | undefined,
            PIN: payload.PIN as string | undefined,
        };
    } catch (error) {
        console.error('Token decode failed:', error);
        return null;
    }
}
