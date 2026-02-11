import Redis from 'ioredis';
import { config } from '../config/index.js';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (error: Error) => {
  console.error('[Redis] Connection error:', error.message);
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.connect();
    const pong = await redis.ping();
    console.log('[Redis] Connection verified:', pong);
    return true;
  } catch (error) {
    console.error('[Redis] Connection failed:', (error as Error).message);
    return false;
  }
}
