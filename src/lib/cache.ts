//Redis快取
import Redis from 'ioredis';

let redis: Redis | null = null;

export function initRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    redis.on('error', (err) => console.error('Redis Error:', err));
  }
  return redis;
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (!redis) initRedis();
  const val = await redis!.get(key);
  return val ? JSON.parse(val) : null;
}

export async function setCache(key: string, value: any, ttlSeconds: number) {
  if (!redis) initRedis();
  await redis!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function delCacheByPrefix(prefix: string) {
  if (!redis) initRedis();
  const keys = await redis!.keys(`${prefix}*`);
  if (keys.length) await redis!.del(keys);
}