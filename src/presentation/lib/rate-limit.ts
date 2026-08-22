interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  headers: Record<string, string>;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': (limit - 1).toString(),
        'X-RateLimit-Reset': Math.ceil((now + windowMs) / 1000).toString(),
      },
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(entry.resetAt / 1000).toString(),
        'Retry-After': Math.ceil((entry.resetAt - now) / 1000).toString(),
      },
    };
  }

  entry.count++;
  store.set(key, entry);

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': (limit - entry.count).toString(),
      'X-RateLimit-Reset': Math.ceil(entry.resetAt / 1000).toString(),
    },
  };
}

setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  });
}, 60000);