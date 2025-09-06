// Базовые типы для системы памяти AI D&D Master

export interface Room {
  id: string;
  title: string;
  settings: Record<string, any>;
  created_at: Date;
}

export interface Session {
  id: string;
  room_id: string;
  started_at: Date;
  ended_at?: Date;
  summary?: string;
  token_count: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  player_name?: string;
  timestamp: Date;
  token_count?: number;
  compressed: boolean;
}

export interface Scene {
  id: string;
  session_id: string;
  title?: string;
  description?: string;
  started_at: Date;
  ended_at?: Date;
  summary?: string;
}

export type EntityType = 'character' | 'location' | 'quest' | 'npc' | 'item';

export interface Entity {
  id: string;
  room_id: string;
  type: EntityType;
  name: string;
  description?: string;
  data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Fact {
  id: string;
  entity_id: string;
  key: string;
  value: string;
  confidence: number; // 0.0 - 1.0
  source_message_id?: string;
  created_at: Date;
}

// Контекст для ИИ-мастера
export interface GameContext {
  session_id: string;
  room_id: string;
  recent_messages: Message[];
  active_entities: Entity[];
  relevant_facts: Fact[];
  session_summary?: string;
  scene_summary?: string;
  total_tokens: number;
}

// Запросы для создания сущностей
export interface CreateRoomRequest {
  id: string;
  title: string;
  settings?: Record<string, any>;
}

export interface CreateSessionRequest {
  room_id: string;
}

export interface SaveMessageRequest {
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  player_name?: string;
  token_count?: number;
}

export interface CreateEntityRequest {
  room_id: string;
  type: EntityType;
  name: string;
  description?: string;
  data?: Record<string, any>;
}

export interface CreateFactRequest {
  entity_id: string;
  key: string;
  value: string;
  confidence?: number;
  source_message_id?: string;
}

// Опции для построения контекста
export interface ContextOptions {
  max_messages?: number;
  max_tokens?: number;
  include_entities?: boolean;
  include_facts?: boolean;
  entity_types?: EntityType[];
}

// Результаты операций
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Статистика системы памяти
export interface MemoryStats {
  total_sessions: number;
  total_messages: number;
  total_entities: number;
  total_facts: number;
  compressed_messages: number;
  average_session_length: number;
  storage_size_mb: number;
}

// === НОВЫЕ ТИПЫ ДЛЯ CONTEXTMANAGER И SUMMARYSERVICE ===

// Конфигурация ContextManager
export interface ContextManagerConfig {
  max_tokens: number;           // Максимальное количество токенов в контексте (150k)
  max_messages: number;         // Максимальное количество сообщений
  priority_threshold: number;   // Порог приоритета для включения в контекст
  cache_ttl_ms: number;        // Время жизни кэша в миллисекундах
}

// Приоритизированное сообщение
export interface PrioritizedMessage extends Message {
  priority_score: number;      // Оценка приоритета (0.0 - 1.0)
  relevance_factors: {
    time_weight: number;       // Временной вес
    participant_weight: number; // Вес участника
    keyword_weight: number;    // Вес ключевых слов
    entity_weight: number;     // Вес связанных сущностей
  };
}

// Приоритизированная сущность
export interface PrioritizedEntity extends Entity {
  priority_score: number;      // Оценка приоритета (0.0 - 1.0)
  mention_count: number;       // Количество упоминаний
  last_mentioned: Date;        // Последнее упоминание
  relevance_factors: {
    frequency_weight: number;  // Вес частоты упоминаний
    recency_weight: number;    // Вес недавности
    connection_weight: number; // Вес связей с другими сущностями
  };
}

// Оптимизированный контекст
export interface OptimizedContext extends GameContext {
  prioritized_messages: PrioritizedMessage[];
  prioritized_entities: PrioritizedEntity[];
  context_summary: string;     // Краткая сводка контекста
  optimization_stats: {
    original_token_count: number;
    optimized_token_count: number;
    compression_ratio: number;
    messages_included: number;
    messages_excluded: number;
    entities_included: number;
  };
}

// Кэшированный контекст
export interface CachedContext {
  context: OptimizedContext;
  created_at: Date;
  expires_at: Date;
  cache_key: string;
}

// Конфигурация SummaryService
export interface SummaryServiceConfig {
  min_messages_for_summary: number;  // Минимум сообщений для создания сводки
  max_messages_per_batch: number;    // Максимум сообщений в одном батче для суммаризации
  summary_trigger_threshold: number; // Порог для автоматического создания сводки
  scene_detection_enabled: boolean;  // Включено ли автоматическое определение сцен
  background_processing: boolean;    // Фоновая обработка
}

// Запрос на создание сводки
export interface CreateSummaryRequest {
  session_id: string;
  message_ids?: string[];      // Конкретные сообщения для суммаризации
  summary_type: 'messages' | 'scene' | 'session';
  title?: string;
  context?: string;            // Дополнительный контекст для ИИ
}

// Сводка
export interface Summary {
  id: string;
  session_id: string;
  type: 'messages' | 'scene' | 'session';
  title: string;
  content: string;
  message_ids: string[];       // ID сообщений, которые были суммированы
  token_count: number;
  created_at: Date;
  metadata: Record<string, any>;
}

// Автоматическая сцена
export interface AutoScene {
  id: string;
  session_id: string;
  title: string;
  description: string;
  start_message_id: string;
  end_message_id: string;
  participants: string[];      // Имена участников сцены
  key_events: string[];        // Ключевые события сцены
  entities_mentioned: string[]; // ID упомянутых сущностей
  created_at: Date;
}

// Результат анализа сцены
export interface SceneAnalysis {
  scene_detected: boolean;
  scene_title?: string;
  scene_description?: string;
  key_events: string[];
  participants: string[];
  entities_mentioned: string[];
  confidence: number;          // Уверенность в определении сцены (0.0 - 1.0)
}

// Статистика сжатия
export interface CompressionStats {
  total_summaries: number;
  messages_summarized: number;
  original_token_count: number;
  compressed_token_count: number;
  compression_ratio: number;
  scenes_detected: number;
  processing_time_ms: number;
}
