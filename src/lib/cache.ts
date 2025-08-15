// src/lib/cache.ts
import Redis from 'ioredis';

let redis: Redis | null = null;

export function initRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      // 關掉離線佇列 + 快速失敗
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null, // 不要無限重試
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
    });
    redis.on('error', (err) => console.error('Redis Error:', err));
  }
  return redis;
}

function ready() {
  return redis && (redis as any).status === 'ready';
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (!redis) initRedis();
  if (!ready()) return null; // 連不上就直接略過
  try {
    const val = await redis!.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null; // 出錯就當沒快取
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number) {
  if (!redis) initRedis();
  if (!ready()) return; // 不阻塞請求
  try {
    if (ttlSeconds > 0) {
      await redis!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } else {
      await redis!.set(key, JSON.stringify(value));
    }
  } catch { /* 忽略錯誤 */ }
}

export async function delCacheByPrefix(prefix: string) {
  if (!redis) initRedis();
  if (!ready()) return;
  try {
    const keys = await redis!.keys(`${prefix}*`);
    if (keys.length) await redis!.del(keys);
  } catch { /* 忽略錯誤 */ }
}