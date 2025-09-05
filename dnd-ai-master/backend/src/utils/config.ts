export interface AppConfig {
  // Server settings
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;

  // Eliza API
  elizaApiKey: string;
  elizaBaseUrl: string;
  elizaModel: string;

  // API settings
  apiTimeout: number;
  logApiRequests: boolean;
  maxRetries: number;

  // Model settings
  dmModel: string;
  assistantModel: string;

  // Database
  databasePath: string;
}

export function loadConfig(): AppConfig {
  // Проверяем обязательные переменные для Eliza
  const elizaApiKey = process.env.ELIZA_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!elizaApiKey) {
    throw new Error('ELIZA_API_KEY or ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    // Server settings
    port: parseInt(process.env.PORT || '8000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',

    // Eliza API
    elizaApiKey,
    elizaBaseUrl: process.env.ELIZA_BASE_URL || 'https://api.eliza.yandex.net/raw',
    elizaModel: process.env.ELIZA_MODEL || 'claude-3-5-sonnet-20241022',

    // API settings
    apiTimeout: parseInt(process.env.API_TIMEOUT || '30000'),
    logApiRequests: process.env.LOG_API_REQUESTS === 'true',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),

    // Model settings
    dmModel: process.env.DM_MODEL || 'claude-3-5-sonnet-20241022',
    assistantModel: process.env.ASSISTANT_MODEL || 'claude-3-5-sonnet-20241022',

    // Database
    databasePath: process.env.DATABASE_PATH || './database/dnd.db',
  };
}

export function validateConfig(config: AppConfig): void {
  const requiredFields = [
    'elizaApiKey',
    'elizaBaseUrl',
    'elizaModel'
  ];

  for (const field of requiredFields) {
    if (!config[field as keyof AppConfig]) {
      throw new Error(`Configuration field '${field}' is required`);
    }
  }

  // Валидация порта
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }

  // Валидация timeout
  if (config.apiTimeout < 1000) {
    throw new Error('API timeout must be at least 1000ms');
  }

  // Валидация retries
  if (config.maxRetries < 0 || config.maxRetries > 10) {
    throw new Error('Max retries must be between 0 and 10');
  }
}

// Загружаем и валидируем конфигурацию
export const config = (() => {
  try {
    const cfg = loadConfig();
    validateConfig(cfg);
    return cfg;
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }
})();
