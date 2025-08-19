import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip authentication for health checks and API routes that should remain public
  const { pathname } = request.nextUrl;
  
  // Skip auth for certain paths if needed (like health checks)
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Check if basic auth is enabled
  const authUsername = process.env.AUTH_USERNAME;
  const authPassword = process.env.AUTH_PASSWORD;

  // If no auth credentials are set, allow access (auth disabled)
  if (!authUsername || !authPassword) {
    return NextResponse.next();
  }

  // Check for authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="FIA Website"',
      },
    });
  }

  // Decode the credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Verify credentials
  if (username === authUsername && password === authPassword) {
    return NextResponse.next();
  }

  // Invalid credentials
  return new NextResponse('Invalid credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="FIA Website"',
    },
  });
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};