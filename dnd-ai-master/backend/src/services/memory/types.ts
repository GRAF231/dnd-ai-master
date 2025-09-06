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
