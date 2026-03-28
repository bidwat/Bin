import { NextResponse } from 'next/server';

const DEV_ALLOWED_ORIGINS = new Set([
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]);

function getCorsHeaders(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return {} as Record<string, string>;
  }

  const origin = request.headers.get('origin');

  if (!origin || !DEV_ALLOWED_ORIGINS.has(origin)) {
    return {} as Record<string, string>;
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    Vary: 'Origin',
  };
}

export function jsonResponse(
  request: Request,
  body: unknown,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);

  for (const [key, value] of Object.entries(getCorsHeaders(request))) {
    headers.set(key, value);
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function emptyResponse(request: Request, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  for (const [key, value] of Object.entries(getCorsHeaders(request))) {
    headers.set(key, value);
  }

  return new NextResponse(null, {
    ...init,
    headers,
  });
}

export function optionsResponse(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: new Headers(getCorsHeaders(request)),
  });
}
