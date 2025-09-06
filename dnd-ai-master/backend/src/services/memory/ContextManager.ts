import { DatabaseService } from './DatabaseService.js';
import { EntityService } from './EntityService.js';
import {
  Message, Entity, GameContext, ContextOptions,
  ContextManagerConfig, PrioritizedMessage, PrioritizedEntity,
  OptimizedContext, CachedContext, EntityType
} from './types.js';

/**
 * ContextManager - интеллектуальное управление контекстом для ИИ-мастера
 * 
 * Основные функции:
 * - Приоритизация сообщений и сущностей по релевантности
 * - Управление токен-бюджетом (ограничение до 150k токенов)
 * - Кэширование построенного контекста для производительности
 * - Инкрементальные обновления при новых сообщениях
 */
export class ContextManager {
  private db: DatabaseService;
  private entityService: EntityService;
  private config: ContextManagerConfig;
  private contextCache: Map<string, CachedContext> = new Map();

  // Конфигурация по умолчанию
  private static readonly DEFAULT_CONFIG: ContextManagerConfig = {
    max_tokens: 150000,        // 150k токенов (оставляем место для ответа Claude)
    max_messages: 100,         // Максимум 100 сообщений
    priority_threshold: 0.3,   // Минимальный приоритет для включения
    cache_ttl_ms: 5 * 60 * 1000 // 5 минут кэш
  };

  // Веса для расчета приоритета сообщений
  private static readonly MESSAGE_WEIGHTS = {
    time_decay_factor: 0.1,    // Фактор затухания по времени
    user_message_boost: 1.2,   // Бонус для сообщений пользователей
    entity_mention_boost: 1.5, // Бонус за упоминание сущностей
    keyword_boost: 1.3,        // Бонус за ключевые слова
    recent_boost: 2.0          // Бонус для недавних сообщений (последние 10)
  };

  // Веса для расчета приоритета сущностей
  private static readonly ENTITY_WEIGHTS = {
    frequency_factor: 0.4,     // Вес частоты упоминаний
    recency_factor: 0.3,       // Вес недавности
    connection_factor: 0.3     // Вес связей с другими сущностями
  };

  // Ключевые слова D&D для повышения приоритета
  private static readonly DND_KEYWORDS = [
    'атака', 'заклинание', 'бросок', 'урон', 'инициатива', 'проверка',
    'спасбросок', 'критический', 'промах', 'попадание', 'лечение',
    'магия', 'заклинатель', 'воин', 'плут', 'клерик', 'волшебник',
    'дракон', 'подземелье', 'сокровище', 'квест', 'приключение',
    'бой', 'сражение', 'монстр', 'NPC', 'персонаж', 'уровень'
  ];

  constructor(
    db: DatabaseService,
    entityService: EntityService,
    config?: Partial<ContextManagerConfig>
  ) {
    this.db = db;
    this.entityService = entityService;
    this.config = { ...ContextManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * Построение оптимизированного контекста для комнаты
   */
  async buildOptimizedContext(
    roomId: string,
    options?: ContextOptions
  ): Promise<OptimizedContext> {
    const startTime = Date.now();
    
    // Проверяем кэш
    const cacheKey = this.generateCacheKey(roomId, options);
    const cached = this.getCachedContext(cacheKey);
    
    if (cached) {
      console.log(`🚀 Контекст загружен из кэша для комнаты ${roomId}`);
      return cached.context;
    }

    // Получаем активную сессию
    const activeSession = await this.db.getActiveSession(roomId);
    if (!activeSession) {
      throw new Error(`Нет активной сессии для комнаты ${roomId}`);
    }

    // Получаем все сообщения сессии
    const allMessages = await this.db.getRecentMessages(activeSession.id, 1000); // Большой лимит для получения всех
    
    // Получаем все сущности комнаты
    const allEntities = await this.db.getEntitiesByRoom(roomId);

    // Приоритизируем сообщения
    const prioritizedMessages = await this.prioritizeMessages(allMessages, allEntities);
    
    // Приоритизируем сущности
    const prioritizedEntities = await this.prioritizeEntities(allEntities, allMessages);

    // Оптимизируем контекст по токенам
    const optimizedResult = await this.optimizeByTokens(
      prioritizedMessages,
      prioritizedEntities,
      options
    );

    // Создаем краткую сводку контекста
    const contextSummary = this.generateContextSummary(
      optimizedResult.messages,
      optimizedResult.entities
    );

    // Получаем релевантные факты
    const relevantFacts = await this.getRelevantFacts(optimizedResult.entities);

    // Создаем оптимизированный контекст
    const optimizedContext: OptimizedContext = {
      session_id: activeSession.id,
      room_id: roomId,
      recent_messages: optimizedResult.messages.map(pm => ({
        id: pm.id,
        session_id: pm.session_id,
        role: pm.role,
        content: pm.content,
        player_name: pm.player_name,
        timestamp: pm.timestamp,
        token_count: pm.token_count,
        compressed: pm.compressed
      })),
      active_entities: optimizedResult.entities.map(pe => ({
        id: pe.id,
        room_id: pe.room_id,
        type: pe.type,
        name: pe.name,
        description: pe.description,
        data: pe.data,
        created_at: pe.created_at,
        updated_at: pe.updated_at
      })),
      relevant_facts: relevantFacts,
      session_summary: activeSession.summary,
      total_tokens: optimizedResult.totalTokens,
      prioritized_messages: optimizedResult.messages,
      prioritized_entities: optimizedResult.entities,
      context_summary: contextSummary,
      optimization_stats: {
        original_token_count: this.estimateTokenCount(allMessages, allEntities),
        optimized_token_count: optimizedResult.totalTokens,
        compression_ratio: optimizedResult.totalTokens / this.estimateTokenCount(allMessages, allEntities),
        messages_included: optimizedResult.messages.length,
        messages_excluded: allMessages.length - optimizedResult.messages.length,
        entities_included: optimizedResult.entities.length
      }
    };

    // Кэшируем результат
    this.cacheContext(cacheKey, optimizedContext);

    const processingTime = Date.now() - startTime;
    console.log(`🧠 Контекст оптимизирован за ${processingTime}ms: ${optimizedResult.totalTokens} токенов, ${optimizedResult.messages.length} сообщений, ${optimizedResult.entities.length} сущностей`);

    return optimizedContext;
  }

  /**
   * Приоритизация сообщений по релевантности
   */
  private async prioritizeMessages(
    messages: Message[],
    entities: Entity[]
  ): Promise<PrioritizedMessage[]> {
    const now = new Date();
    const entityNames = entities.map(e => e.name.toLowerCase());
    
    return messages.map((message, index) => {
      const timeDiff = now.getTime() - message.timestamp.getTime();
      const hoursAgo = timeDiff / (1000 * 60 * 60);
      
      // Временной вес (новые сообщения важнее)
      const timeWeight = Math.exp(-hoursAgo * ContextManager.MESSAGE_WEIGHTS.time_decay_factor);
      
      // Вес участника (сообщения пользователей важнее системных)
      const participantWeight = message.role === 'user' ? 
        ContextManager.MESSAGE_WEIGHTS.user_message_boost : 1.0;
      
      // Вес ключевых слов D&D
      const content = message.content.toLowerCase();
      const keywordMatches = ContextManager.DND_KEYWORDS.filter(keyword => 
        content.includes(keyword)
      ).length;
      const keywordWeight = 1 + (keywordMatches * 0.1);
      
      // Вес упоминания сущностей
      const entityMentions = entityNames.filter(name => 
        content.includes(name)
      ).length;
      const entityWeight = 1 + (entityMentions * 0.2);
      
      // Бонус для недавних сообщений (последние 10)
      const recentBoost = index >= messages.length - 10 ? 
        ContextManager.MESSAGE_WEIGHTS.recent_boost : 1.0;
      
      // Итоговый приоритет
      const priorityScore = Math.min(1.0, 
        (timeWeight * participantWeight * keywordWeight * entityWeight * recentBoost) / 5
      );

      return {
        ...message,
        priority_score: priorityScore,
        relevance_factors: {
          time_weight: timeWeight,
          participant_weight: participantWeight,
          keyword_weight: keywordWeight,
          entity_weight: entityWeight
        }
      };
    }).sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * Приоритизация сущностей по релевантности
   */
  private async prioritizeEntities(
    entities: Entity[],
    messages: Message[]
  ): Promise<PrioritizedEntity[]> {
    const now = new Date();
    
    const prioritizedEntities: PrioritizedEntity[] = [];
    
    for (const entity of entities) {
      // Подсчитываем упоминания в сообщениях
      const mentions = messages.filter(msg => 
        msg.content.toLowerCase().includes(entity.name.toLowerCase())
      );
      
      const mentionCount = mentions.length;
      
      // Находим последнее упоминание
      const lastMention = mentions.length > 0 ? 
        new Date(Math.max(...mentions.map(m => m.timestamp.getTime()))) :
        entity.created_at;
      
      // Вес частоты упоминаний
      const maxMentions = Math.max(...entities.map(e => 
        messages.filter(msg => msg.content.toLowerCase().includes(e.name.toLowerCase())).length
      ));
      const frequencyWeight = maxMentions > 0 ? mentionCount / maxMentions : 0;
      
      // Вес недавности
      const timeDiff = now.getTime() - lastMention.getTime();
      const hoursAgo = timeDiff / (1000 * 60 * 60);
      const recencyWeight = Math.exp(-hoursAgo * 0.05); // Медленнее затухание для сущностей
      
      // Вес связей (пока упрощенно - по количеству фактов)
      const facts = await this.entityService.getEntityFacts(entity.id);
      const connectionWeight = Math.min(1.0, facts.length / 10);
      
      // Итоговый приоритет
      const priorityScore = 
        (frequencyWeight * ContextManager.ENTITY_WEIGHTS.frequency_factor) +
        (recencyWeight * ContextManager.ENTITY_WEIGHTS.recency_factor) +
        (connectionWeight * ContextManager.ENTITY_WEIGHTS.connection_factor);

      prioritizedEntities.push({
        ...entity,
        priority_score: priorityScore,
        mention_count: mentionCount,
        last_mentioned: lastMention,
        relevance_factors: {
          frequency_weight: frequencyWeight,
          recency_weight: recencyWeight,
          connection_weight: connectionWeight
        }
      });
    }
    
    return prioritizedEntities.sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * Оптимизация контекста по токенам
   */
  private async optimizeByTokens(
    prioritizedMessages: PrioritizedMessage[],
    prioritizedEntities: PrioritizedEntity[],
    options?: ContextOptions
  ): Promise<{
    messages: PrioritizedMessage[];
    entities: PrioritizedEntity[];
    totalTokens: number;
  }> {
    const maxTokens = options?.max_tokens || this.config.max_tokens;
    const maxMessages = options?.max_messages || this.config.max_messages;
    
    let totalTokens = 0;
    const selectedMessages: PrioritizedMessage[] = [];
    const selectedEntities: PrioritizedEntity[] = [];
    
    // Сначала добавляем сообщения с высоким приоритетом
    for (const message of prioritizedMessages) {
      if (selectedMessages.length >= maxMessages) break;
      if (message.priority_score < this.config.priority_threshold) break;
      
      const messageTokens = this.estimateMessageTokens(message);
      if (totalTokens + messageTokens > maxTokens * 0.8) break; // 80% для сообщений
      
      selectedMessages.push(message);
      totalTokens += messageTokens;
    }
    
    // Затем добавляем сущности
    const remainingTokens = maxTokens - totalTokens;
    for (const entity of prioritizedEntities) {
      if (entity.priority_score < this.config.priority_threshold) break;
      
      const entityTokens = this.estimateEntityTokens(entity);
      if (totalTokens + entityTokens > maxTokens) break;
      
      selectedEntities.push(entity);
      totalTokens += entityTokens;
    }
    
    return {
      messages: selectedMessages,
      entities: selectedEntities,
      totalTokens
    };
  }

  /**
   * Получение релевантных фактов для сущностей
   */
  private async getRelevantFacts(entities: PrioritizedEntity[]) {
    const allFacts = [];
    
    for (const entity of entities.slice(0, 10)) { // Берем только топ-10 сущностей
      const facts = await this.entityService.getEntityFacts(entity.id);
      allFacts.push(...facts);
    }
    
    return allFacts;
  }

  /**
   * Генерация краткой сводки контекста
   */
  private generateContextSummary(
    messages: PrioritizedMessage[],
    entities: PrioritizedEntity[]
  ): string {
    const recentMessages = messages.slice(0, 5);
    const topEntities = entities.slice(0, 5);
    
    const summary = [
      `Активных сообщений: ${messages.length}`,
      `Ключевые участники: ${recentMessages.map(m => m.player_name).filter(Boolean).slice(0, 3).join(', ')}`,
      `Основные сущности: ${topEntities.map(e => e.name).join(', ')}`,
      `Последняя активность: ${recentMessages[0]?.timestamp.toLocaleString('ru-RU') || 'неизвестно'}`
    ];
    
    return summary.join(' | ');
  }

  /**
   * Оценка количества токенов в сообщении
   */
  private estimateMessageTokens(message: Message): number {
    if (message.token_count) return message.token_count;
    
    // Простая оценка: ~4 символа на токен для русского текста
    return Math.ceil(message.content.length / 4);
  }

  /**
   * Оценка количества токенов в сущности
   */
  private estimateEntityTokens(entity: Entity): number {
    const nameTokens = Math.ceil(entity.name.length / 4);
    const descTokens = entity.description ? Math.ceil(entity.description.length / 4) : 0;
    const dataTokens = Math.ceil(JSON.stringify(entity.data).length / 4);
    
    return nameTokens + descTokens + dataTokens;
  }

  /**
   * Оценка общего количества токенов
   */
  private estimateTokenCount(messages: Message[], entities: Entity[]): number {
    const messageTokens = messages.reduce((sum, msg) => sum + this.estimateMessageTokens(msg), 0);
    const entityTokens = entities.reduce((sum, entity) => sum + this.estimateEntityTokens(entity), 0);
    
    return messageTokens + entityTokens;
  }

  /**
   * Генерация ключа кэша
   */
  private generateCacheKey(roomId: string, options?: ContextOptions): string {
    const optionsHash = options ? JSON.stringify(options) : '';
    return `context:${roomId}:${optionsHash}`;
  }

  /**
   * Получение контекста из кэша
   */
  private getCachedContext(cacheKey: string): CachedContext | null {
    const cached = this.contextCache.get(cacheKey);
    
    if (!cached) return null;
    
    if (cached.expires_at < new Date()) {
      this.contextCache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  /**
   * Кэширование контекста
   */
  private cacheContext(cacheKey: string, context: OptimizedContext): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cache_ttl_ms);
    
    const cachedContext: CachedContext = {
      context,
      created_at: now,
      expires_at: expiresAt,
      cache_key: cacheKey
    };
    
    this.contextCache.set(cacheKey, cachedContext);
    
    // Очистка устаревших записей кэша
    this.cleanupCache();
  }

  /**
   * Очистка устаревшего кэша
   */
  private cleanupCache(): void {
    const now = new Date();
    
    for (const [key, cached] of this.contextCache.entries()) {
      if (cached.expires_at < now) {
        this.contextCache.delete(key);
      }
    }
  }

  /**
   * Инвалидация кэша для комнаты (при новых сообщениях)
   */
  invalidateRoomCache(roomId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.contextCache.entries()) {
      if (key.includes(`context:${roomId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.contextCache.delete(key));
    
    console.log(`🗑️ Инвалидирован кэш контекста для комнаты ${roomId}`);
  }

  /**
   * Получение статистики кэша
   */
  getCacheStats(): {
    total_entries: number;
    active_entries: number;
    expired_entries: number;
    memory_usage_mb: number;
  } {
    const now = new Date();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const [, cached] of this.contextCache.entries()) {
      if (cached.expires_at >= now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    // Примерная оценка использования памяти
    const memoryUsageMb = (this.contextCache.size * 50) / 1024; // ~50KB на запись
    
    return {
      total_entries: this.contextCache.size,
      active_entries: activeEntries,
      expired_entries: expiredEntries,
      memory_usage_mb: memoryUsageMb
    };
  }

  /**
   * Очистка всего кэша
   */
  clearCache(): void {
    this.contextCache.clear();
    console.log('🗑️ Кэш ContextManager очищен');
  }
}
