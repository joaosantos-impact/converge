/**
 * Runtime API proxy - forwards /api/* to the backend.
 * Uses Node.js http(s) so we don't rely on fetch (avoids ECONNREFUSED handling issues in some runtimes).
 */
import { NextRequest, NextResponse } from 'next/server';
import * as http from 'node:http';
import * as https from 'node:https';

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

function nodeRequest(
  url: URL,
  options: { method: string; headers: Record<string, string>; body?: Buffer }
): Promise<{ statusCode: number; statusMessage: string; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const req = lib.request(
      url,
      {
        method: options.method,
        headers: options.headers,
        rejectUnauthorized: true,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            statusMessage: res.statusMessage ?? '',
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on('error', reject);
    if (options.body && options.body.length > 0) req.write(options.body);
    req.end();
  });
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
  const url = new URL(backendUrl);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'host') return;
    headers[key] = value;
  });
  const clientHost = request.headers.get('host') || request.nextUrl.host;
  headers['x-forwarded-host'] = clientHost;
  if (url.host) headers['host'] = url.host;

  const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
  let body: Buffer | undefined;
  if (methodsWithBody.includes(request.method)) {
    try {
      const ab = await request.arrayBuffer();
      if (ab.byteLength > 0) body = Buffer.from(ab);
    } catch {
      body = undefined;
    }
  }

  try {
    const { statusCode, statusMessage, headers: resHeaders, body: resBody } = await nodeRequest(url, {
      method: request.method,
      headers,
      body,
    });

    const responseHeaders = new Headers();
    for (const [k, v] of Object.entries(resHeaders)) {
      if (v === undefined) continue;
      const val = Array.isArray(v) ? v.join(', ') : v;
      if (k.toLowerCase() !== 'transfer-encoding' && k.toLowerCase() !== 'connection') {
        responseHeaders.set(k, val);
      }
    }

    // NextResponse expects BodyInit (e.g. Uint8Array), not Node Buffer
    const bodyInit = resBody.length > 0 ? new Uint8Array(resBody) : null;
    const status = statusCode === 304 ? 200 : statusCode;
    return new NextResponse(bodyInit, {
      status,
      statusText: statusCode === 304 ? 'OK' : statusMessage,
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
