// Система памяти AI D&D Master
// Экспорт всех компонентов

export { MemoryManager } from './MemoryManager.js';
export { DatabaseService } from './DatabaseService.js';
export { EntityService } from './EntityService.js';

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
  
  // Запросы
  CreateRoomRequest,
  CreateSessionRequest,
  SaveMessageRequest,
  CreateEntityRequest,
  CreateFactRequest,
  
  // Результаты
  OperationResult,
  MemoryStats
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
