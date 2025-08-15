// src/lib/cache.ts
import Redis, { RedisOptions } from 'ioredis';

let redis: Redis | null = null;

function buildRedisOptions(url: string): RedisOptions {
  const isTLS = url.startsWith('rediss://');
  const opts: RedisOptions = {
    retryStrategy: (times) => Math.min(times * 500, 30000),
    keepAlive: 10000,
    reconnectOnError: (err) => {
      if (!err) return false;
      const msg = err.message || '';
      return /READONLY|ETIMEDOUT|ECONNRESET|EAI_AGAIN|NOAUTH|NR_CLOSED/.test(msg);
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    lazyConnect: false,
  };

  if (isTLS) {
    // 多數供應商 TLS 預設即可；若遇到自簽憑證問題可放寬：
    // opts.tls = { rejectUnauthorized: false };
    opts.tls = {};
  }
  return opts;
}

export function initRedis() {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[Cache] REDIS_URL not set, cache disabled.');
    return null;
  }

  try {
    const opts = buildRedisOptions(url.trim());
    redis = new Redis(url.trim(), opts);

    redis.on('connect', () => {
      const proto = url.startsWith('rediss://') ? 'TLS' : 'PLAINTEXT';
      console.log(`[Cache] Redis connected (${proto}).`);
    });

    redis.on('error', (err) => {
      console.error('Redis Error:', err);
    });
  } catch (e) {
    console.error('[Cache] Failed to init redis:', e);
    redis = null;
  }

  return redis;
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const r = initRedis();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.warn('[Cache] get failed, bypassing:', e);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number) {
  const r = initRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (e) {
    console.warn('[Cache] set failed, bypassing:', e);
  }
}

export async function delCacheByPrefix(prefix: string) {
  const r = initRedis();
  if (!r) return;
  try {
    const keys = await r.keys(`${prefix}*`);
    if (keys.length) await r.del(keys);
  } catch (e) {
    console.warn('[Cache] del by prefix failed, bypassing:', e);
  }
}