import { db } from '../db/db';
import { error as errorTable } from '../db/schema';

interface ErrorDetails {
    userLoginId?: number;
    error: string;
    stack?: string;
}

/**
 * Log error to database
 */
export async function logError(details: ErrorDetails): Promise<void> {
    try {
        await db.insert(errorTable).values({
            idUserLogin: details.userLoginId,
            error: details.error,
            stack: details.stack || '',
            date: new Date(),
        });
    } catch (dbError) {
        // If we can't log to DB, at least log to console
        console.error('Failed to log error to database:', dbError);
        console.error('Original error:', details);
    }
}

/**
 * Handle and log error, returns standardized error response
 */
export function handleError(err: unknown, userLoginId?: number): {
    message: string;
    logged: boolean;
} {
    const error = err instanceof Error ? err : new Error(String(err));

    logError({
        userLoginId,
        error: error.message,
        stack: error.stack,
    });

    return {
        message: error.message,
        logged: true,
    };
}

/**
 * Express error handler middleware
 */
export function errorMiddleware(
    err: Error,
    req: any,
    res: any,
    next: any
): void {
    console.error('Server error:', err);

    const userLoginId = req.userLoginId as number | undefined;

    logError({
        userLoginId,
        error: err.message,
        stack: err.stack,
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
}
