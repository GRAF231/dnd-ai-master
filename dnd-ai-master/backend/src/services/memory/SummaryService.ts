import { DatabaseService } from './DatabaseService.js';
import { EntityService } from './EntityService.js';
import {
  Message, Session, Entity,
  SummaryServiceConfig, CreateSummaryRequest, Summary,
  AutoScene, SceneAnalysis, CompressionStats,
  OperationResult
} from './types.js';

/**
 * SummaryService - автоматическое сжатие и суммаризация для системы памяти
 * 
 * Основные функции:
 * - Интеграция с Claude для создания сводок сообщений
 * - Автоматическое определение и создание сцен
 * - Иерархические сводки (сообщения → сцены → сессии)
 * - Фоновая обработка без блокировки игры
 * - Автоматические триггеры для сжатия
 */
export class SummaryService {
  private db: DatabaseService;
  private entityService: EntityService;
  private config: SummaryServiceConfig;
  private processingQueue: Map<string, Promise<any>> = new Map();

  // Конфигурация по умолчанию
  private static readonly DEFAULT_CONFIG: SummaryServiceConfig = {
    min_messages_for_summary: 10,      // Минимум 10 сообщений для сводки
    max_messages_per_batch: 50,        // Максимум 50 сообщений в батче
    summary_trigger_threshold: 100,    // Создавать сводку при 100+ сообщениях
    scene_detection_enabled: true,     // Автоматическое определение сцен
    background_processing: true        // Фоновая обработка
  };

  // Промпты для Claude
  private static readonly PROMPTS = {
    MESSAGE_SUMMARY: `Создай краткую сводку следующих сообщений из D&D сессии. 
Сохрани ключевые события, решения игроков, важные диалоги и результаты бросков.
Используй формат: "Краткое описание происходящего. Ключевые события: 1) событие 1, 2) событие 2..."

Сообщения:
{messages}`,

    SCENE_DETECTION: `Проанализируй следующие сообщения из D&D сессии и определи, представляют ли они отдельную сцену.
Сцена - это логически связанная последовательность событий в одном месте или ситуации.

Ответь в JSON формате:
{
  "scene_detected": true/false,
  "scene_title": "Название сцены",
  "scene_description": "Краткое описание",
  "key_events": ["событие 1", "событие 2"],
  "participants": ["имя1", "имя2"],
  "entities_mentioned": ["сущность1", "сущность2"],
  "confidence": 0.0-1.0
}

Сообщения:
{messages}`,

    SESSION_SUMMARY: `Создай итоговую сводку D&D сессии на основе сводок сцен и ключевых сообщений.
Включи: основные события, развитие персонажей, важные решения, полученные награды/опыт.

Сцены и сообщения:
{content}`
  };

  constructor(
    db: DatabaseService,
    entityService: EntityService,
    config?: Partial<SummaryServiceConfig>
  ) {
    this.db = db;
    this.entityService = entityService;
    this.config = { ...SummaryService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Создание сводки сообщений
   */
  async createSummary(request: CreateSummaryRequest): Promise<OperationResult<Summary>> {
    try {
      console.log(`📝 Создание сводки типа ${request.summary_type} для сессии ${request.session_id}`);

      // Получаем сообщения для суммаризации
      const messages = await this.getMessagesForSummary(request);
      
      if (messages.length < this.config.min_messages_for_summary) {
        return {
          success: false,
          error: `Недостаточно сообщений для создания сводки (минимум ${this.config.min_messages_for_summary})`
        };
      }

      // Создаем сводку в зависимости от типа
      let summaryContent: string;
      let title: string;

      switch (request.summary_type) {
        case 'messages':
          summaryContent = await this.summarizeMessages(messages);
          title = request.title || `Сводка сообщений (${messages.length} сообщений)`;
          break;
          
        case 'scene':
          const sceneResult = await this.createSceneSummary(messages);
          summaryContent = sceneResult.summary;
          title = request.title || sceneResult.title;
          break;
          
        case 'session':
          summaryContent = await this.createSessionSummary(request.session_id);
          title = request.title || 'Сводка сессии';
          break;
          
        default:
          return {
            success: false,
            error: `Неподдерживаемый тип сводки: ${request.summary_type}`
          };
      }

      // Сохраняем сводку в базу данных
      const summary: Summary = {
        id: this.generateId(),
        session_id: request.session_id,
        type: request.summary_type,
        title,
        content: summaryContent,
        message_ids: messages.map(m => m.id),
        token_count: this.estimateTokenCount(summaryContent),
        created_at: new Date(),
        metadata: {
          original_message_count: messages.length,
          context: request.context
        }
      };

      // TODO: Добавить сохранение в базу данных когда будет таблица summaries
      console.log(`✅ Сводка создана: ${title} (${summary.token_count} токенов)`);

      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('Ошибка создания сводки:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Автоматическое создание сводки при превышении порога
   */
  async checkAndCreateAutoSummary(sessionId: string): Promise<void> {
    if (!this.config.background_processing) return;

    // Проверяем, не выполняется ли уже обработка для этой сессии
    if (this.processingQueue.has(sessionId)) return;

    try {
      const messages = await this.db.getRecentMessages(sessionId, 1000);
      
      if (messages.length >= this.config.summary_trigger_threshold) {
        console.log(`🤖 Автоматическое создание сводки для сессии ${sessionId} (${messages.length} сообщений)`);
        
        // Запускаем фоновую обработку
        const processingPromise = this.processAutoSummary(sessionId, messages);
        this.processingQueue.set(sessionId, processingPromise);
        
        // Убираем из очереди после завершения
        processingPromise.finally(() => {
          this.processingQueue.delete(sessionId);
        });
      }
    } catch (error) {
      console.error('Ошибка автоматического создания сводки:', error);
    }
  }

  /**
   * Автоматическое определение сцен
   */
  async detectScenes(sessionId: string): Promise<AutoScene[]> {
    if (!this.config.scene_detection_enabled) return [];

    try {
      const messages = await this.db.getRecentMessages(sessionId, 1000);
      const scenes: AutoScene[] = [];
      
      // Группируем сообщения по потенциальным сценам
      const messageGroups = this.groupMessagesByPotentialScenes(messages);
      
      for (const group of messageGroups) {
        if (group.length < 5) continue; // Минимум 5 сообщений для сцены
        
        const analysis = await this.analyzeSceneMessages(group);
        
        if (analysis.scene_detected && analysis.confidence > 0.7) {
          const scene: AutoScene = {
            id: this.generateId(),
            session_id: sessionId,
            title: analysis.scene_title || 'Неизвестная сцена',
            description: analysis.scene_description || '',
            start_message_id: group[0].id,
            end_message_id: group[group.length - 1].id,
            participants: analysis.participants,
            key_events: analysis.key_events,
            entities_mentioned: analysis.entities_mentioned,
            created_at: new Date()
          };
          
          scenes.push(scene);
        }
      }
      
      console.log(`🎬 Обнаружено ${scenes.length} сцен в сессии ${sessionId}`);
      return scenes;
      
    } catch (error) {
      console.error('Ошибка определения сцен:', error);
      return [];
    }
  }

  /**
   * Получение статистики сжатия
   */
  async getCompressionStats(sessionId: string): Promise<CompressionStats> {
    const startTime = Date.now();
    
    try {
      const messages = await this.db.getRecentMessages(sessionId, 1000);
      const compressedMessages = messages.filter((m: Message) => m.compressed);
      
      // TODO: Получить реальные данные о сводках из базы данных
      const totalSummaries = 0; // Заглушка
      const originalTokenCount = messages.reduce((sum: number, m: Message) => sum + (m.token_count || 0), 0);
      const compressedTokenCount = compressedMessages.reduce((sum: number, m: Message) => sum + (m.token_count || 0), 0);
      
      const stats: CompressionStats = {
        total_summaries: totalSummaries,
        messages_summarized: compressedMessages.length,
        original_token_count: originalTokenCount,
        compressed_token_count: compressedTokenCount,
        compression_ratio: originalTokenCount > 0 ? compressedTokenCount / originalTokenCount : 0,
        scenes_detected: 0, // TODO: Получить из базы данных
        processing_time_ms: Date.now() - startTime
      };
      
      return stats;
      
    } catch (error) {
      console.error('Ошибка получения статистики сжатия:', error);
      return {
        total_summaries: 0,
        messages_summarized: 0,
        original_token_count: 0,
        compressed_token_count: 0,
        compression_ratio: 0,
        scenes_detected: 0,
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Получение сообщений для суммаризации
   */
  private async getMessagesForSummary(request: CreateSummaryRequest): Promise<Message[]> {
    if (request.message_ids && request.message_ids.length > 0) {
      // Получаем конкретные сообщения по ID
      const messages: Message[] = [];
      for (const id of request.message_ids) {
        const message = await this.db.getMessageById(id);
        if (message) messages.push(message);
      }
      return messages;
    } else {
      // Получаем все сообщения сессии
      return this.db.getRecentMessages(request.session_id, 1000);
    }
  }

  /**
   * Суммаризация сообщений через Claude (заглушка)
   */
  private async summarizeMessages(messages: Message[]): Promise<string> {
    // TODO: Интеграция с реальным Claude API
    // Пока возвращаем простую сводку
    
    const messageTexts = messages.map(m => 
      `[${m.role}${m.player_name ? ` - ${m.player_name}` : ''}]: ${m.content}`
    ).join('\n');
    
    // Заглушка для демонстрации
    const summary = this.createSimpleSummary(messages);
    
    console.log(`📝 Создана сводка ${messages.length} сообщений (${this.estimateTokenCount(summary)} токенов)`);
    return summary;
  }

  /**
   * Создание сводки сцены
   */
  private async createSceneSummary(messages: Message[]): Promise<{ summary: string; title: string }> {
    const analysis = await this.analyzeSceneMessages(messages);
    
    const title = analysis.scene_title || 'Игровая сцена';
    const summary = analysis.scene_description || this.createSimpleSummary(messages);
    
    return { summary, title };
  }

  /**
   * Создание сводки сессии
   */
  private async createSessionSummary(sessionId: string): Promise<string> {
    const session = await this.db.getSessionById(sessionId);
    const messages = await this.db.getRecentMessages(sessionId, 1000);
    
    if (!session) {
      throw new Error(`Сессия ${sessionId} не найдена`);
    }
    
    // TODO: Получить сводки сцен и объединить их
    // Пока создаем простую сводку всех сообщений
    return this.createSimpleSummary(messages);
  }

  /**
   * Анализ сообщений сцены (заглушка для Claude API)
   */
  private async analyzeSceneMessages(messages: Message[]): Promise<SceneAnalysis> {
    // TODO: Интеграция с реальным Claude API
    // Пока возвращаем простой анализ
    
    const participants = Array.from(new Set(
      messages.map(m => m.player_name).filter(Boolean)
    )) as string[];
    
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    // Простое определение ключевых событий по ключевым словам
    const keyEvents: string[] = [];
    if (content.includes('атак') || content.includes('бой')) keyEvents.push('Боевое столкновение');
    if (content.includes('диалог') || content.includes('говор')) keyEvents.push('Диалог с NPC');
    if (content.includes('исследов') || content.includes('поиск')) keyEvents.push('Исследование');
    if (content.includes('сокровищ') || content.includes('наград')) keyEvents.push('Получение награды');
    
    // Простое определение упомянутых сущностей
    const entities = await this.entityService.extractEntitiesFromText(
      messages[0]?.session_id || '', 
      content
    );
    
    const analysis: SceneAnalysis = {
      scene_detected: messages.length >= 5 && keyEvents.length > 0,
      scene_title: keyEvents.length > 0 ? keyEvents[0] : undefined,
      scene_description: `Сцена с участием ${participants.join(', ')}`,
      key_events: keyEvents,
      participants,
      entities_mentioned: entities.map(e => e.id),
      confidence: Math.min(0.9, (keyEvents.length * 0.3) + (participants.length * 0.2) + 0.3)
    };
    
    return analysis;
  }

  /**
   * Группировка сообщений по потенциальным сценам
   */
  private groupMessagesByPotentialScenes(messages: Message[]): Message[][] {
    const groups: Message[][] = [];
    let currentGroup: Message[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      currentGroup.push(message);
      
      // Простая логика разделения сцен:
      // - Большой временной промежуток между сообщениями (>30 минут)
      // - Смена участников
      // - Ключевые фразы перехода
      
      const nextMessage = messages[i + 1];
      if (nextMessage) {
        const timeDiff = nextMessage.timestamp.getTime() - message.timestamp.getTime();
        const minutesDiff = timeDiff / (1000 * 60);
        
        const isSceneBreak = 
          minutesDiff > 30 || // Большой перерыв
          message.content.toLowerCase().includes('переход') ||
          message.content.toLowerCase().includes('следующая сцена') ||
          currentGroup.length >= 20; // Максимум сообщений в сцене
        
        if (isSceneBreak) {
          groups.push([...currentGroup]);
          currentGroup = [];
        }
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Фоновая обработка автоматической сводки
   */
  private async processAutoSummary(sessionId: string, messages: Message[]): Promise<void> {
    try {
      // Создаем сводку старых сообщений (исключаем последние 20)
      const messagesToSummarize = messages.slice(0, -20);
      
      if (messagesToSummarize.length >= this.config.min_messages_for_summary) {
        await this.createSummary({
          session_id: sessionId,
          message_ids: messagesToSummarize.map(m => m.id),
          summary_type: 'messages',
          title: `Автоматическая сводка (${messagesToSummarize.length} сообщений)`
        });
        
        // TODO: Пометить сообщения как сжатые в базе данных
        console.log(`🤖 Автоматическая сводка создана для ${messagesToSummarize.length} сообщений`);
      }
      
      // Определяем сцены
      if (this.config.scene_detection_enabled) {
        await this.detectScenes(sessionId);
      }
      
    } catch (error) {
      console.error('Ошибка фоновой обработки сводки:', error);
    }
  }

  /**
   * Создание простой сводки (без Claude API)
   */
  private createSimpleSummary(messages: Message[]): string {
    const participants = Array.from(new Set(
      messages.map(m => m.player_name).filter(Boolean)
    ));
    
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    const summary = [
      `Сводка ${messages.length} сообщений`,
      `Участники: ${participants.join(', ')}`,
      `Сообщений игроков: ${userMessages.length}`,
      `Ответов мастера: ${assistantMessages.length}`,
      `Период: ${messages[0]?.timestamp.toLocaleString('ru-RU')} - ${messages[messages.length - 1]?.timestamp.toLocaleString('ru-RU')}`
    ];
    
    // Добавляем ключевые события на основе ключевых слов
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    const events: string[] = [];
    
    if (content.includes('атак') || content.includes('бой')) events.push('Боевые действия');
    if (content.includes('диалог') || content.includes('разговор')) events.push('Диалоги');
    if (content.includes('исследов') || content.includes('поиск')) events.push('Исследование');
    if (content.includes('магия') || content.includes('заклинание')) events.push('Использование магии');
    if (content.includes('сокровищ') || content.includes('наград')) events.push('Получение наград');
    
    if (events.length > 0) {
      summary.push(`Ключевые события: ${events.join(', ')}`);
    }
    
    return summary.join('\n');
  }

  /**
   * Оценка количества токенов
   */
  private estimateTokenCount(text: string): number {
    // Простая оценка: ~4 символа на токен для русского текста
    return Math.ceil(text.length / 4);
  }

  /**
   * Генерация уникального ID
   */
  private generateId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Получение статуса обработки
   */
  getProcessingStatus(): {
    active_sessions: string[];
    queue_size: number;
  } {
    return {
      active_sessions: Array.from(this.processingQueue.keys()),
      queue_size: this.processingQueue.size
    };
  }

  /**
   * Очистка очереди обработки
   */
  clearProcessingQueue(): void {
    this.processingQueue.clear();
    console.log('🗑️ Очередь обработки SummaryService очищена');
  }
}
