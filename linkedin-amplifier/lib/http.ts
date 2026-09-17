import { NextResponse } from 'next/server';

/** Single place to turn a thrown error into a response, so routes stay short. */
export function fail(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[amplifier]', message);
  return NextResponse.json({ error: message }, { status });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
