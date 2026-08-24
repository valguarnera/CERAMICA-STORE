import { createHmac, timingSafeEqual } from 'crypto';

export interface MpSignatureParts {
  ts: string;
  v1: string;
}

export function parseSignatureHeader(header: string): MpSignatureParts | null {
  try {
    const parts = header.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);

    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return null;
    return { ts, v1 };
  } catch {
    return null;
  }
}

export function extractPaymentId(payload: string): string | null {
  try {
    const data = JSON.parse(payload);
    const id = data?.data?.id?.toString?.();
    return id ?? null;
  } catch {
    return null;
  }
}

export function buildManifest(paymentId: string, requestId: string, ts: string): string {
  return `id:${paymentId};request-id:${requestId};ts:${ts};`;
}

export function verifySignature(
  payload: string,
  signatureHeader: string,
  requestIdHeader: string,
  secret: string
): boolean {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const paymentId = extractPaymentId(payload);
  if (!paymentId) return false;

  const manifest = buildManifest(paymentId, requestIdHeader, parsed.ts);
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(parsed.v1, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}