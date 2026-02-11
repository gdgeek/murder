import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AppConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so config re-reads env vars
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default values when env vars are not set', async () => {
    // Clear relevant env vars
    delete process.env.PORT;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_API_ENDPOINT;
    delete process.env.JWT_SECRET;

    // Re-import to get fresh config
    const { config } = await import('./index.js');

    expect(config.port).toBe(3000);
    expect(config.db.host).toBe('localhost');
    expect(config.db.port).toBe(3306);
    expect(config.db.user).toBe('root');
    expect(config.db.password).toBe('');
    expect(config.db.name).toBe('murder_mystery');
    expect(config.redis.host).toBe('localhost');
    expect(config.redis.port).toBe(6379);
    expect(config.llm.apiKey).toBe('');
    expect(config.llm.apiEndpoint).toBe('');
    expect(config.jwtSecret).toBe('dev-secret-change-in-production');
  });

  it('should have correct structure with all expected keys', async () => {
    const { config } = await import('./index.js');

    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('db');
    expect(config).toHaveProperty('redis');
    expect(config).toHaveProperty('llm');
    expect(config).toHaveProperty('jwtSecret');
    expect(config.db).toHaveProperty('host');
    expect(config.db).toHaveProperty('port');
    expect(config.db).toHaveProperty('user');
    expect(config.db).toHaveProperty('password');
    expect(config.db).toHaveProperty('name');
    expect(config.redis).toHaveProperty('host');
    expect(config.redis).toHaveProperty('port');
    expect(config.llm).toHaveProperty('apiKey');
    expect(config.llm).toHaveProperty('apiEndpoint');
  });
});
