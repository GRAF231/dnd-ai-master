import { createElizaService } from './eliza.js';
import { DMAgentElizaService } from './dmAgentEliza.js';

export interface DMAgentInterface {
  processPlayerMessage(request: any): Promise<any>;
  processPlayerMessageStream(request: any): Promise<AsyncIterable<string>>;
  testConnection(): Promise<boolean>;
  testToolCalling(): Promise<void>;
}

let dmAgent: DMAgentInterface;

export function getDMAgent(): DMAgentInterface {
  if (!dmAgent) {
    throw new Error('DM Agent not initialized. Call initializeLLMServices first.');
  }
  return dmAgent;
}

export function initializeLLMServices(): DMAgentInterface {
  console.log('🤖 Инициализация Eliza LLM сервиса...');
  
  const elizaService = createElizaService();
  dmAgent = new DMAgentElizaService(elizaService);
  console.log('✅ Eliza сервис инициализирован');
  
  return dmAgent;
}

// Автоматическая инициализация при загрузке модуля
try {
  initializeLLMServices();
} catch (error) {
  console.error('❌ Ошибка инициализации Eliza сервиса:', error);
}
