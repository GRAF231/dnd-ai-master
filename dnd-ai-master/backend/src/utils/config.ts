export interface AppConfig {
  // Server settings
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;

  // OpenRouter API
  openrouterApiKey: string;
  openrouterBaseUrl: string;
  siteUrl?: string;
  siteName?: string;

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
  // Проверяем обязательные переменные
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterApiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  return {
    // Server settings
    port: parseInt(process.env.PORT || '8000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',

    // OpenRouter API
    openrouterApiKey,
    openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    siteUrl: process.env.SITE_URL,
    siteName: process.env.SITE_NAME,

    // API settings
    apiTimeout: parseInt(process.env.API_TIMEOUT || '30000'),
    logApiRequests: process.env.LOG_API_REQUESTS === 'true',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),

    // Model settings
    dmModel: process.env.DM_MODEL || 'anthropic/claude-3.5-sonnet',
    assistantModel: process.env.ASSISTANT_MODEL || 'anthropic/claude-3.5-sonnet',

    // Database
    databasePath: process.env.DATABASE_PATH || './database/dnd.db',
  };
}

export function validateConfig(config: AppConfig): void {
  const requiredFields = [
    'openrouterApiKey',
    'openrouterBaseUrl',
    'dmModel'
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
