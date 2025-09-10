// Система памяти AI D&D Master
// Экспорт всех компонентов

export { MemoryManager } from './MemoryManager.js';
export { DatabaseService } from './DatabaseService.js';
export { EntityService } from './EntityService.js';
export { ContextManager } from './ContextManager.js';
export { SummaryService } from './SummaryService.js';

import { MemoryManager } from './MemoryManager.js';

export type {
  // Основные типы
  Room,
  Session,
  Message,
  Scene,
  Entity,
  Fact,
  EntityType,
  
  // Контекст
  GameContext,
  ContextOptions,
  OptimizedContext,
  
  // Конфигурации
  ContextManagerConfig,
  SummaryServiceConfig,
  
  // Запросы
  CreateRoomRequest,
  CreateSessionRequest,
  SaveMessageRequest,
  CreateEntityRequest,
  CreateFactRequest,
  CreateSummaryRequest,
  
  // Результаты
  OperationResult,
  MemoryStats,
  Summary,
  CompressionStats,
  
  // Приоритизация
  PrioritizedMessage,
  PrioritizedEntity,
  
  // Сцены
  AutoScene,
  SceneAnalysis
} from './types.js';

// Создание глобального экземпляра MemoryManager
export const memoryManager = new MemoryManager();

// Утилитарные функции
export const initializeMemorySystem = async (dbPath?: string): Promise<MemoryManager> => {
  const manager = new MemoryManager(dbPath);
  await manager.initialize();
  return manager;
};

export const createMemoryManager = (dbPath?: string): MemoryManager => {
  return new MemoryManager(dbPath);
};
