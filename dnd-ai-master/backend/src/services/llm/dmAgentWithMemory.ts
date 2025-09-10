import { ElizaService, ElizaChatRequest } from './eliza.js';
import { toolsService, ToolCallRequest } from '../tools/index.js';
import { MemoryManager, GameContext } from '../memory/index.js';

export interface DMResponse {
  content: string;
  timestamp: string;
  type: 'narration' | 'npc_dialogue' | 'combat' | 'description' | 'system';
  toolCalls?: ToolCallResult[];
  context?: GameContext;
  sessionId?: string;
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
  enableTools?: boolean;
  useMemory?: boolean; // Новый параметр для включения/отключения памяти
}

/**
 * DM Agent с интегрированной системой памяти
 * Автоматически сохраняет все сообщения и строит контекст из истории
 */
export class DMAgentWithMemoryService {
  private eliza: ElizaService;
  private memoryManager: MemoryManager;
  private systemPrompt: string;

  constructor(eliza: ElizaService, memoryManager: MemoryManager) {
    this.eliza = eliza;
    this.memoryManager = memoryManager;
    this.systemPrompt = this.createSystemPrompt();
  }

  private createSystemPrompt(): string {
    return `Ты опытный мастер D&D, ведущий увлекательную кампанию. Твоя роль - создавать живой мир, описывать сцены (3-6 предложений), вести диалоги NPC и реагировать на действия игроков. 

Используй инструменты для бросков кубиков когда нужно:
- Для проверок навыков игроков
- Для атак и урона в бою
- Для случайных событий

Пиши от второго лица ("Вы видите..."). Не раскрывай закулисную информацию. Поддерживай напряжение и давай игрокам инициативу.

ВАЖНО: У тебя есть доступ к истории всей кампании через контекст. Используй эту информацию для создания связной истории и помни о предыдущих событиях, персонажах и решениях игроков.`;
  }

  /**
   * Построение сообщений с контекстом из памяти
   */
  private async buildMessagesWithMemory(request: DMRequest): Promise<{
    messages: any[];
    context?: GameContext;
    sessionId?: string;
  }> {
    const messages: any[] = [
      { role: 'system', content: this.systemPrompt }
    ];

    let context: GameContext | undefined;
    let sessionId: string | undefined;

    if (request.useMemory !== false) {
      try {
        // Получаем контекст из памяти
        context = await this.memoryManager.buildContext(request.roomId, {
          max_messages: 20, // Последние 20 сообщений
          max_tokens: 100000, // Ограничиваем контекст
          include_entities: true,
          include_facts: true
        });

        sessionId = context.session_id;

        // Добавляем контекст в системное сообщение
        let contextInfo = '\n=== КОНТЕКСТ КАМПАНИИ ===\n';
        contextInfo += `Комната: ${request.roomId}\n`;
        contextInfo += `Сессия: ${context.session_id}\n`;

        // Добавляем сводку сессии если есть
        if (context.session_summary) {
          contextInfo += `\nСводка сессии:\n${context.session_summary}\n`;
        }

        // Добавляем информацию о сущностях
        if (context.active_entities.length > 0) {
          contextInfo += '\nАктивные сущности:\n';
          context.active_entities.forEach(entity => {
            contextInfo += `- ${entity.type}: ${entity.name}`;
            if (entity.description) {
              contextInfo += ` - ${entity.description}`;
            }
            contextInfo += '\n';
          });
        }

        // Добавляем релевантные факты
        if (context.relevant_facts.length > 0) {
          contextInfo += '\nВажные факты:\n';
          context.relevant_facts.forEach(fact => {
            contextInfo += `- ${fact.key}: ${fact.value}\n`;
          });
        }

        // Добавляем историю сообщений
        if (context.recent_messages.length > 0) {
          contextInfo += '\nИстория сообщений:\n';
          context.recent_messages.forEach(msg => {
            const role = msg.role === 'user' ? (msg.player_name || 'Игрок') : 'Мастер';
            contextInfo += `${role}: ${msg.content}\n`;
          });
        }

        contextInfo += `\n⚠️ ВАЖНО: При использовании character_sheet tool всегда используй room_id: "${request.roomId}"\n`;
        contextInfo += `Примерное количество токенов в контексте: ${context.total_tokens}\n`;
        contextInfo += '=== КОНЕЦ КОНТЕКСТА ===\n';

        messages.push({ role: 'system', content: contextInfo });

      } catch (error) {
        console.warn('Не удалось получить контекст из памяти:', error);
        // Продолжаем без контекста памяти
        let fallbackContext = '\n=== КОНТЕКСТ СЕССИИ ===\n';
        fallbackContext += `Комната: ${request.roomId}\n`;
        fallbackContext += `⚠️ ВАЖНО: При использовании character_sheet tool всегда используй room_id: "${request.roomId}"\n`;
        fallbackContext += '=== КОНЕЦ КОНТЕКСТА ===\n';
        
        messages.push({ role: 'system', content: fallbackContext });
      }
    } else {
      // Базовый контекст без памяти (как в оригинальном DMAgent)
      let contextInfo = '\n=== КОНТЕКСТ СЕССИИ ===\n';
      contextInfo += `Комната: ${request.roomId}\n`;
      contextInfo += `⚠️ ВАЖНО: При использовании character_sheet tool всегда используй room_id: "${request.roomId}"\n`;
      contextInfo += '=== КОНЕЦ КОНТЕКСТА ===\n';
      
      messages.push({ role: 'system', content: contextInfo });
    }

    // Добавляем текущее сообщение игрока
    const playerPrefix = request.playerName ? `${request.playerName}: ` : '';
    messages.push({ role: 'user', content: `${playerPrefix}${request.playerMessage}` });

    return { messages, context, sessionId };
  }

  /**
   * Обработка сообщения игрока с сохранением в память
   */
  async processPlayerMessage(request: DMRequest): Promise<DMResponse> {
    try {
      // Сохраняем сообщение игрока в память (если включена)
      let memoryResult: any = null;
      if (request.useMemory !== false) {
        try {
          memoryResult = await this.memoryManager.processUserMessage(
            request.roomId,
            request.playerMessage,
            request.playerName
          );
          console.log(`💾 Сообщение игрока сохранено в память: ${request.playerName || 'Анонимный'}`);
        } catch (error) {
          console.warn('Не удалось сохранить сообщение игрока в память:', error);
        }
      }

      // Строим сообщения с контекстом
      const { messages, context, sessionId } = await this.buildMessagesWithMemory(request);
      const tools = request.enableTools ? toolsService.getAllTools() : undefined;
      
      const elizaRequest: ElizaChatRequest = {
        model: process.env.ELIZA_MODEL || 'claude-3-5-sonnet-20241022',
        messages,
        max_tokens: 1000,
        temperature: 0.8,
        tools,
        tool_choice: tools ? 'auto' : undefined,
      };

      const response = await this.eliza.createChatCompletion(elizaRequest);
      const message = response.choices[0]?.message;
      
      if (!message) {
        throw new Error('No response message from Eliza');
      }

      // Обработка tool calls (аналогично оригинальному DMAgent)
      let toolCalls: ToolCallResult[] = [];
      let finalContent = message.content || '';

      if (message.tool_calls && message.tool_calls.length > 0) {
        // Выполняем tool calls
        for (const toolCall of message.tool_calls) {
          try {
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

              // Добавляем assistant message с tool_use
              if (toolCalls.length === 1) {
                const anthropicContent = [];
                if (message.content) {
                  anthropicContent.push({
                    type: 'text',
                    text: message.content
                  });
                }
                
                for (const tc of message.tool_calls) {
                  if (tc.type === 'function' && 'function' in tc) {
                    anthropicContent.push({
                      type: 'tool_use',
                      id: tc.id,
                      name: tc.function.name,
                      input: JSON.parse(tc.function.arguments)
                    });
                  }
                }
                
                messages.push({
                  role: 'assistant',
                  content: anthropicContent
                });
              }

              // Добавляем tool result
              if (!messages.find(m => m.role === 'user' && Array.isArray(m.content))) {
                messages.push({
                  role: 'user',
                  content: []
                });
              }
              
              const lastUserMessage = messages[messages.length - 1];
              if (Array.isArray(lastUserMessage.content)) {
                lastUserMessage.content.push({
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: toolResult.content
                });
              }
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
        const finalRequest: ElizaChatRequest = {
          model: process.env.ELIZA_MODEL || 'claude-3-5-sonnet-20241022',
          messages,
          max_tokens: 1000,
          temperature: 0.8,
          tools,
        };

        const finalResponse = await this.eliza.createChatCompletion(finalRequest);
        finalContent = finalResponse.choices[0]?.message?.content || finalContent;
      }

      // Сохраняем ответ ИИ-мастера в память
      if (request.useMemory !== false && sessionId) {
        try {
          await this.memoryManager.processAssistantResponse(
            sessionId,
            finalContent,
            this.estimateTokens(finalContent)
          );
          console.log(`💾 Ответ ИИ-мастера сохранен в память`);
        } catch (error) {
          console.warn('Не удалось сохранить ответ ИИ в память:', error);
        }
      }

      return {
        content: finalContent,
        timestamp: new Date().toISOString(),
        type: this.determineResponseType(finalContent),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        context,
        sessionId
      };

    } catch (error) {
      console.error('DM Agent With Memory Error:', error);
      throw new Error('Failed to process DM response with memory');
    }
  }

  /**
   * Стриминг с поддержкой памяти
   */
  async processPlayerMessageStream(request: DMRequest): Promise<AsyncIterable<string>> {
    try {
      // Сохраняем сообщение игрока в память
      if (request.useMemory !== false) {
        try {
          await this.memoryManager.processUserMessage(
            request.roomId,
            request.playerMessage,
            request.playerName
          );
        } catch (error) {
          console.warn('Не удалось сохранить сообщение в память при стриминге:', error);
        }
      }

      const { messages } = await this.buildMessagesWithMemory(request);
      const tools = request.enableTools ? toolsService.getAllTools() : undefined;
      
      const elizaRequest: ElizaChatRequest = {
        model: process.env.ELIZA_MODEL || 'claude-3-5-sonnet-20241022',
        messages,
        max_tokens: 1000,
        temperature: 0.8,
        stream: true,
        tools,
        tool_choice: tools ? 'auto' : undefined,
      };

      const stream = await this.eliza.createStreamingChatCompletion(elizaRequest);
      return this.processStream(stream, request);
    } catch (error) {
      console.error('DM Agent Memory Streaming Error:', error);
      throw new Error('Failed to process DM streaming response with memory');
    }
  }

  private async* processStream(stream: any, request: DMRequest): AsyncIterable<string> {
    let fullContent = '';
    try {
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          fullContent += content;
          yield content;
        }
      }

      // После завершения стриминга сохраняем полный ответ в память
      if (request.useMemory !== false && fullContent) {
        try {
          const session = await this.memoryManager.getActiveSession(request.roomId);
          if (session) {
            await this.memoryManager.processAssistantResponse(
              session.id,
              fullContent,
              this.estimateTokens(fullContent)
            );
            console.log(`💾 Стриминговый ответ ИИ сохранен в память`);
          }
        } catch (error) {
          console.warn('Не удалось сохранить стриминговый ответ в память:', error);
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

  private estimateTokens(content: string): number {
    // Примерная оценка: ~4 символа на токен для русского языка
    return Math.ceil(content.length / 4);
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await this.processPlayerMessage({ 
        playerMessage: 'Привет!', 
        roomId: 'test',
        useMemory: false // Отключаем память для теста соединения
      });
      return !!res.content;
    } catch (error) {
      return false;
    }
  }

  /**
   * Тест с памятью
   */
  async testWithMemory(): Promise<void> {
    console.log('🧠 Тестирование DMAgent с системой памяти...');
    
    const testRoomId = 'memory_test_room';
    const testMessages = [
      { message: 'Привет! Меня зовут Алиса, я эльф-следопыт.', player: 'Алиса' },
      { message: 'Я осматриваю окрестности. Что я вижу?', player: 'Алиса' },
      { message: 'Бросай за меня проверку Восприятия d20+3', player: 'Алиса' }
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const { message, player } = testMessages[i];
      try {
        console.log(`\n📝 Сообщение ${i + 1}: "${message}"`);
        
        const response = await this.processPlayerMessage({
          playerMessage: message,
          playerName: player,
          roomId: testRoomId,
          enableTools: true,
          useMemory: true
        });
        
        console.log(`✅ Ответ: ${response.content.substring(0, 100)}...`);
        console.log(`🧠 Контекст: ${response.context?.recent_messages.length || 0} сообщений, ${response.context?.active_entities.length || 0} сущностей`);
        
        if (response.toolCalls) {
          console.log(`🔧 Tool calls: ${response.toolCalls.length}`);
        }
        
        // Небольшая пауза между сообщениями
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }

    // Получаем статистику памяти
    try {
      const stats = await this.memoryManager.getStats();
      console.log('\n📊 Статистика памяти после теста:');
      console.log(`   💬 Сообщений: ${stats.total_messages}`);
      console.log(`   🎮 Сессий: ${stats.total_sessions}`);
      console.log(`   🏷️ Сущностей: ${stats.total_entities}`);
    } catch (error) {
      console.warn('Не удалось получить статистику памяти:', error);
    }
  }
}
