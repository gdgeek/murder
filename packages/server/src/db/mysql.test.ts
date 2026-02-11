import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('mysql2/promise', () => {
  const mockPool = {
    getConnection: vi.fn(),
    on: vi.fn(),
    query: vi.fn(),
    execute: vi.fn(),
  };
  return {
    default: {
      createPool: vi.fn(() => mockPool),
    },
  };
});

describe('MySQL module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export a pool object', async () => {
    const { pool } = await import('./mysql.js');
    expect(pool).toBeDefined();
    expect(pool).toHaveProperty('getConnection');
    expect(pool).toHaveProperty('query');
    expect(pool).toHaveProperty('execute');
  });

  it('should export checkMySQLConnection function', async () => {
    const { checkMySQLConnection } = await import('./mysql.js');
    expect(checkMySQLConnection).toBeDefined();
    expect(typeof checkMySQLConnection).toBe('function');
  });

  it('checkMySQLConnection should return true on successful ping', async () => {
    const { pool, checkMySQLConnection } = await import('./mysql.js');
    const mockConnection = { ping: vi.fn().mockResolvedValue(undefined), release: vi.fn() };
    vi.mocked(pool.getConnection).mockResolvedValue(mockConnection as any);

    const result = await checkMySQLConnection();
    expect(result).toBe(true);
    expect(mockConnection.ping).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('checkMySQLConnection should return false on connection failure', async () => {
    const { pool, checkMySQLConnection } = await import('./mysql.js');
    vi.mocked(pool.getConnection).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await checkMySQLConnection();
    expect(result).toBe(false);
  });
});
