export interface AppConfig {
  port: number;

  // Database (MySQL)
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };

  // Redis
  redis: {
    host: string;
    port: number;
  };

  // LLM API
  llm: {
    apiKey: string;
    apiEndpoint: string;
  };

  // JWT
  jwtSecret: string;
}

function envOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function envIntOrDefault(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export const config: AppConfig = {
  port: envIntOrDefault('PORT', 3000),

  db: {
    host: envOrDefault('DB_HOST', 'localhost'),
    port: envIntOrDefault('DB_PORT', 3306),
    user: envOrDefault('DB_USER', 'root'),
    password: envOrDefault('DB_PASSWORD', ''),
    name: envOrDefault('DB_NAME', 'murder_mystery'),
  },

  redis: {
    host: envOrDefault('REDIS_HOST', 'localhost'),
    port: envIntOrDefault('REDIS_PORT', 6379),
  },

  llm: {
    apiKey: envOrDefault('LLM_API_KEY', ''),
    apiEndpoint: envOrDefault('LLM_API_ENDPOINT', ''),
  },

  jwtSecret: envOrDefault('JWT_SECRET', 'dev-secret-change-in-production'),
};
