import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    disconnect: vi.fn(),
    quit: vi.fn(),
  }));
  return { default: RedisMock };
});

describe('Redis module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export a redis client', async () => {
    const { redis } = await import('./redis.js');
    expect(redis).toBeDefined();
    expect(redis).toHaveProperty('on');
    expect(redis).toHaveProperty('connect');
    expect(redis).toHaveProperty('ping');
  });

  it('should export checkRedisConnection function', async () => {
    const { checkRedisConnection } = await import('./redis.js');
    expect(checkRedisConnection).toBeDefined();
    expect(typeof checkRedisConnection).toBe('function');
  });

  it('checkRedisConnection should return true on successful ping', async () => {
    const { checkRedisConnection } = await import('./redis.js');
    const result = await checkRedisConnection();
    expect(result).toBe(true);
  });

  it('checkRedisConnection should return false on connection failure', async () => {
    vi.doMock('ioredis', () => {
      const RedisMock = vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        ping: vi.fn(),
        disconnect: vi.fn(),
        quit: vi.fn(),
      }));
      return { default: RedisMock };
    });

    const { checkRedisConnection } = await import('./redis.js');
    const result = await checkRedisConnection();
    expect(result).toBe(false);
  });
});
