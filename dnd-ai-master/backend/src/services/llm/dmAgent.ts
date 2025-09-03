import { OpenRouterService, ChatRequest } from './openrouter.js';
import { toolsService, ToolCallRequest } from '../tools/index.js';
import OpenAI from 'openai';

export interface DMResponse {
  content: string;
  timestamp: string;
  type: 'narration' | 'npc_dialogue' | 'combat' | 'description' | 'system';
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  name: string;
  arguments: any;
  result: string;
  success: boolean;
}

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

export class DMAgentService {
  private openRouter: OpenRouterService;
  private systemPrompt: string;

  constructor(openRouter: OpenRouterService) {
    this.openRouter = openRouter;
    this.systemPrompt = this.createSystemPrompt();
  }

  private createSystemPrompt(): string {
    return `Ты опытный мастер D&D, ведущий увлекательную кампанию. Твоя роль - создавать живой мир, описывать сцены (3-6 предложений), вести диалоги NPC и реагировать на действия игроков. 

Используй инструменты для бросков кубиков когда нужно:
- Для проверок навыков игроков
- Для атак и урона в бою
- Для случайных событий

Пиши от второго лица ("Вы видите..."). Не раскрывай закулисную информацию. Поддерживай напряжение и давай игрокам инициативу.`;
  }

  private buildMessages(request: DMRequest): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt }
    ];
    
    // Добавляем информацию о комнате и контексте
    let contextInfo = 'КОНТЕКСТ СЕССИИ:\n';
    contextInfo += `Комната: ${request.roomId}\n`;
    
    if (request.context) {
      if (request.context.currentScene) contextInfo += `Сцена: ${request.context.currentScene}\n`;
      if (request.context.currentObjective) contextInfo += `Цель: ${request.context.currentObjective}\n`;
      if (request.context.activeNPCs?.length) contextInfo += `Активные NPC: ${request.context.activeNPCs.join(', ')}\n`;
      if (request.context.recentHistory?.length) contextInfo += `Недавние события:\n${request.context.recentHistory.join('\n')}\n`;
    }
    
    contextInfo += `\n⚠️ ВАЖНО: При использовании character_sheet tool всегда используй room_id: "${request.roomId}"\n`;
    
    if (contextInfo.length > 'КОНТЕКСТ СЕССИИ:\n'.length) {
      messages.push({ role: 'system', content: contextInfo });
    }
    
    const playerPrefix = request.playerName ? `${request.playerName}: ` : '';
    messages.push({ role: 'user', content: `${playerPrefix}${request.playerMessage}` });
    return messages;
  }

  async processPlayerMessage(request: DMRequest): Promise<DMResponse> {
    try {
      const messages = this.buildMessages(request);
      const tools = request.enableTools ? toolsService.getAllTools() : undefined;
      
      const aiRequest: ChatRequest = {
        model: process.env.DM_MODEL || 'anthropic/claude-3.5-sonnet',
        messages,
        max_tokens: 1000,
        temperature: 0.8,
        tools,
        tool_choice: tools ? 'auto' : undefined,
      };

      const response = await this.openRouter.createChatCompletion(aiRequest);
      const message = response.choices[0]?.message;
      
      if (!message) {
        throw new Error('No response message from LLM');
      }

      // Обработка tool calls если есть
      let toolCalls: ToolCallResult[] = [];
      let finalContent = message.content || '';

      if (message.tool_calls && message.tool_calls.length > 0) {
                 // Выполняем tool calls
         for (const toolCall of message.tool_calls) {
           try {
             // Безопасная проверка типа tool call
             if (toolCall.type === 'function' && 'function' in toolCall) {
               const functionCall = toolCall.function;
               const args = JSON.parse(functionCall.arguments);
               const toolRequest: ToolCallRequest = {
                 name: functionCall.name,
                 arguments: args
               };
               
               const toolResult = toolsService.executeToolCall(toolRequest);
               toolCalls.push({
                 name: functionCall.name,
                 arguments: args,
                 result: toolResult.content,
                 success: toolResult.success
               });

               // Добавляем результат tool call в сообщения
               messages.push(message);
               messages.push({
                 role: 'tool',
                 tool_call_id: toolCall.id,
                 content: toolResult.content
               });
             }
            } catch (error) {
              console.error('Tool call execution error:', error);
              let fallbackName = 'unknown';
              if (toolCall.type === 'function' && 'function' in toolCall) {
                fallbackName = toolCall.function.name;
              }
              toolCalls.push({
                name: fallbackName,
                arguments: {},
                result: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
                success: false
              });
            }
         }

        // Запрашиваем финальный ответ с результатами tool calls
        const finalRequest: ChatRequest = {
          model: process.env.DM_MODEL || 'anthropic/claude-3.5-sonnet',
          messages,
          max_tokens: 1000,
          temperature: 0.8,
          tools,
        };

        const finalResponse = await this.openRouter.createChatCompletion(finalRequest);
        finalContent = finalResponse.choices[0]?.message?.content || finalContent;
      }

      return {
        content: finalContent,
        timestamp: new Date().toISOString(),
        type: this.determineResponseType(finalContent),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      console.error('DM Agent Error:', error);
      throw new Error('Failed to process DM response');
    }
  }

  async processPlayerMessageStream(request: DMRequest): Promise<AsyncIterable<string>> {
    try {
      const messages = this.buildMessages(request);
      const tools = request.enableTools ? toolsService.getAllTools() : undefined;
      
      const aiRequest: ChatRequest = {
        model: process.env.DM_MODEL || 'anthropic/claude-3.5-sonnet',
        messages,
        max_tokens: 1000,
        temperature: 0.8,
        stream: true,
        tools,
        tool_choice: tools ? 'auto' : undefined,
      };
      const stream = await this.openRouter.createStreamingChatCompletion(aiRequest);
      return this.processStream(stream);
    } catch (error) {
      console.error('DM Agent Streaming Error:', error);
      throw new Error('Failed to process DM streaming response');
    }
  }

  private async* processStream(stream: any): AsyncIterable<string> {
    try {
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw error;
    }
  }

  private determineResponseType(content: string): DMResponse['type'] {
    const lower = content.toLowerCase();
    if (lower.includes('инициатива') || lower.includes('атак')) return 'combat';
    if (content.includes('"') || content.includes('—')) return 'npc_dialogue';
    if (lower.includes('видите') || lower.includes('перед вами')) return 'description';
    return 'narration';
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await this.processPlayerMessage({ playerMessage: 'Привет!', roomId: 'test' });
      return !!res.content;
    } catch (error) {
      return false;
    }
  }

  /**
   * Тестирует Tool Calling функциональность
   */
  async testToolCalling(): Promise<void> {
    console.log('🎲 Тестирование Tool Calling...');
    
    const testMessages = [
      'Бросай за меня d20 на проверку Восприятия',
      'Мне нужно бросить 3d6 для характеристик',
      'Атакую мечом. Бросок на атаку?'
    ];

    for (const message of testMessages) {
      try {
        console.log(`\n📝 Сообщение: "${message}"`);
        const response = await this.processPlayerMessage({
          playerMessage: message,
          roomId: 'test',
          enableTools: true
        });
        
        console.log(`✅ Ответ: ${response.content}`);
        if (response.toolCalls) {
          console.log(`🔧 Tool calls: ${response.toolCalls.length}`);
          response.toolCalls.forEach((call, i) => {
            console.log(`   ${i + 1}. ${call.name}: ${call.result}`);
          });
        }
      } catch (error) {
        console.log(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
  }
}
