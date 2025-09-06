
import { Character } from '@/utils/charactersApi';

// Типы для работы с DM API
export interface DMRequest {
  playerMessage: string;
  playerName?: string;
  roomId: string;
  context?: {
    currentScene?: string;
    recentHistory?: string[];
    activeNPCs?: string[];
    currentObjective?: string;
  };
  enableTools?: boolean;
}

// Типы для tool definitions (соответствуют бэкенду)
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

// Аргументы tool call могут быть разными в зависимости от инструмента
export interface ToolCallArguments {
  [key: string]: string | number | boolean | undefined;
}

export interface ToolCallResult {
  name: string;
  arguments: ToolCallArguments;
  result: string;
  success: boolean;
}

export interface DMResponse {
  content: string;
  timestamp: string;
  type: 'narration' | 'npc_dialogue' | 'combat' | 'description' | 'system';
  toolCalls?: ToolCallResult[];
}

export interface DMApiResponse {
  success: boolean;
  response: DMResponse;
}

// Типы для сообщений чата
export interface ChatMessage {
  id: string;
  type: 'player' | 'dm' | 'system';
  playerName?: string;
  content: string;
  timestamp: string;
  toolCalls?: ToolCallResult[];
}

// Типы для комнат
export interface Room {
  id: string;
  title: string;
  players: Player[];
  status: 'waiting' | 'active' | 'completed';
  currentScene?: string;
  activeNPCs?: string[];
  currentObjective?: string;
}

export interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  character?: Character;
}

// Типы для инструментов
export interface ToolInfo {
  name: string;
  description: string;
  examples: string[];
}

export interface ToolsResponse {
  success: boolean;
  tools: Record<string, ToolInfo>;
  definitions: ToolDefinition[];
}
