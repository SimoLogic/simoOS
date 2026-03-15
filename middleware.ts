import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ACCESS_TOKEN_NAME, verifyToken } from '@/lib/pmo/auth-core';

const locales = ['en', 'es'];
const defaultLocale = 'en';

// --- RATE LIMITER CONFIG (PROMPT #60) ---
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const client = rateLimitMap.get(ip);

    if (!client || (now - client.windowStart) > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return false;
    }

    client.count++;
    return client.count > MAX_REQUESTS;
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const ip = request.ip || 'anonymous';

    // Rate Limiting for PMO API and Actions
    if (pathname.includes('/pmo') || pathname.startsWith('/api/pmo')) {
        if (isRateLimited(ip)) {
            return new NextResponse('Too Many Requests (Rate Limit: 100/min)', { status: 429 });
        }
    }

    // Skip static files, APIs, and Next internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // --- SEGURIDAD PMO (ULTIMÁTUM REPARACIÓN) ---
    // Si la ruta es /pmo o /es/pmo o /en/pmo, validar JWT
    const isPmoPath = pathname.includes('/pmo');
    if (isPmoPath) {
        const token = request.cookies.get(ACCESS_TOKEN_NAME);
        const session = token ? await verifyToken(token.value) : null;

        if (!session) {
            // Determinar locale para el redirect
            const segments = pathname.split('/');
            const locale = locales.includes(segments[1]) ? segments[1] : defaultLocale;
            
            const loginUrl = new URL(`/${locale}/login`, request.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // --- I18N LOGIC ---
    // If the user lands on a known locale prefix (/en or /es), let it through
    const pathnameHasLocale = locales.some(
        (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
    );

    if (pathnameHasLocale) {
        return NextResponse.next();
    }

    // Redirect root (and any un-prefixed path) to the default locale
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
