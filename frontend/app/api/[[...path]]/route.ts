/**
 * Runtime API proxy - forwards /api/* to the backend.
 * Uses process.env at runtime (unlike next.config rewrites which are build-time).
 */
import { NextRequest, NextResponse } from 'next/server';

const getBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';
  return url.replace(/\/$/, ''); // remove trailing slash
};

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, context);
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const pathSegments = path ?? [];
  const pathString = pathSegments.length > 0 ? pathSegments.join('/') : '';
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';

  const backendUrl = `${getBackendUrl()}/api/${pathString}${queryString}`;

  const headers = new Headers(request.headers);
  // Replace host so backend receives correct Host
  headers.delete('host');

  let body: ArrayBuffer | string | undefined;
  try {
    body = await request.arrayBuffer();
  } catch {
    body = undefined;
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: body ?? undefined,
    });

    const responseHeaders = new Headers(backendResponse.headers);
    // Remove hop-by-hop headers
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[API Proxy] Failed to reach backend:', backendUrl, err);
    return NextResponse.json(
      { error: 'Backend unreachable', message: (err as Error)?.message },
      { status: 502 }
    );
  }
}
